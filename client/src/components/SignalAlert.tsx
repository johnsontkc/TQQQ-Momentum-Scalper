import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SignalAlertProps {
  signals?: {
    buySignal: boolean;
    sellSignal: boolean;
    sellReason: string;
    positionOpen: boolean;
    conditionsMet: boolean;
  };
}

export function SignalAlert({ signals }: SignalAlertProps) {
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [sellReason, setSellReason] = useState("");

  useEffect(() => {
    if (signals?.buySignal) {
      setShowBuy(true);
      const timer = setTimeout(() => setShowBuy(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [signals?.buySignal]);

  useEffect(() => {
    if (signals?.sellSignal) {
      setShowSell(true);
      setSellReason(signals.sellReason);
      const timer = setTimeout(() => setShowSell(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [signals?.sellSignal]);

  return (
    <>
      {/* Buy Confirmation */}
      {showBuy && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-green-600 text-white shadow-lg">
            <TrendingUp className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">POSITION OPENED</p>
              <p className="text-xs opacity-90">Manual buy executed</p>
            </div>
          </div>
        </div>
      )}

      {/* Sell / Exit Signal */}
      {showSell && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-red-600 text-white shadow-lg">
            <TrendingDown className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">POSITION CLOSED — {sellReason}</p>
              <p className="text-xs opacity-90">
                {sellReason === "MANUAL" ? "Manual close" : `Auto exit: ${sellReason}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
