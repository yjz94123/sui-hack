import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { EventSummary } from '@og-predict/shared';

interface MarketDataRowProps {
  event: EventSummary;
}

interface TagTone {
  bar: string;
  icon: string;
  pill: string;
  row: string;
  volume: string;
  liquidity: string;
}

function formatMoney(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function getInitials(input: string): string {
  return input
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function getTagTone(tag?: string): TagTone {
  const key = (tag || '').toLowerCase();

  if (key.includes('politic')) {
    return {
      bar: 'bg-rose-500/90 dark:bg-rose-400/90',
      icon: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
      pill: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200',
      row: 'from-rose-50/55 to-surface dark:from-rose-500/10 dark:to-surface',
      volume: 'text-rose-700 dark:text-rose-200',
      liquidity: 'text-rose-600 dark:text-rose-300',
    };
  }

  if (key.includes('crypto')) {
    return {
      bar: 'bg-violet-500/90 dark:bg-violet-400/90',
      icon: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
      pill: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200',
      row: 'from-violet-50/55 to-surface dark:from-violet-500/10 dark:to-surface',
      volume: 'text-violet-700 dark:text-violet-200',
      liquidity: 'text-violet-600 dark:text-violet-300',
    };
  }

  if (key.includes('finance')) {
    return {
      bar: 'bg-sky-500/90 dark:bg-sky-400/90',
      icon: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
      pill: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200',
      row: 'from-sky-50/60 to-surface dark:from-sky-500/10 dark:to-surface',
      volume: 'text-sky-700 dark:text-sky-200',
      liquidity: 'text-sky-600 dark:text-sky-300',
    };
  }

  if (key.includes('geo')) {
    return {
      bar: 'bg-amber-500/90 dark:bg-amber-400/90',
      icon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
      pill: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200',
      row: 'from-amber-50/65 to-surface dark:from-amber-500/10 dark:to-surface',
      volume: 'text-amber-700 dark:text-amber-200',
      liquidity: 'text-amber-600 dark:text-amber-300',
    };
  }

  if (key.includes('tech')) {
    return {
      bar: 'bg-teal-500/90 dark:bg-teal-400/90',
      icon: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200',
      pill: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-500/15 dark:text-teal-200',
      row: 'from-teal-50/58 to-surface dark:from-teal-500/10 dark:to-surface',
      volume: 'text-teal-700 dark:text-teal-200',
      liquidity: 'text-teal-600 dark:text-teal-300',
    };
  }

  if (key.includes('world')) {
    return {
      bar: 'bg-indigo-500/90 dark:bg-indigo-400/90',
      icon: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
      pill: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-200',
      row: 'from-indigo-50/58 to-surface dark:from-indigo-500/10 dark:to-surface',
      volume: 'text-indigo-700 dark:text-indigo-200',
      liquidity: 'text-indigo-600 dark:text-indigo-300',
    };
  }

  return {
    bar: 'bg-accent/85',
    icon: 'bg-accent-soft text-accent',
    pill: 'border-accent/25 bg-accent-soft text-accent',
    row: 'from-accent-soft/35 to-surface dark:from-accent-soft/20 dark:to-surface',
    volume: 'text-accent',
    liquidity: 'text-fg-secondary',
  };
}

export function MarketDataRow({ event }: MarketDataRowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const endTime = new Date(event.endDate).getTime();
  const isEndingSoon = Number.isFinite(endTime) && endTime - Date.now() < 86_400_000;
  const marketsCount = event.markets?.length ?? 0;
  const primaryTag = event.tags?.[0]?.label;
  const tone = getTagTone(primaryTag);

  return (
    <Link
      to={`/market/${event.eventId}`}
      className={clsx(
        'group grid grid-cols-1 gap-4 rounded-2xl border border-border/85 bg-gradient-to-r px-4 py-4 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft md:grid-cols-12 md:items-center md:gap-5',
        tone.row
      )}
    >
      <div className="md:col-span-6">
        <div className="flex items-start gap-3">
          <div className={clsx('mt-0.5 h-11 w-1 shrink-0 rounded-full', tone.bar)} />

          <div className={clsx('mt-0.5 grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border', tone.icon)}>
            {event.imageUrl || event.iconUrl ? (
              <img
                src={event.imageUrl || event.iconUrl || ''}
                alt={event.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="text-xs font-semibold tracking-wide">{getInitials(event.title) || 'EV'}</div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {primaryTag && <span className={clsx('app-pill text-[11px] font-semibold', tone.pill)}>{primaryTag}</span>}
              <span className="app-pill bg-surface/80 text-[11px] text-fg-muted">
                {marketsCount} {t('marketList.markets')}
              </span>
            </div>

            <h3 className="max-h-[2.8em] overflow-hidden text-[15px] font-semibold leading-snug text-fg-primary transition group-hover:text-accent">
              {event.title}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              <span>
                {t('marketList.created')} {formatDate(event.startDate)}
              </span>
              <span className={clsx('inline-flex items-center gap-1', isEndingSoon && 'font-medium text-danger')}>
                {t('marketList.expires')} {formatDate(event.endDate)}
                {isEndingSoon && <span>• {t('marketList.expiresSoon')}</span>}
              </span>
            </div>

            {event.description && <p className="max-h-[1.5em] overflow-hidden text-xs text-fg-muted">{event.description}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:col-span-6 md:contents">
        <div className="app-stat border-border-strong/65 bg-surface/92 md:col-span-2 md:text-right">
          <div className="text-[11px] uppercase tracking-wide text-fg-muted md:hidden">{t('marketList.vol24h')}</div>
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary md:text-[17px]">{formatMoney(event.volume24h || 0)}</div>
        </div>

        <div className="app-stat border-border-strong/65 bg-surface/92 md:col-span-2 md:text-right">
          <div className="text-[11px] uppercase tracking-wide text-fg-muted md:hidden">{t('marketList.totalVol')}</div>
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary md:text-[17px]">{formatMoney(event.volume || 0)}</div>
        </div>

        <div className="app-stat border-border-strong/65 bg-surface/92 md:col-span-2 md:text-right">
          <div className="text-[11px] uppercase tracking-wide text-fg-muted md:hidden">{t('marketList.liquidity')}</div>
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary md:text-[17px]">{formatMoney(event.liquidity || 0)}</div>
        </div>
      </div>
    </Link>
  );
}
