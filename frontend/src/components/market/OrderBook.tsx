import type { OrderBookData, OrderBookEntry } from '@og-predict/shared';
import { Loading } from '../common';

interface OrderBookProps {
  data?: OrderBookData;
  isLoading: boolean;
}

function formatCents(price: string): string {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return '--';
  return `${(numeric * 100).toFixed(1)}¢`;
}

function formatSize(size: string): string {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) return '--';
  return numeric.toLocaleString();
}

function renderRows(rows: OrderBookEntry[], maxSize: number, tone: 'bid' | 'ask') {
  const accentClass = tone === 'bid' ? 'text-success' : 'text-danger';
  const bgClass = tone === 'bid' ? 'bg-success/12' : 'bg-danger/12';

  return rows.slice(0, 8).map((row, index) => {
    const width = Math.max(8, (Number(row.size) / maxSize) * 100);
    return (
      <div key={`${tone}-${index}-${row.price}`} className="relative overflow-hidden rounded-md px-2.5 py-1.5">
        <div className={`absolute inset-y-0 ${tone === 'bid' ? 'left-0' : 'right-0'} ${bgClass}`} style={{ width: `${width}%` }} />
        <div className="relative flex items-center justify-between gap-2 text-xs">
          <span className={`font-medium ${accentClass}`}>{formatCents(row.price)}</span>
          <span className="text-fg-secondary">{formatSize(row.size)}</span>
        </div>
      </div>
    );
  });
}

export function OrderBook({ data, isLoading }: OrderBookProps) {
  if (isLoading) return <Loading size="sm" text="Loading order book..." />;

  const bids = data?.yes.bids ?? [];
  const asks = data?.yes.asks ?? [];

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="app-muted-panel px-4 py-10 text-center text-sm text-fg-muted">
        No order book data available.
      </div>
    );
  }

  const maxSize = Math.max(
    ...bids.map((item) => Number(item.size) || 0),
    ...asks.map((item) => Number(item.size) || 0),
    1
  );

  const spread = Number(data?.yes.spread ?? 0);

  return (
    <div className="app-muted-panel space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg-primary">Yes Outcome Order Book</h3>
        <span className="text-xs text-fg-muted">Spread: {(spread * 100).toFixed(2)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 rounded-xl border border-border/70 bg-surface/60 p-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            <span>Bids</span>
            <span>Size</span>
          </div>
          {renderRows(bids, maxSize, 'bid')}
        </div>

        <div className="space-y-1 rounded-xl border border-border/70 bg-surface/60 p-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            <span>Asks</span>
            <span>Size</span>
          </div>
          {renderRows(asks, maxSize, 'ask')}
        </div>
      </div>
    </div>
  );
}
