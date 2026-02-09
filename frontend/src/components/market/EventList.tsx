import type { EventSummary } from '@og-predict/shared';
import { EventCard } from './EventCard';
import { Loading, ErrorMessage } from '../common';

interface EventListProps {
  events: EventSummary[];
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export function EventList({ events, isLoading, error, onRetry }: EventListProps) {
  if (isLoading) return <Loading text="Loading markets..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={onRetry} />;
  if (events.length === 0) {
    return <p className="text-center text-fg-muted py-8">No markets found</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <EventCard key={event.eventId} event={event} />
      ))}
    </div>
  );
}
