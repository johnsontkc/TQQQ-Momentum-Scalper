import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";

interface Trade {
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
}

interface TradeHistoryProps {
  trades?: Trade[];
}

function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "open":
      return <Badge className="bg-blue-500/15 text-blue-500 hover:bg-blue-500/15 text-xs">Open</Badge>;
    case "closed_tp":
      return <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/15 text-xs">TP Hit</Badge>;
    case "closed_sl":
      return <Badge className="bg-red-500/15 text-red-400 hover:bg-red-500/15 text-xs">SL Hit</Badge>;
    case "closed_manual":
      return <Badge variant="secondary" className="text-xs">Manual</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (!trades) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Trade History</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPnl = trades
    .filter((t) => t.pnl !== null)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-medium">Trade History</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{trades.length} trades</span>
          {trades.length > 0 && (
            <span className={`text-xs font-medium tabular-nums ${totalPnl >= 0 ? "text-green-500" : "text-red-400"}`}>
              Total: {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No trades yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-1.5 font-medium text-muted-foreground">Time</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">Entry</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">Exit</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">P&L</th>
                  <th className="text-right py-1.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...trades].reverse().map((trade) => (
                  <tr key={trade.id} className="border-b border-border/30" data-testid={`row-trade-${trade.id}`}>
                    <td className="py-1.5 tabular-nums">{formatTime(trade.entryTime)}</td>
                    <td className="text-right tabular-nums">${trade.entryPrice.toFixed(2)}</td>
                    <td className="text-right tabular-nums">
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className={`text-right tabular-nums font-medium ${
                      trade.pnl === null ? "text-muted-foreground" :
                      trade.pnl >= 0 ? "text-green-500" : "text-red-400"
                    }`}>
                      {trade.pnl !== null
                        ? `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="text-right">{statusBadge(trade.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
