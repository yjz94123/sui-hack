import React, { useEffect, useState } from 'react';
import { MarketDataRow } from '../../components/market/MarketDataRow';
import { Loading, ErrorMessage } from '../../components/common';
import { Search, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';

import type { EventSummary } from '@og-predict/shared';
import { useEvents } from '../../hooks';

import { useTranslation } from 'react-i18next';

const MarketList: React.FC = () => {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<'volume' | 'volume24h' | 'liquidity' | 'endDate' | 'createdAt'>('volume24h');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Categories based on the screenshot
  const categories = ['All', 'Politics', 'Crypto', 'Finance', 'Geopolitics', 'Tech', 'World'];
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

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

  const toggleSort = (nextSortBy: typeof sortBy) => {
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
    search: debouncedSearchQuery ? debouncedSearchQuery : undefined,
  });

  const events: EventSummary[] = data?.data || [];
  const SortIcon = order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-border pb-4">
        {/* Left: View Filters */}
        <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => applyPreset('trending')}
            className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               sortBy === 'volume24h' ? "text-fg-primary border-fg-primary" : "text-fg-secondary border-transparent hover:text-fg-primary"
            )}
          >
            <ArrowUpDown className="w-4 h-4" />
            {t('marketList.trending')}
          </button>
          <button 
             onClick={() => applyPreset('new')}
             className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               sortBy === 'createdAt' ? "text-fg-primary border-fg-primary" : "text-fg-secondary border-transparent hover:text-fg-primary"
            )}
          >
            {t('marketList.newEvents')}
          </button>
          <button 
             onClick={() => applyPreset('ending')}
             className={clsx(
              "flex items-center gap-2 text-sm font-medium whitespace-nowrap pb-2 md:pb-0 border-b-2 md:border-b-0 transition-colors",
               sortBy === 'endDate' ? "text-fg-primary border-fg-primary" : "text-fg-secondary border-transparent hover:text-fg-primary"
            )}
          >
            {t('marketList.endingSoon')}
          </button>
          
          <div className="h-4 w-px bg-border-strong hidden md:block mx-2" />
          
          {/* Categories */}
          <div className="flex items-center gap-4">
             {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={clsx(
                        "text-sm transition-colors whitespace-nowrap",
                        activeCategory === cat ? "text-fg-primary font-medium" : "text-fg-secondary hover:text-fg-primary"
                    )}
                >
                    {cat}
                </button>
             ))}
          </div>
        </div>

        {/* Right: Search */}
        <div className="w-full md:w-auto relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-secondary" />
           <input 
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 bg-surface border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-strong transition-colors"
           />
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[500px]">
        {/* Table Header (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-medium text-fg-muted uppercase tracking-wider">
           <div className="col-span-6">{t('marketList.event')}</div>
           <button
             type="button"
             onClick={() => toggleSort('volume24h')}
             className="col-span-2 flex items-center justify-end gap-1 hover:text-fg-secondary transition-colors"
           >
             <span>{t('marketList.vol24h')}</span>
             {sortBy === 'volume24h' ? (
               <SortIcon className="w-3 h-3 text-fg-secondary" />
             ) : (
               <ArrowUpDown className="w-3 h-3 text-fg-muted" />
             )}
           </button>
           <button
             type="button"
             onClick={() => toggleSort('volume')}
             className="col-span-2 flex items-center justify-end gap-1 hover:text-fg-secondary transition-colors"
           >
             <span>{t('marketList.totalVol')}</span>
             {sortBy === 'volume' ? (
               <SortIcon className="w-3 h-3 text-fg-secondary" />
             ) : (
               <ArrowUpDown className="w-3 h-3 text-fg-muted" />
             )}
           </button>
           <button
             type="button"
             onClick={() => toggleSort('liquidity')}
             className="col-span-2 flex items-center justify-end gap-1 hover:text-fg-secondary transition-colors"
           >
             <span>{t('marketList.liquidity')}</span>
             {sortBy === 'liquidity' ? (
               <SortIcon className="w-3 h-3 text-fg-secondary" />
             ) : (
               <ArrowUpDown className="w-3 h-3 text-fg-muted" />
             )}
           </button>
        </div>

        {isLoading ? (
           <Loading size="lg" text={t('common.loading')} />
        ) : error ? (
           <ErrorMessage message={error.message || t('common.error')} onRetry={() => refetch()} />
        ) : events.length === 0 ? (
           // Placeholder for when no events are loaded yet
           <div className="text-center py-20">
              <div className="w-16 h-16 bg-elevated rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-fg-muted" />
              </div>
              <h3 className="text-fg-primary font-medium mb-2">{t('marketList.noMarkets')}</h3>
              <p className="text-fg-muted text-sm">{t('marketList.noMarketsDesc')}</p>
           </div>
        ) : (
           <div className="space-y-1">
              {events.map((event: EventSummary) => (
                  <MarketDataRow key={event.eventId} event={event} />
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;
