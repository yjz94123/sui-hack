import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import type { EventSummary } from '@og-predict/shared';
import { useTranslation } from 'react-i18next';
import { useEvents } from '../../hooks';
import { MarketDataRow } from '../../components/market/MarketDataRow';
import { Loading, ErrorMessage } from '../../components/common';

const categories = ['All', 'Politics', 'Crypto', 'Finance', 'Geopolitics', 'Tech', 'World'];

type SortBy = 'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt';

function formatCompactCount(count: number): string {
  return count.toLocaleString();
}

const MarketList: React.FC = () => {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortBy>('volume24h');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const applyPreset = (preset: 'trending' | 'new' | 'ending') => {
    if (preset === 'trending') {
      setSortBy('volume24h');
      setOrder('desc');
      return;
    }

    if (preset === 'new') {
      setSortBy('createdAt');
      setOrder('desc');
      return;
    }

    setSortBy('endDate');
    setOrder('asc');
  };

  const toggleSort = (nextSortBy: SortBy) => {
    if (sortBy === nextSortBy) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(nextSortBy);
    setOrder(nextSortBy === 'endDate' ? 'asc' : 'desc');
  };

  const { data, isLoading, error, refetch } = useEvents({
    limit: 50,
    offset: 0,
    tag: activeCategory === 'All' ? undefined : activeCategory.toLowerCase(),
    sortBy,
    order,
    search: debouncedSearchQuery || undefined,
  });

  const events: EventSummary[] = data?.data || [];
  const totalVolume = useMemo(
    () => events.reduce((sum, item) => sum + (item.volume || 0), 0),
    [events]
  );

  const SortIcon = order === 'asc' ? ArrowUp : ArrowDown;

  const isPresetActive = (preset: 'trending' | 'new' | 'ending') => {
    if (preset === 'trending') return sortBy === 'volume24h';
    if (preset === 'new') return sortBy === 'createdAt';
    return sortBy === 'endDate';
  };

  return (
    <div className="space-y-6">
      <section className="app-panel px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-fg-muted">Prediction Explorer</p>
            <h1 className="text-2xl font-semibold tracking-tight text-fg-primary sm:text-[2rem]">Find your edge across live markets</h1>
            <p className="max-w-2xl text-sm text-fg-secondary">
              Curated markets with transparent volume, liquidity, and AI-assisted reasoning.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-3">
            <div className="app-stat min-w-[120px] border-accent/25 bg-accent-soft/60 p-3 sm:p-4">
              <div className="text-[11px] uppercase tracking-wide text-accent/85">Markets</div>
              <div className="mt-1 text-lg font-semibold text-fg-primary">{formatCompactCount(events.length)}</div>
            </div>
            <div className="app-stat min-w-[120px] border-violet-200/75 bg-violet-50/70 p-3 sm:p-4 dark:border-violet-500/35 dark:bg-violet-500/10">
              <div className="text-[11px] uppercase tracking-wide text-violet-700 dark:text-violet-200">Total Volume</div>
              <div className="mt-1 text-lg font-semibold text-fg-primary dark:text-violet-100">${(totalVolume / 1e6).toFixed(2)}M</div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-elevated/45 p-1">
              <button
                onClick={() => applyPreset('trending')}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition',
                  isPresetActive('trending')
                    ? 'bg-accent text-white font-semibold shadow-sm shadow-accent/25'
                    : 'text-fg-muted font-medium hover:text-fg-secondary'
                )}
              >
                {t('marketList.trending')}
              </button>
              <button
                onClick={() => applyPreset('new')}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition',
                  isPresetActive('new')
                    ? 'bg-accent text-white font-semibold shadow-sm shadow-accent/25'
                    : 'text-fg-muted font-medium hover:text-fg-secondary'
                )}
              >
                {t('marketList.newEvents')}
              </button>
              <button
                onClick={() => applyPreset('ending')}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition',
                  isPresetActive('ending')
                    ? 'bg-accent text-white font-semibold shadow-sm shadow-accent/25'
                    : 'text-fg-muted font-medium hover:text-fg-secondary'
                )}
              >
                {t('marketList.endingSoon')}
              </button>
            </div>

            <div className="relative w-full xl:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="app-input h-10 w-full pl-9 xl:w-72"
              />
            </div>
          </div>

          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-secondary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </span>
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition',
                    isActive
                      ? 'border-accent/35 bg-accent-soft text-accent font-semibold'
                      : 'border-border bg-surface text-fg-muted font-medium hover:text-fg-secondary'
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="hidden grid-cols-12 items-center gap-4 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-secondary/90 md:grid">
          <div className="col-span-6">{t('marketList.event')}</div>
          <button
            type="button"
            onClick={() => toggleSort('volume24h')}
            className="col-span-2 inline-flex items-center justify-end gap-1 transition hover:text-fg-primary"
          >
            <span>{t('marketList.vol24h')}</span>
            {sortBy === 'volume24h' ? <SortIcon className="h-3 w-3 text-fg-primary" /> : <ArrowUpDown className="h-3 w-3 text-fg-muted" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('volume')}
            className="col-span-2 inline-flex items-center justify-end gap-1 transition hover:text-fg-primary"
          >
            <span>{t('marketList.totalVol')}</span>
            {sortBy === 'volume' ? <SortIcon className="h-3 w-3 text-fg-primary" /> : <ArrowUpDown className="h-3 w-3 text-fg-muted" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('liquidity')}
            className="col-span-2 inline-flex items-center justify-end gap-1 transition hover:text-fg-primary"
          >
            <span>{t('marketList.liquidity')}</span>
            {sortBy === 'liquidity' ? <SortIcon className="h-3 w-3 text-fg-primary" /> : <ArrowUpDown className="h-3 w-3 text-fg-muted" />}
          </button>
        </div>

        {isLoading ? (
          <Loading size="lg" text={t('common.loading')} />
        ) : error ? (
          <ErrorMessage message={error.message || t('common.error')} onRetry={() => refetch()} />
        ) : events.length === 0 ? (
          <div className="app-muted-panel px-5 py-14 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface text-fg-muted">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-fg-primary">{t('marketList.noMarkets')}</h3>
            <p className="mt-2 text-sm text-fg-muted">{t('marketList.noMarketsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((event) => (
              <MarketDataRow key={event.eventId} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MarketList;
