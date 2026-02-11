import { useState } from 'react';
import { useEvents } from '../hooks';
import { EventList } from '../components/market';

const TAGS = ['All', 'Politics', 'Crypto', 'Sports', 'Science', 'Culture'];

export function HomePage() {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const { data, isLoading, error, refetch } = useEvents({
    limit: 20,
    tag: selectedTag === 'All' ? undefined : selectedTag.toLowerCase(),
  });

  const events = data?.data || [];

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Prediction Markets
          </h1>
        </div>
        <p className="text-fg-secondary ml-4 text-base">
          Aggregated from Polymarket. Powered by <span className="font-semibold text-blue-600 dark:text-blue-400">Sui Network</span>.
        </p>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-5 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all shadow-sm ${
              selectedTag === tag
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-200 dark:shadow-blue-900/50 scale-105'
                : 'bg-surface border border-border text-fg-secondary hover:text-fg-primary hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Event list */}
      <EventList
        events={events}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
