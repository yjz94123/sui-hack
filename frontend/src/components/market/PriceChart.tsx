import type { PriceHistory } from '@og-predict/shared';
import { Loading } from '../common';

interface PriceChartProps {
  data?: PriceHistory;
  isLoading: boolean;
}

const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 240;
const PADDING = 16;

export function PriceChart({ data, isLoading }: PriceChartProps) {
  if (isLoading) return <Loading size="sm" text="Loading chart..." />;

  const points = data?.history ?? [];
  if (points.length === 0) {
    return (
      <div className="app-muted-panel flex h-60 items-center justify-center text-sm text-fg-muted">
        No price history data.
      </div>
    );
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const minPrice = Math.min(...points.map((point) => point.price));
  const maxPrice = Math.max(...points.map((point) => point.price));
  const priceRange = Math.max(maxPrice - minPrice, 0.001);

  const innerWidth = VIEWBOX_WIDTH - PADDING * 2;
  const innerHeight = VIEWBOX_HEIGHT - PADDING * 2;

  const coords = points.map((point, index) => {
    const x = PADDING + (innerWidth * index) / Math.max(points.length - 1, 1);
    const y = PADDING + innerHeight - ((point.price - minPrice) / priceRange) * innerHeight;
    return { x, y };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${VIEWBOX_HEIGHT - PADDING} L ${coords[0].x} ${VIEWBOX_HEIGHT - PADDING} Z`;
  const latestPoint = coords[coords.length - 1];

  const change = latest.price - first.price;
  const changePercent = (change / Math.max(first.price, 0.0001)) * 100;
  const isUp = change >= 0;
  const changeTextClass = isUp ? 'text-success' : 'text-danger';

  const formatTimeLabel = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

  const middlePoint = points[Math.floor(points.length / 2)] ?? latest;

  return (
    <div className="app-muted-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-fg-muted">Yes Price</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-fg-primary">{(latest.price * 100).toFixed(1)}¢</span>
            <span className={`text-sm font-medium ${changeTextClass}`}>
              {change >= 0 ? '+' : ''}
              {changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-fg-secondary">
          {points.length} points
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-surface/65 p-3">
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-60 w-full">
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={PADDING}
              x2={VIEWBOX_WIDTH - PADDING}
              y1={PADDING + (VIEWBOX_HEIGHT - PADDING * 2) * ratio}
              y2={PADDING + (VIEWBOX_HEIGHT - PADDING * 2) * ratio}
              stroke="rgb(var(--color-border))"
              strokeDasharray="3 6"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill="url(#chart-fill)" />
          <path d={linePath} fill="none" stroke="rgb(var(--color-accent))" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={latestPoint.x} cy={latestPoint.y} r="4" fill="rgb(var(--color-accent))" />
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-fg-muted">
        <div>{formatTimeLabel(first.timestamp)}</div>
        <div className="text-center">{formatTimeLabel(middlePoint.timestamp)}</div>
        <div className="text-right">{formatTimeLabel(latest.timestamp)}</div>
      </div>
    </div>
  );
}
