import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IndicatorSnapshot } from "@shared/schema";
import {
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  Gauge,
  Volume2,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Crosshair,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SignalPanelProps {
  indicators?: IndicatorSnapshot;
  positionOpen?: boolean;
}

function ConditionRow({
  label,
  met,
  detail,
  icon: Icon,
}: {
  label: string;
  met: boolean;
  detail: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums truncate max-w-[120px]">
          {detail}
        </span>
        {met ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
      </div>
    </div>
  );
}

export function SignalPanel({ indicators, positionOpen }: SignalPanelProps) {
  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("100");
  const [slPct, setSlPct] = useState("1.5");
  const [tpPct, setTpPct] = useState("3.0");
  const [isBuying, setIsBuying] = useState(false);
  const [priceEdited, setPriceEdited] = useState(false);

  // Sync entry price with market price when user hasn't manually edited
  useEffect(() => {
    if (!priceEdited && indicators?.currentPrice) {
      setEntryPrice(indicators.currentPrice.toFixed(2));
    }
  }, [indicators?.currentPrice, priceEdited]);

  const handlePriceChange = (val: string) => {
    setEntryPrice(val);
    setPriceEdited(true);
  };

  const handleUseMarketPrice = () => {
    if (indicators?.currentPrice) {
      setEntryPrice(indicators.currentPrice.toFixed(2));
      setPriceEdited(false);
    }
  };

  const parsedEntry = parseFloat(entryPrice) || 0;
  const parsedSL = parseFloat(slPct) || 1.5;
  const parsedTP = parseFloat(tpPct) || 3.0;
  const computedSL = parsedEntry > 0 ? (parsedEntry * (1 - parsedSL / 100)).toFixed(2) : "—";
  const computedTP = parsedEntry > 0 ? (parsedEntry * (1 + parsedTP / 100)).toFixed(2) : "—";

  const handleManualBuy = async () => {
    if (parsedEntry <= 0) return;
    setIsBuying(true);
    try {
      await apiRequest("POST", "/api/position/open", {
        entryPrice: parsedEntry,
        shares: parseInt(shares) || 100,
        slPct: parsedSL,
        tpPct: parsedTP,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/position"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
    } catch (err) {
      console.error("Buy failed:", err);
    } finally {
      setIsBuying(false);
    }
  };

  if (!indicators) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Entry Conditions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metCount = [
    indicators.orbBreakout,
    indicators.emaAligned,
    indicators.vwapBullish && indicators.priceAboveVwap,
    indicators.rsiInRange,
    indicators.volumeSufficient,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Entry Conditions</CardTitle>
        <Badge
          variant={metCount === 5 ? "default" : "secondary"}
          className={`text-xs tabular-nums ${metCount === 5 ? "bg-green-600 hover:bg-green-600" : ""}`}
        >
          {metCount}/5
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <ConditionRow
          label="ORB Breakout"
          met={indicators.orbBreakout}
          detail={`High: $${indicators.orbHigh.toFixed(2)}`}
          icon={ArrowUpRight}
        />
        <ConditionRow
          label="EMA9 > EMA21"
          met={indicators.emaAligned}
          detail={`${indicators.ema9} / ${indicators.ema21}`}
          icon={TrendingUp}
        />
        <ConditionRow
          label="Price > VWAP ↑"
          met={indicators.vwapBullish && indicators.priceAboveVwap}
          detail={`VWAP: $${indicators.vwap}`}
          icon={BarChart3}
        />
        <ConditionRow
          label="RSI 45–65"
          met={indicators.rsiInRange}
          detail={`RSI: ${indicators.rsi}`}
          icon={Gauge}
        />
        <ConditionRow
          label="Vol ≥ 1.2x Avg"
          met={indicators.volumeSufficient}
          detail={`${(indicators.currentVolume / 1000).toFixed(0)}k / ${(indicators.avgVolume20 / 1000).toFixed(0)}k`}
          icon={Volume2}
        />

        {indicators.allConditionsMet && (
          <div className="mt-3 p-2 rounded-md bg-green-500/10 border border-green-500/20 text-center">
            <span className="text-xs font-semibold text-green-500 signal-pulse">
              ALL CONDITIONS MET — BUY SIGNAL
            </span>
          </div>
        )}

        {/* ─── Order Entry ─────────────────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
          {/* Entry Price — primary input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium">Entry Price</label>
              <button
                onClick={handleUseMarketPrice}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="button-use-market"
              >
                <Crosshair className="w-3 h-3" />
                Market ${indicators.currentPrice.toFixed(2)}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                value={entryPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                className={`h-8 text-sm tabular-nums pl-6 font-semibold ${
                  priceEdited ? "border-primary/50 ring-1 ring-primary/20" : ""
                }`}
                placeholder="Enter price..."
                data-testid="input-entry-price"
              />
            </div>
            {priceEdited && parsedEntry > 0 && indicators.currentPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {parsedEntry > indicators.currentPrice
                  ? `+${((parsedEntry / indicators.currentPrice - 1) * 100).toFixed(2)}% above market`
                  : parsedEntry < indicators.currentPrice
                  ? `${((parsedEntry / indicators.currentPrice - 1) * 100).toFixed(2)}% below market`
                  : "At market price"}
              </p>
            )}
          </div>

          {/* Shares, SL%, TP% */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">Shares</label>
              <Input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="h-7 text-xs tabular-nums"
                data-testid="input-shares"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">SL %</label>
              <Input
                type="number"
                step="0.1"
                value={slPct}
                onChange={(e) => setSlPct(e.target.value)}
                className="h-7 text-xs tabular-nums"
                data-testid="input-sl"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">TP %</label>
              <Input
                type="number"
                step="0.1"
                value={tpPct}
                onChange={(e) => setTpPct(e.target.value)}
                className="h-7 text-xs tabular-nums"
                data-testid="input-tp"
              />
            </div>
          </div>

          {/* Computed SL/TP preview */}
          {parsedEntry > 0 && (
            <div className="flex justify-between text-xs tabular-nums px-0.5">
              <span className="text-red-400">SL: ${computedSL}</span>
              <span className="text-green-500">TP: ${computedTP}</span>
            </div>
          )}

          {/* BUY Button */}
          <Button
            className={`w-full h-9 text-sm font-semibold ${
              indicators.allConditionsMet
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-green-600/60 hover:bg-green-600/70 text-white/90"
            }`}
            disabled={positionOpen || isBuying || parsedEntry <= 0}
            onClick={handleManualBuy}
            data-testid="button-manual-buy"
          >
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            {isBuying
              ? "Opening..."
              : positionOpen
              ? "Position Open"
              : `BUY ${parseInt(shares) || 100} @ $${parsedEntry > 0 ? parsedEntry.toFixed(2) : "—"}`}
          </Button>

          {positionOpen && (
            <p className="text-xs text-muted-foreground text-center">
              Close current position before opening a new one
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
