import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IndicatorSnapshot } from "@shared/schema";
import { Activity } from "lucide-react";

interface StrategyStatusProps {
  indicators?: IndicatorSnapshot;
}

function MetricBar({
  label,
  value,
  min,
  max,
  current,
  unit,
  rangeMin,
  rangeMax,
  color,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  current: number;
  unit?: string;
  rangeMin?: number;
  rangeMax?: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value}{unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
        </span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-muted overflow-hidden">
        {/* Optimal range indicator */}
        {rangeMin !== undefined && rangeMax !== undefined && (
          <div
            className="absolute h-full bg-green-500/15 rounded-full"
            style={{
              left: `${((rangeMin - min) / (max - min)) * 100}%`,
              width: `${((rangeMax - rangeMin) / (max - min)) * 100}%`,
            }}
          />
        )}
        {/* Current value indicator */}
        <div
          className="absolute h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function StrategyStatus({ indicators }: StrategyStatusProps) {
  if (!indicators) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Strategy Status</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const vwapSlopeStr = indicators.vwapSlope > 0 ? `+${indicators.vwapSlope.toFixed(4)}` : indicators.vwapSlope.toFixed(4);
  const emaSpread = +(indicators.ema9 - indicators.ema21).toFixed(2);
  const emaSpreadStr = emaSpread > 0 ? `+${emaSpread}` : `${emaSpread}`;

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <CardTitle className="text-sm font-medium">Strategy Status</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* RSI */}
        <MetricBar
          label="RSI(14)"
          value={indicators.rsi.toString()}
          min={0}
          max={100}
          current={indicators.rsi}
          rangeMin={45}
          rangeMax={65}
          color={
            indicators.rsiInRange
              ? "hsl(160, 72%, 42%)"
              : indicators.rsi > 65
              ? "hsl(0, 72%, 52%)"
              : "hsl(45, 80%, 55%)"
          }
        />

        {/* VWAP Slope */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">VWAP Slope</span>
            <span className={`font-medium tabular-nums ${indicators.vwapSlope > 0 ? "text-green-500" : "text-red-400"}`}>
              {vwapSlopeStr}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${indicators.vwapBullish ? "bg-green-500" : "bg-red-400"}`} />
            <span className="text-xs text-muted-foreground">
              {indicators.vwapBullish ? "Bullish — Price above VWAP, slope rising" : "Bearish — Conditions not met"}
            </span>
          </div>
        </div>

        {/* EMA Alignment */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">EMA Spread (9-21)</span>
            <span className={`font-medium tabular-nums ${emaSpread > 0 ? "text-green-500" : "text-red-400"}`}>
              {emaSpreadStr}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${indicators.emaAligned ? "bg-green-500" : "bg-red-400"}`} />
            <span className="text-xs text-muted-foreground">
              {indicators.emaAligned ? "Bullish alignment — EMA9 above EMA21" : "No bullish alignment"}
            </span>
          </div>
        </div>

        {/* Volume Ratio */}
        <MetricBar
          label="Volume Ratio"
          value={indicators.avgVolume20 > 0 ? (indicators.currentVolume / indicators.avgVolume20).toFixed(2) : "0"}
          min={0}
          max={3}
          current={indicators.avgVolume20 > 0 ? indicators.currentVolume / indicators.avgVolume20 : 0}
          unit="x"
          rangeMin={1.2}
          rangeMax={3}
          color={
            indicators.volumeSufficient
              ? "hsl(160, 72%, 42%)"
              : "hsl(45, 80%, 55%)"
          }
        />
      </CardContent>
    </Card>
  );
}
