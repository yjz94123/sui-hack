import { Link } from 'react-router-dom';
import type { EventSummary } from '@og-predict/shared';

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/market/${event.eventId}`}
      className="block p-5 rounded-2xl bg-surface border border-border hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start gap-4">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-14 h-14 rounded-xl object-cover ring-2 ring-border group-hover:ring-blue-400 dark:group-hover:ring-blue-600 transition-all"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-fg-primary line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {event.title}
          </h3>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-fg-muted">Vol:</span>
              <span className="font-medium text-fg-secondary">${(event.volume / 1e6).toFixed(1)}M</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-fg-muted">Liq:</span>
              <span className="font-medium text-fg-secondary">${(event.liquidity / 1e6).toFixed(1)}M</span>
            </div>
          </div>
          {event.markets && event.markets.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800/40">
              <span className="text-green-600 dark:text-green-400 font-bold text-base">
                {(parseFloat(event.markets[0].bestBid) * 100).toFixed(0)}%
              </span>
              <span className="text-green-700 dark:text-green-500 text-xs font-medium">Yes</span>
            </div>
          )}
        </div>
      </div>
      {event.tags && event.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span
              key={tag.slug}
              className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
