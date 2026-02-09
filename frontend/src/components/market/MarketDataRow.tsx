import { Link } from 'react-router-dom';
import type { EventSummary } from '@og-predict/shared';
import { clsx } from 'clsx';

interface MarketDataRowProps {
  event: EventSummary;
}

import { useTranslation } from 'react-i18next';

export function MarketDataRow({ event }: MarketDataRowProps) {
  const { t, i18n } = useTranslation();
  // Safe helpers for possibly undefined values
  const volume = event.volume || 0;
  const liquidity = event.liquidity || 0;
  const marketsCount = event.markets ? event.markets.length : 0;
  
  // Format numbers for clean display
  const formatMoney = (val: number) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const endTime = new Date(event.endDate).getTime();
  const isEndingSoon = Number.isFinite(endTime) && endTime - Date.now() < 86_400_000; // 24h

  return (
    <div className="group relative">
      <Link 
        to={`/market/${event.eventId}`}
        className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg hover:bg-surface/60 transition-colors border-b border-border/50 hover:border-transparent"
      >
        {/* Market Title & Icon */}
        <div className="col-span-12 md:col-span-6 flex gap-4">
          <div className="flex-shrink-0">
            {event.imageUrl || event.iconUrl ? (
              <img 
                src={event.imageUrl || event.iconUrl || ''} 
                alt={event.title} 
                className="w-10 h-10 rounded-full object-cover bg-elevated"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-fg-muted">
                ?
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-fg-primary font-medium leading-snug max-h-[2.6em] overflow-hidden group-hover:text-primary-400 transition-colors">
                {event.title}
              </h3>
              <span className="hidden sm:inline-flex flex-shrink-0 px-2 py-0.5 bg-elevated text-fg-secondary text-[11px] rounded border border-border-strong">
                {marketsCount} {t('marketList.markets')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-fg-secondary">
              {event.tags?.[0]?.label && (
                <span className="px-2 py-0.5 rounded-full bg-elevated text-fg-secondary border border-border-strong">
                  {event.tags[0].label}
                </span>
              )}
              {event.startDate && (
                <span>
                  {t('marketList.created')} {formatDate(event.startDate)}
                </span>
              )}
              {event.endDate && (
                <span className={clsx(isEndingSoon && 'text-orange-400')}>
                  {t('marketList.expires')} {formatDate(event.endDate)}
                </span>
              )}
              {isEndingSoon && (
                <span className="text-orange-400 hidden md:inline">
                  • {t('marketList.expiresSoon')}
                </span>
              )}
              {event.description && (
                <span className="hidden lg:inline text-fg-muted truncate">
                  • {event.description}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="col-span-4 md:col-span-2 text-right hidden md:block">
          <div className="text-fg-primary font-medium">{formatMoney(event.volume24h || 0)}</div>
        </div>

        {/* Total Volume */}
        <div className="col-span-4 md:col-span-2 text-right">
          <div className="text-fg-primary font-medium">{formatMoney(volume)}</div>
          <div className="text-fg-muted text-xs mt-0.5 md:hidden">{t('marketList.totalVol')}</div>
        </div>

        {/* Liquidity */}
        <div className="col-span-4 md:col-span-2 text-right hidden sm:block">
          <div className="text-fg-primary font-medium">{formatMoney(liquidity)}</div>
          <div className="text-fg-muted text-xs mt-0.5 md:hidden">{t('marketList.liquidity')}</div>
        </div>
      </Link>
      
      {/* Mobile-only markets count badge */}
        <div className="absolute top-4 right-4 md:hidden">
            <span className="px-2 py-0.5 bg-elevated text-fg-secondary text-[10px] rounded border border-border-strong">
                {marketsCount} {t('marketList.markets')}
            </span>
        </div>
    </div>
  );
}
