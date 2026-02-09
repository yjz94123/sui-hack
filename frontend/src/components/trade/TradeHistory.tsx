import type { TradeRecord } from '@og-predict/shared';
import { Loading } from '../common';

interface TradeHistoryProps {
  trades: TradeRecord[];
  isLoading: boolean;
}

export function TradeHistory({ trades, isLoading }: TradeHistoryProps) {
  if (isLoading) return <Loading size="sm" text="Loading trades..." />;

  if (trades.length === 0) {
    return (
      <div className="text-center text-fg-muted text-sm py-6">
        No trade history
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-fg-muted text-xs border-b border-border">
            <th className="text-left py-2 font-medium">Market</th>
            <th className="text-left py-2 font-medium">Side</th>
            <th className="text-left py-2 font-medium">Outcome</th>
            <th className="text-right py-2 font-medium">Amount</th>
            <th className="text-right py-2 font-medium">Price</th>
            <th className="text-right py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.tradeId} className="border-b border-border/50">
              <td className="py-2 text-fg-secondary max-w-[150px] truncate">{trade.marketId}</td>
              <td className="py-2">
                <span className={trade.tradeType === 'buy' ? 'text-green-400' : 'text-red-400'}>
                  {trade.tradeType.toUpperCase()}
                </span>
              </td>
              <td className="py-2 text-fg-secondary">{trade.outcome}</td>
              <td className="py-2 text-right text-fg-secondary">{trade.amount.toFixed(2)}</td>
              <td className="py-2 text-right text-fg-secondary">{(trade.price * 100).toFixed(0)}c</td>
              <td className="py-2 text-right">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    trade.status === 'filled'
                      ? 'bg-green-500/10 text-green-400'
                      : trade.status === 'cancelled'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {trade.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
