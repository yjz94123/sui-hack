import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, ChevronLeft, ChevronRight, Clock, Info, Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEventDetail, useOrderBook, usePriceHistory } from '../hooks';
import { OrderBook, PriceChart } from '../components/market';
import { TradePanel } from '../components/trade';
import { AnalysisPanel } from '../components/ai';
import { Loading, ErrorMessage } from '../components/common';

function formatMoney(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(value: string | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function parsePrice(input: string | undefined): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}

export function MarketDetailPage() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();

  const { data: eventData, isLoading, error } = useEventDetail(eventId);
  const event = eventData?.data;
  const [selectedMarketId, setSelectedMarketId] = useState<string | undefined>();

  useEffect(() => {
    setSelectedMarketId(undefined);
  }, [eventId]);

  useEffect(() => {
    if (!event?.markets?.length) return;
    if (selectedMarketId) return;
    setSelectedMarketId(event.markets[0].marketId);
  }, [event, selectedMarketId]);

  const markets = event?.markets ?? [];

  const market = useMemo(() => {
    if (!markets.length) return undefined;
    return markets.find((item) => item.marketId === selectedMarketId) ?? markets[0];
  }, [markets, selectedMarketId]);

  const { data: orderBookData, isLoading: orderBookLoading } = useOrderBook(event?.eventId, market?.marketId);
  const { data: priceData, isLoading: priceLoading } = usePriceHistory(event?.eventId, market?.marketId);

  // BAS analysis result state (lifted from AnalysisPanel)
  const [basResult, setBasResult] = useState<{
    bas: number;
    posterior: number;
    fairLow: number;
    fairHigh: number;
  } | null>(null);

  // Reset BAS when market changes
  useEffect(() => {
    setBasResult(null);
  }, [selectedMarketId]);

  const handleAnalysisResult = useCallback((result: unknown) => {
    if (!result || typeof result !== 'object') return;
    const r = result as Record<string, unknown>;
    const bas = typeof r.bet_attractiveness_score === 'number' ? r.bet_attractiveness_score : undefined;
    const posterior = typeof r.posterior_probability === 'number' ? r.posterior_probability : undefined;
    const band = r.fair_probability_band;
    const fairLow = band && typeof band === 'object' ? (band as any).low : undefined;
    const fairHigh = band && typeof band === 'object' ? (band as any).high : undefined;
    if (typeof bas === 'number' && typeof posterior === 'number') {
      setBasResult({
        bas,
        posterior,
        fairLow: typeof fairLow === 'number' ? fairLow : 0,
        fairHigh: typeof fairHigh === 'number' ? fairHigh : 1,
      });
    }
  }, []);

  if (isLoading) return <Loading text={t('common.loading')} />;
  if (error) return <ErrorMessage message={error.message || t('common.error')} />;
  if (!event) return <ErrorMessage message={t('marketDetail.marketUnavailable')} />;

  const yesPrice = parsePrice(market?.outcomePrices?.[0]);
  const noPrice = parsePrice(market?.outcomePrices?.[1]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 text-sm text-fg-secondary">
        <Link to="/" className="inline-flex items-center gap-1 transition hover:text-fg-primary">
          <ChevronLeft className="h-4 w-4" />
          {t('nav.explorer')}
        </Link>
        <span>/</span>
        <span className="truncate text-fg-primary">{event.title}</span>
      </div>

      <section className="app-panel px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-elevated">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-semibold tracking-[0.2em] text-fg-muted">
                    EV
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-fg-primary sm:text-[2rem]">{event.title}</h1>
                {event.description && <p className="max-w-3xl text-sm text-fg-secondary">{event.description}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  {(event.tags ?? []).map((tag) => (
                    <span key={tag.slug} className="app-pill text-[11px]">
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="app-btn-secondary h-10 shrink-0 gap-2 px-3">
            <Info className="h-4 w-4" />
            <span>{t('marketDetail.rules')}</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="app-stat">
            <div className="text-[11px] uppercase tracking-wide text-fg-muted">{t('marketDetail.volume')}</div>
            <div className="mt-1 text-lg font-semibold text-fg-primary">{formatMoney(event.volume || 0)}</div>
          </div>
          <div className="app-stat">
            <div className="text-[11px] uppercase tracking-wide text-fg-muted">{t('marketDetail.liquidity')}</div>
            <div className="mt-1 text-lg font-semibold text-fg-primary">{formatMoney(event.liquidity || 0)}</div>
          </div>
          <div className="app-stat">
            <div className="text-[11px] uppercase tracking-wide text-fg-muted">{t('marketDetail.expires')}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-fg-primary">
              <Clock className="h-3.5 w-3.5 text-fg-muted" />
              {formatDate(event.endDate)}
            </div>
          </div>
          <div className="app-stat">
            <div className="text-[11px] uppercase tracking-wide text-fg-muted">{t('marketDetail.markets')}</div>
            <div className="mt-1 text-lg font-semibold text-fg-primary">{markets.length}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-8">
          <div className="app-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {t('marketDetail.markets')}
              </h2>
              {market && (
                <span className="rounded-full border border-border bg-elevated px-2.5 py-1 text-xs text-fg-secondary">
                  {t('marketDetail.selected')}
                </span>
              )}
            </div>

            {markets.length === 0 ? (
              <div className="app-muted-panel px-4 py-8 text-center text-sm text-fg-muted">
                {t('marketDetail.marketUnavailable')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {markets.map((item) => {
                  const selected = item.marketId === market?.marketId;
                  const yes = parsePrice(item.outcomePrices?.[0]);
                  const no = parsePrice(item.outcomePrices?.[1]);

                  return (
                    <button
                      key={item.marketId}
                      type="button"
                      onClick={() => setSelectedMarketId(item.marketId)}
                      className={
                        selected
                          ? 'w-full rounded-xl border border-accent/35 bg-accent-soft/70 p-3 text-left transition'
                          : 'w-full rounded-xl border border-border bg-surface p-3 text-left transition hover:border-border-strong hover:bg-elevated/45'
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg-primary">{item.question}</p>
                          <p className="mt-1 text-xs text-fg-muted">
                            {t('marketDetail.volume')}: {formatMoney(Number(item.volume || 0))}
                          </p>
                        </div>
                        <ChevronRight className={selected ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-fg-muted'} />
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 font-medium text-success">
                          Yes {(yes * 100).toFixed(1)}¢
                        </span>
                        <span className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1 font-medium text-danger">
                          No {(no * 100).toFixed(1)}¢
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="app-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-fg-secondary" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">{t('marketDetail.priceHistory')}</h2>
              </div>
              {market && <span className="text-xs text-fg-muted">{market.question}</span>}
            </div>

            {market ? (
              <PriceChart data={priceData?.data} isLoading={priceLoading} />
            ) : (
              <div className="app-muted-panel px-4 py-10 text-center text-sm text-fg-muted">
                {t('marketDetail.selectMarketToView')}
              </div>
            )}
          </div>

          <div className="app-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-fg-secondary" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">{t('marketDetail.orderBook')}</h2>
            </div>

            {market ? (
              <OrderBook data={orderBookData?.data} isLoading={orderBookLoading} />
            ) : (
              <div className="app-muted-panel px-4 py-10 text-center text-sm text-fg-muted">
                {t('marketDetail.selectMarketToView')}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-4">
          <div className="space-y-5 lg:sticky lg:top-24">
            {market ? (
              <TradePanel marketId={market.marketId} yesPrice={yesPrice} noPrice={noPrice} basResult={basResult} />
            ) : (
              <div className="app-panel px-5 py-8 text-center text-sm text-fg-muted">{t('marketDetail.selectMarket')}</div>
            )}

            {market ? (
              <AnalysisPanel eventId={event.eventId} marketId={market.marketId} onResult={handleAnalysisResult} />
            ) : (
              <div className="app-panel px-5 py-8 text-center text-sm text-fg-muted">
                {t('marketDetail.selectMarketToAnalyze')}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
