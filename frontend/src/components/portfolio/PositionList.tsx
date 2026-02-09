import { Loading } from '../common';

interface Position {
  marketId: string;
  question: string;
  outcome: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
}

interface PositionListProps {
  positions: Position[];
  isLoading: boolean;
}

export function PositionList({ positions, isLoading }: PositionListProps) {
  if (isLoading) return <Loading text="Loading positions..." />;

  if (positions.length === 0) {
    return (
      <div className="text-center text-fg-muted py-8">
        No open positions
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) => {
        const pnl = (pos.currentPrice - pos.avgPrice) * pos.shares;
        const pnlPercent = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;

        return (
          <div
            key={`${pos.marketId}-${pos.outcome}`}
            className="p-4 rounded-xl bg-surface border border-border"
          >
            <h4 className="text-sm text-fg-primary font-medium truncate">{pos.question}</h4>
            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="text-fg-secondary">
                {pos.shares.toFixed(2)} shares @ {(pos.avgPrice * 100).toFixed(0)}c
              </div>
              <div className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
