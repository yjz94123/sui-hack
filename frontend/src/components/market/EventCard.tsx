import { Link } from 'react-router-dom';
import type { EventSummary } from '@og-predict/shared';

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/market/${event.eventId}`}
      className="block p-4 rounded-xl bg-surface border border-border hover:border-border-strong transition"
    >
      <div className="flex items-start gap-3">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-fg-primary truncate">{event.title}</h3>
          <div className="mt-2 flex items-center gap-4 text-sm text-fg-secondary">
            <span>Vol: ${(event.volume / 1e6).toFixed(1)}M</span>
            <span>Liq: ${(event.liquidity / 1e6).toFixed(1)}M</span>
          </div>
          {event.markets && event.markets.length > 0 && (
            <div className="mt-2 text-sm">
              <span className="text-green-400 font-medium">
                {(parseFloat(event.markets[0].bestBid) * 100).toFixed(0)}%
              </span>
              <span className="text-fg-muted ml-1">Yes</span>
            </div>
          )}
        </div>
      </div>
      {event.tags && event.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {event.tags.map((tag) => (
            <span
              key={tag.slug}
              className="px-2 py-0.5 text-xs rounded-full bg-elevated text-fg-secondary"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
