import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PositionInfo } from "@shared/schema";
import { Target, ShieldAlert, DollarSign, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PositionTrackerProps {
  position?: PositionInfo;
}

export function PositionTracker({ position }: PositionTrackerProps) {
  const handleClose = async () => {
    await apiRequest("POST", "/api/position/close");
    queryClient.invalidateQueries({ queryKey: ["/api/position"] });
    queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
  };

  if (!position) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Position Tracker</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!position.isOpen) {
    return (
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Position Tracker</CardTitle>
          <Badge variant="secondary" className="text-xs">No Position</Badge>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <DollarSign className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">Use the BUY button to open a position</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pnlColor = position.unrealizedPnl >= 0 ? "text-green-500" : "text-red-400";
  const priceDistToTP = ((position.takeProfit - position.currentPrice) / position.currentPrice * 100).toFixed(2);
  const priceDistToSL = ((position.currentPrice - position.stopLoss) / position.currentPrice * 100).toFixed(2);

  // Progress bar: 0% at SL, 100% at TP
  const range = position.takeProfit - position.stopLoss;
  const progress = range > 0 ? Math.max(0, Math.min(100, ((position.currentPrice - position.stopLoss) / range) * 100)) : 50;

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Position Tracker</CardTitle>
          <Badge className="bg-green-600 hover:bg-green-600 text-xs">Open</Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs"
          onClick={handleClose}
          data-testid="button-close-position"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Close
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Entry</p>
            <p className="text-sm font-semibold tabular-nums" data-testid="text-entry-price">
              ${position.entryPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Current</p>
            <p className="text-sm font-semibold tabular-nums" data-testid="text-current-price">
              ${position.currentPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">P&L</p>
            <p className={`text-sm font-semibold tabular-nums ${pnlColor}`} data-testid="text-pnl">
              {position.unrealizedPnl >= 0 ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
            </p>
          </div>
        </div>

        {/* TP/SL Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-red-400">
              <ShieldAlert className="w-3 h-3" />
              SL: ${position.stopLoss.toFixed(2)} ({priceDistToSL}%)
            </span>
            <span className="flex items-center gap-1 text-green-500">
              <Target className="w-3 h-3" />
              TP: ${position.takeProfit.toFixed(2)} ({priceDistToTP}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress > 50
                  ? `linear-gradient(90deg, hsl(45, 80%, 55%), hsl(145, 70%, 45%))`
                  : `linear-gradient(90deg, hsl(0, 70%, 55%), hsl(45, 80%, 55%))`,
              }}
            />
          </div>
        </div>

        {/* Shares Info */}
        <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>Shares: {position.shares}</span>
          <span>
            Value: ${(position.shares * position.currentPrice).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
