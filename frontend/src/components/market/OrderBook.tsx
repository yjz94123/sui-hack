import type { OrderBookData } from '@og-predict/shared';
import { Loading } from '../common';

interface OrderBookProps {
  data?: OrderBookData;
  isLoading: boolean;
}

export function OrderBook({ data, isLoading }: OrderBookProps) {
  if (isLoading) return <Loading size="sm" text="Loading order book..." />;
  if (!data) return null;

  const bids = data.yes.bids;
  const asks = data.yes.asks;

  const maxTotal = Math.max(
    ...bids.map((b) => parseFloat(b.size)), // b.total might not exist, check OrderBookEntry
    ...asks.map((a) => parseFloat(a.size)),
    1
  );

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-fg-primary mb-3">Order Book</h3>

      <div className="grid grid-cols-2 gap-2 text-xs text-fg-muted mb-2">
        <div className="flex justify-between">
          <span>Price</span>
          <span>Size</span>
        </div>
        <div className="flex justify-between">
          <span>Price</span>
          <span>Size</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Bids (Buy) */}
        <div className="space-y-0.5">
          {bids.slice(0, 10).map((bid, i) => (
            <div key={i} className="relative flex justify-between text-xs py-0.5 px-1">
              <div
                className="absolute inset-0 bg-green-500/10 rounded"
                style={{ width: `${(parseFloat(bid.size) / maxTotal) * 100}%` }}
              />
              <span className="relative text-green-400">{parseFloat(bid.price).toFixed(2)}</span>
              <span className="relative text-fg-secondary">{parseFloat(bid.size).toFixed(0)}</span>
            </div>
          ))}
        </div>

        {/* Asks (Sell) */}
        <div className="space-y-0.5">
          {asks.slice(0, 10).map((ask, i) => (
            <div key={i} className="relative flex justify-between text-xs py-0.5 px-1">
              <div
                className="absolute inset-0 bg-red-500/10 rounded right-0"
                style={{ width: `${(parseFloat(ask.size) / maxTotal) * 100}%` }}
              />
              <span className="relative text-red-400">{parseFloat(ask.price).toFixed(2)}</span>
              <span className="relative text-fg-secondary">{parseFloat(ask.size).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.yes.spread !== undefined && (
        <div className="mt-2 text-center text-xs text-fg-muted">
          Spread: {(parseFloat(data.yes.spread) * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
