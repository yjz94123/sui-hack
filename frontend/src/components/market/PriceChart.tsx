import type { PriceHistory } from '@og-predict/shared';
import { Loading } from '../common';

interface PriceChartProps {
  data?: PriceHistory;
  isLoading: boolean;
}

export function PriceChart({ data, isLoading }: PriceChartProps) {
  if (isLoading) return <Loading size="sm" text="Loading chart..." />;
  if (!data || data.history.length === 0) return null;

  // TODO: Replace with lightweight-charts or recharts implementation
  const latest = data.history[data.history.length - 1];
  const first = data.history[0];
  const change = latest.price - first.price;
  const changePercent = (change / first.price) * 100;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-fg-primary">Price History</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fg-primary font-medium">
            {(latest.price * 100).toFixed(1)}%
          </span>
          <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
            {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Placeholder for chart - will be replaced with actual chart library */}
      <div className="h-48 flex items-center justify-center text-fg-muted text-sm">
        Chart placeholder - {data.history.length} data points
      </div>
    </div>
  );
}
