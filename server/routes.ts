import type { Express } from "express";
import type { Server } from "http";
import type { IndicatorSnapshot, PositionInfo } from "@shared/schema";

// ─── Real Market Data via yfinance Python server ────────────────────────

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// State
let candles: CandleData[] = [];
let position: {
  isOpen: boolean;
  entryPrice: number;
  shares: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
} = { isOpen: false, entryPrice: 0, shares: 0, stopLoss: 0, takeProfit: 0, entryTime: 0 };

let tradeHistory: Array<{
  id: number;
  entryTime: number;
  entryPrice: number;
  exitTime: number | null;
  exitPrice: number | null;
  shares: number;
  stopLoss: number;
  takeProfit: number;
  status: string;
  pnl: number | null;
}> = [];
let tradeIdCounter = 1;
let orbHigh = 0;
let buySignalActive = false;
let sellSignalActive = false;
let sellSignalReason = "";
let dataSourceInfo = { source: "loading", error: "", lastUpdate: 0 };

// ─── Fetch data from yfinance Python server ─────────────────────────────

const YFINANCE_URL = "http://127.0.0.1:8001";

async function fetchCandlesFromYfinance() {
  try {
    const res = await fetch(`${YFINANCE_URL}/candles`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CandleData[] = await res.json();
    if (data && data.length > 0) {
      candles = data;
      // ORB high = first candle of the latest trading day
      const latestDay = new Date(data[data.length - 1].time * 1000).toDateString();
      const todayCandles = data.filter(
        (c) => new Date(c.time * 1000).toDateString() === latestDay
      );
      if (todayCandles.length > 0) {
        orbHigh = todayCandles[0].high;
      }
      dataSourceInfo = { source: "yfinance", error: "", lastUpdate: Math.floor(Date.now() / 1000) };

      // Check TP/SL exit on new data
      if (position.isOpen) {
        const currentPrice = candles[candles.length - 1].close;
        checkPositionExit(currentPrice);
      }
    }
  } catch (err: any) {
    dataSourceInfo = { source: "error", error: err.message, lastUpdate: dataSourceInfo.lastUpdate };
    console.error("[yfinance] Fetch error:", err.message);
  }
}

// Initial fetch + poll every 15 seconds
fetchCandlesFromYfinance();
setInterval(fetchCandlesFromYfinance, 15000);

// ─── Indicator Calculations ─────────────────────────────────────────────

function calcEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;
  const k = 2 / (period + 1);
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(2);
}

function calcVWAP(candleData: CandleData[]): { vwap: number; slope: number } {
  if (candleData.length < 2) return { vwap: 0, slope: 0 };

  // VWAP should reset daily — use only today's candles
  const latestDay = new Date(candleData[candleData.length - 1].time * 1000).toDateString();
  const todayCandles = candleData.filter(
    (c) => new Date(c.time * 1000).toDateString() === latestDay
  );
  if (todayCandles.length < 2) return { vwap: 0, slope: 0 };

  let cumVolPrice = 0;
  let cumVol = 0;
  const vwaps: number[] = [];

  for (const c of todayCandles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumVolPrice += typicalPrice * c.volume;
    cumVol += c.volume;
    vwaps.push(cumVol > 0 ? cumVolPrice / cumVol : 0);
  }

  const currentVwap = vwaps[vwaps.length - 1];
  const prevVwap = vwaps.length > 5 ? vwaps[vwaps.length - 6] : vwaps[0];
  const slope = currentVwap - prevVwap;

  return { vwap: +currentVwap.toFixed(2), slope: +slope.toFixed(4) };
}

function getIndicators(): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema9 = ema9Arr.length > 0 ? +ema9Arr[ema9Arr.length - 1].toFixed(2) : 0;
  const ema21 = ema21Arr.length > 0 ? +ema21Arr[ema21Arr.length - 1].toFixed(2) : 0;
  const emaAligned = ema9 > ema21;

  const rsi = calcRSI(closes);
  const rsiInRange = rsi >= 45 && rsi <= 65;

  const { vwap, slope: vwapSlope } = calcVWAP(candles);
  const currentPrice = closes.length > 0 ? closes[closes.length - 1] : 0;
  const priceAboveVwap = currentPrice > vwap;
  const vwapBullish = priceAboveVwap && vwapSlope > 0;

  // Volume check: current candle vol >= 20-period avg * 1.2
  const volumes = candles.map((c) => c.volume);
  const recentVols = volumes.slice(-20);
  const avgVolume20 =
    recentVols.length > 0
      ? Math.floor(recentVols.reduce((a, b) => a + b, 0) / recentVols.length)
      : 0;
  const currentVolume = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
  const volumeSufficient = currentVolume >= avgVolume20 * 1.2;

  // ORB breakout: close > first candle of today's session high
  const orbBreakout = currentPrice > orbHigh && orbHigh > 0;

  const allConditionsMet =
    emaAligned && rsiInRange && vwapBullish && priceAboveVwap && volumeSufficient && orbBreakout;

  return {
    ema9,
    ema21,
    emaAligned,
    rsi,
    rsiInRange,
    vwap,
    vwapSlope,
    vwapBullish,
    priceAboveVwap,
    currentVolume,
    avgVolume20,
    volumeSufficient,
    orbHigh,
    orbBreakout,
    currentPrice,
    allConditionsMet,
  };
}

