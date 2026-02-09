import { useParams, Link } from 'react-router-dom';
import { useEventDetail, useOrderBook, usePriceHistory } from '../hooks';
import { OrderBook, PriceChart } from '../components/market';
import { TradePanel } from '../components/trade';
import { AnalysisPanel } from '../components/ai';
import { Loading, ErrorMessage } from '../components/common';
import { ChevronLeft, ChevronDown, ChevronRight, Clock, BarChart2, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

/** Inline expanded panel for a selected sub-market */
function MarketExpandedPanel({
  eventId,
  marketId,
}: {
  eventId: string;
  marketId: string;
}) {
  const { t } = useTranslation();
  const { data: orderBookData, isLoading: obLoading } = useOrderBook(eventId, marketId);
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(eventId, marketId);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'chart'>('orderbook');

  return (
    <div className="mt-2 space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-strong pb-0">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('orderbook'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition ${
            activeTab === 'orderbook'
              ? 'bg-elevated text-fg-primary border-b-2 border-primary-500'
              : 'text-fg-muted hover:text-fg-secondary'
          }`}
        >
          {t('marketDetail.orderBook')}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('chart'); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition flex items-center gap-1 ${
            activeTab === 'chart'
              ? 'bg-elevated text-fg-primary border-b-2 border-primary-500'
              : 'text-fg-muted hover:text-fg-secondary'
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          {t('marketDetail.priceHistory')}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'orderbook' && (
        <OrderBook data={orderBookData?.data} isLoading={obLoading} />
      )}
      {activeTab === 'chart' && (
        <div className="min-h-[200px]">
          <PriceChart data={priceData?.data} isLoading={priceLoading} />
        </div>
      )}
    </div>
  );
}

export function MarketDetailPage() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const { data: eventData, isLoading, error } = useEventDetail(eventId);
  const event = eventData?.data;
  const [selectedMarketId, setSelectedMarketId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedMarketId(undefined);
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    if (selectedMarketId) return;
    if (event.markets?.length === 1) setSelectedMarketId(event.markets[0].marketId);
  }, [event, selectedMarketId]);

  const market = useMemo(() => {
    if (!event?.markets?.length) return undefined;
    return event.markets.find((m) => m.marketId === selectedMarketId);
  }, [event, selectedMarketId]);

  const { data: orderBookData, isLoading: obLoading } = useOrderBook(event?.eventId, market?.marketId);
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(event?.eventId, market?.marketId);

  if (isLoading) return <Loading text={t('common.loading')} />;
  if (error) return <ErrorMessage message={error.message || t('common.error')} />;
  if (!event) return <ErrorMessage message={t('marketDetail.marketUnavailable')} />;

  const volume = event.volume || 0;
  const liquidity = event.liquidity || 0;

  const formatMoney = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  const handleMarketClick = (marketId: string) => {
    setSelectedMarketId(selectedMarketId === marketId ? undefined : marketId);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm text-fg-secondary">
        <Link to="/" className="hover:text-fg-primary flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Markets
        </Link>
        <span>/</span>
        <span className="text-fg-primary truncate max-w-[200px]">{event.title}</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 border-b border-border pb-8">
        <div className="flex-1">
          <div className="flex items-start gap-4">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-16 h-16 rounded-lg object-cover bg-elevated"
              />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-fg-primary mb-3">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-fg-secondary">
                  <Clock className="w-4 h-4" />
                  <span>
                    {t('marketDetail.expires')} {new Date(event.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Rules Button */}
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-elevated text-fg-primary hover:bg-elevated/80 transition border border-border-strong">
            <Info className="w-4 h-4" />
            <span>{t('marketDetail.rules')}</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface/60 rounded-lg p-3 border border-border">
          <div className="text-xs text-fg-muted mb-1">{t('marketDetail.volume')}</div>
          <div className="text-lg font-medium text-fg-primary">{formatMoney(volume)}</div>
        </div>
        <div className="bg-surface/60 rounded-lg p-3 border border-border">
          <div className="text-xs text-fg-muted mb-1">{t('marketDetail.liquidity')}</div>
          <div className="text-lg font-medium text-fg-primary">{formatMoney(liquidity)}</div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Markets list with inline expansion */}
        <div className="lg:col-span-8 space-y-6">
          {/* Markets selector */}
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-fg-primary">
                {t('marketDetail.markets')}
                <span className="ml-2 text-xs text-fg-muted font-normal">
                  ({event.markets?.length || 0})
                </span>
              </h3>
              <div className="text-xs text-fg-muted">
                {market ? (
                  <span className="text-fg-secondary">{t('marketDetail.selected')}</span>
                ) : (
                  <span>{t('marketDetail.selectMarket')}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {(event.markets || []).map((m) => {
                const yes = parseFloat(m.outcomePrices?.[0] || '0');
                const no = parseFloat(m.outcomePrices?.[1] || '0');
                const selected = m.marketId === selectedMarketId;

                return (
                  <div
                    key={m.marketId}
                    className={`rounded-lg border transition ${
                      selected
                        ? 'bg-elevated border-primary-600/60'
                        : 'bg-surface border-border hover:bg-elevated/40 hover:border-border-strong'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleMarketClick(m.marketId)}
                      className="w-full flex items-start justify-between gap-3 px-3 py-2 text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-fg-primary leading-snug max-h-[2.6em] overflow-hidden">
                          {m.question}
                        </div>
                        <div className="mt-1 text-xs text-fg-muted">
                          {t('marketDetail.volume')}: {formatMoney(Number(m.volume || 0))}
                        </div>
                      </div>
                      <span className="mt-0.5 text-fg-muted">
                        {selected ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    </button>

                    {/* Expanded panel: order book + price chart */}
                    {selected && event.eventId && (
                      <div className="px-3 pb-3 border-t border-border/50">
                        <MarketExpandedPanel
                          eventId={event.eventId}
                          marketId={m.marketId}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border p-1 min-h-[400px]">
             {/* Chart Header */}
             <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                   <BarChart2 className="w-4 h-4 text-fg-secondary" />
                   <span className="text-sm font-medium text-fg-primary">{t('marketDetail.priceHistory')}</span>
                </div>
             </div>
             
             <div className="p-4">
                {market ? (
                  <PriceChart data={priceData?.data} isLoading={priceLoading} />
                ) : (
                  <div className="h-48 flex items-center justify-center text-fg-muted text-sm">
                    {t('marketDetail.selectMarketToView')}
                  </div>
                )}
             </div>
          </div>
          
           <div className="bg-surface rounded-xl border border-border p-1">
               <div className="p-4 border-b border-border/50">
                  <h3 className="text-sm font-medium text-fg-primary">{t('marketDetail.orderBook')}</h3>
               </div>
               <div className="p-4">
                 {market ? (
                   <OrderBook data={orderBookData?.data} isLoading={obLoading} />
                 ) : (
                   <div className="py-10 text-center text-sm text-fg-muted">
                     {t('marketDetail.selectMarketToView')}
                   </div>
                 )}
               </div>
           </div>
        </div>

        {/* Right Column (Trade, AI) - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            {market ? (
              <TradePanel
                marketId={market.marketId}
                yesPrice={parseFloat(market.outcomePrices?.[0] || '0')}
                noPrice={parseFloat(market.outcomePrices?.[1] || '0')}
              />
            ) : (
              <div className="bg-surface rounded-xl border border-border p-8 text-center text-fg-muted">
                {t('marketDetail.selectMarket')}
              </div>
            )}

            {market ? (
              <AnalysisPanel eventId={event.eventId} marketId={market.marketId} />
            ) : (
              <div className="bg-surface rounded-xl border border-border p-6 text-center text-fg-muted text-sm">
                {t('marketDetail.selectMarketToAnalyze')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
