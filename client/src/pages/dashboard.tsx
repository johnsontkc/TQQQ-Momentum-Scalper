import { useQuery } from "@tanstack/react-query";
import { CandlestickChart } from "@/components/CandlestickChart";
import { SignalPanel } from "@/components/SignalPanel";
import { PositionTracker } from "@/components/PositionTracker";
import { StrategyStatus } from "@/components/StrategyStatus";
import { TradeHistory } from "@/components/TradeHistory";
import { SignalAlert } from "@/components/SignalAlert";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import type { IndicatorSnapshot, PositionInfo } from "@shared/schema";
import {
  Activity,
  Moon,
  Sun,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const { data: indicators } = useQuery<IndicatorSnapshot>({
    queryKey: ["/api/indicators"],
    refetchInterval: 3000,
  });

  const { data: position } = useQuery<PositionInfo>({
    queryKey: ["/api/position"],
    refetchInterval: 3000,
  });

  const { data: signals } = useQuery<{
    buySignal: boolean;
    sellSignal: boolean;
    sellReason: string;
    positionOpen: boolean;
    conditionsMet: boolean;
  }>({
    queryKey: ["/api/signals"],
    refetchInterval: 3000,
  });

  const { data: trades } = useQuery<Array<{
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
  }>>({
    queryKey: ["/api/trades"],
    refetchInterval: 5000,
  });

  const { data: dataSource } = useQuery<{
    source: string;
    error: string;
    lastUpdate: number;
  }>({
    queryKey: ["/api/data-source"],
    refetchInterval: 10000,
  });

  const handleReset = async () => {
    await apiRequest("POST", "/api/reset");
    queryClient.invalidateQueries({ queryKey: ["/api/candles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/indicators"] });
    queryClient.invalidateQueries({ queryKey: ["/api/position"] });
    queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
  };

  const isLive = dataSource?.source === "yfinance";

  return (
    <div className="min-h-screen bg-background">
      {/* Signal Alerts */}
      <SignalAlert signals={signals} />

      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="TQQQ Scalper Logo"
            >
              <rect
                x="2"
                y="2"
                width="28"
                height="28"
                rx="6"
                className="stroke-primary"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M8 22 L12 14 L16 18 L20 10 L24 6"
                className="stroke-primary"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="24" cy="6" r="2.5" className="fill-primary" />
            </svg>
            <h1 className="text-base font-semibold tracking-tight">
              TQQQ Scalper
            </h1>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs cursor-default">
                {isLive ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/10">
                      yfinance
                    </Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-yellow-500" />
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {dataSource?.source || "loading"}
                    </Badge>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {isLive
                  ? `Real TQQQ data via yfinance`
                  : dataSource?.error
                  ? `Error: ${dataSource.error}`
                  : "Connecting to data source..."}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {indicators?.currentPrice ? (
            <span className="text-sm font-semibold tabular-nums mr-2" data-testid="text-header-price">
              ${indicators.currentPrice.toFixed(2)}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReset}
            data-testid="button-reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsDark(!isDark)}
            data-testid="button-theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 max-w-[1600px] mx-auto">
        {/* Top row: Chart + Signal Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 sm:gap-4 mb-3 sm:mb-4">
          <CandlestickChart />
          <div className="flex flex-col gap-3 sm:gap-4">
            <SignalPanel indicators={indicators} positionOpen={position?.isOpen} />
            <StrategyStatus indicators={indicators} />
          </div>
        </div>

        {/* Bottom row: Position + Trade History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <PositionTracker position={position} />
          <TradeHistory trades={trades} />
        </div>
      </main>

      <footer className="border-t border-border px-4 py-3 mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Real TQQQ data via yfinance. Not financial advice.</span>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