function getPositionInfo(): PositionInfo {
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  if (!position.isOpen) {
    return {
      isOpen: false,
      entryPrice: 0,
      shares: 0,
      stopLoss: 0,
      takeProfit: 0,
      unrealizedPnl: 0,
      currentPrice,
    };
  }
  const unrealizedPnl = +((currentPrice - position.entryPrice) * position.shares).toFixed(2);
  return {
    isOpen: true,
    entryPrice: position.entryPrice,
    shares: position.shares,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    unrealizedPnl,
    currentPrice,
  };
}

function checkPositionExit(currentPrice: number) {
  if (!position.isOpen) return;

  if (currentPrice >= position.takeProfit) {
    closePosition(currentPrice, "closed_tp");
    sellSignalActive = true;
    sellSignalReason = "TP HIT";
  } else if (currentPrice <= position.stopLoss) {
    closePosition(currentPrice, "closed_sl");
    sellSignalActive = true;
    sellSignalReason = "SL HIT";
  }
}

function closePosition(exitPrice: number, status: string) {
  const pnl = +((exitPrice - position.entryPrice) * position.shares).toFixed(2);
  const trade = tradeHistory.find((t) => t.status === "open");
  if (trade) {
    trade.exitTime = Math.floor(Date.now() / 1000);
    trade.exitPrice = +exitPrice.toFixed(2);
    trade.status = status;
    trade.pnl = pnl;
  }
  position.isOpen = false;
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Get candle data for chart
  app.get("/api/candles", (_req, res) => {
    res.json(candles);
  });

  // Get current indicators
  app.get("/api/indicators", (_req, res) => {
    const indicators = getIndicators();
    res.json(indicators);
  });

  // Get position info
  app.get("/api/position", (_req, res) => {
    res.json(getPositionInfo());
  });

  // Get trade history
  app.get("/api/trades", (_req, res) => {
    res.json(tradeHistory);
  });

  // Get signal status — NO auto-entry, just report if conditions are met
  app.get("/api/signals", (_req, res) => {
    const indicators = getIndicators();

    const result = {
      buySignal: buySignalActive,
      sellSignal: sellSignalActive,
      sellReason: sellSignalReason,
      positionOpen: position.isOpen,
      conditionsMet: indicators.allConditionsMet,
    };

    // Reset signal flags after reading
    buySignalActive = false;
    if (sellSignalActive) {
      sellSignalActive = false;
      sellSignalReason = "";
    }

    res.json(result);
  });

  // ─── Manual BUY ───────────────────────────────────────────────────────
  app.post("/api/position/open", (req, res) => {
    if (position.isOpen) {
      return res.status(400).json({ error: "Position already open" });
    }
    if (candles.length === 0) {
      return res.status(400).json({ error: "No market data available" });
    }

    const marketPrice = candles[candles.length - 1].close;
    const entryPrice = req.body?.entryPrice ? +Number(req.body.entryPrice).toFixed(2) : marketPrice;
    const shares = req.body?.shares ?? 100;
    const slPct = req.body?.slPct ?? 1.5;   // default 1.5%
    const tpPct = req.body?.tpPct ?? 3.0;   // default 3.0%
    const stopLoss = +(entryPrice * (1 - slPct / 100)).toFixed(2);
    const takeProfit = +(entryPrice * (1 + tpPct / 100)).toFixed(2);

    position = {
      isOpen: true,
      entryPrice,
      shares,
      stopLoss,
      takeProfit,
      entryTime: Math.floor(Date.now() / 1000),
    };

    tradeHistory.push({
      id: tradeIdCounter++,
      entryTime: position.entryTime,
      entryPrice,
      exitTime: null,
      exitPrice: null,
      shares,
      stopLoss,
      takeProfit,
      status: "open",
      pnl: null,
    });

    buySignalActive = true;

    res.json({
      success: true,
      entryPrice,
      shares,
      stopLoss,
      takeProfit,
    });
  });

  // ─── Manual SELL / Close position ─────────────────────────────────────
  app.post("/api/position/close", (_req, res) => {
    if (!position.isOpen) {
      return res.status(400).json({ error: "No open position" });
    }
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    closePosition(currentPrice, "closed_manual");
    sellSignalActive = true;
    sellSignalReason = "MANUAL";
    res.json({ success: true });
  });

  // Data source status
  app.get("/api/data-source", (_req, res) => {
    res.json(dataSourceInfo);
  });

  // Reset trades (keeps market data)
  app.post("/api/reset", (_req, res) => {
    position = { isOpen: false, entryPrice: 0, shares: 0, stopLoss: 0, takeProfit: 0, entryTime: 0 };
    tradeHistory = [];
    tradeIdCounter = 1;
    buySignalActive = false;
    sellSignalActive = false;
    sellSignalReason = "";
    res.json({ success: true });
  });
}
