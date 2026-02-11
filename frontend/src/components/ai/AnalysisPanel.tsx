import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Loader2,
  Play,
  Sparkles,
  Square,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import GaugeComponent from 'react-gauge-component';
import { Loading } from '../common';
import { streamAnalysis, type AnalysisStreamMessage } from '../../api/markets';

interface AnalysisPanelProps {
  eventId: string;
  marketId: string;
}

interface Recommendation {
  badge: string;
  headline: string;
  detail: string;
  panelClass: string;
  badgeClass: string;
}

interface CompactMetric {
  id: string;
  label: string;
  shortValue: string;
  detail: string;
  progress: number;
  barClass: string;
}

const TIMELINE_TOTAL_MS = 60_000;
const TIMELINE_HOLD_ON_LAST_TASK = 0.1;
const TIMELINE_FINISH_AFTER_DONE_MS = 900;

function keepLastLines(text: string, maxLines = 12): string {
  const lines = text.split(/\r?\n/);
  return lines.slice(-maxLines).join('\n').trimEnd();
}

function extractLastJsonCodeBlock(text: string): unknown | null {
  const re = /```json\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = re.exec(text)) !== null) last = match;
  if (!last) return null;

  const jsonText = last[1]?.trim() ?? '';
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useAnimatedNumber(target: number | undefined, active: boolean, duration = 780): number | undefined {
  const [displayValue, setDisplayValue] = useState<number | undefined>(target);

  useEffect(() => {
    if (target === undefined) {
      setDisplayValue(undefined);
      return;
    }

    if (!active) {
      setDisplayValue(0);
      return;
    }

    const start = performance.now();
    const from = 0;
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(from + (target - from) * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active, duration, target]);

  return displayValue;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMaybe(value: number | undefined, formatter: (v: number) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return formatter(value);
}

function buildRecommendation(
  t: TFunction,
  bas: number | undefined,
  posterior: number | undefined,
  fairLow: number | undefined,
  fairHigh: number | undefined
): Recommendation {
  const direction = typeof posterior === 'number' && posterior < 0.5 ? t('ai.directionNo') : t('ai.directionYes');
  const fairLowText = typeof fairLow === 'number' ? `${(fairLow * 100).toFixed(1)}%` : '--';
  const fairHighText = typeof fairHigh === 'number' ? `${(fairHigh * 100).toFixed(1)}%` : '--';

  if (typeof bas !== 'number') {
    return {
      badge: t('ai.recommendations.waiting.badge'),
      headline: t('ai.recommendations.waiting.headline'),
      detail: t('ai.recommendations.waiting.detail'),
      panelClass: 'border-border-strong/70 bg-surface/95',
      badgeClass: 'bg-elevated text-fg-secondary',
    };
  }

  if (bas >= 70) {
    return {
      badge: t('ai.recommendations.highEdge.badge'),
      headline: t('ai.recommendations.highEdge.headline', { direction }),
      detail: t('ai.recommendations.highEdge.detail', {
        bas: bas.toFixed(0),
        fairLowText,
        fairHighText,
      }),
      panelClass: 'border-success/35 bg-success/10',
      badgeClass: 'bg-success/20 text-success',
    };
  }

  if (bas >= 55) {
    return {
      badge: t('ai.recommendations.conditional.badge'),
      headline: t('ai.recommendations.conditional.headline', { direction }),
      detail: t('ai.recommendations.conditional.detail', {
        bas: bas.toFixed(0),
        fairLowText,
        fairHighText,
        directionYes: t('ai.directionYes'),
        directionNo: t('ai.directionNo'),
      }),
      panelClass: 'border-accent/35 bg-accent-soft/70',
      badgeClass: 'bg-accent/15 text-accent',
    };
  }

  if (bas >= 40) {
    return {
      badge: t('ai.recommendations.lowConviction.badge'),
      headline: t('ai.recommendations.lowConviction.headline'),
      detail: t('ai.recommendations.lowConviction.detail', {
        bas: bas.toFixed(0),
        direction,
      }),
      panelClass: 'border-amber-400/35 bg-amber-100/45 dark:bg-amber-500/10 dark:border-amber-400/40',
      badgeClass: 'bg-amber-400/20 text-amber-600 dark:text-amber-300',
    };
  }

  return {
    badge: t('ai.recommendations.avoid.badge'),
    headline: t('ai.recommendations.avoid.headline'),
    detail: t('ai.recommendations.avoid.detail', {
      bas: bas.toFixed(0),
      direction,
    }),
    panelClass: 'border-danger/35 bg-danger/10',
    badgeClass: 'bg-danger/15 text-danger',
  };
}

export function AnalysisPanel({ eventId, marketId }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [streamDoneAt, setStreamDoneAt] = useState<number | null>(null);
  const [timelineNow, setTimelineNow] = useState(() => Date.now());
  const [taskId, setTaskId] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fullOutputRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const streamViewportRef = useRef<HTMLDivElement | null>(null);

  const resetRevealTimer = () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      resetRevealTimer();
    };
  }, []);

  useEffect(() => {
    const viewport = streamViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [output, isRunning]);

  useEffect(() => {
    if (!isRunning && !isSettling) return;
    const timer = window.setInterval(() => {
      setTimelineNow(Date.now());
    }, 120);

    return () => window.clearInterval(timer);
  }, [isRunning, isSettling]);

  const handleMessage = (msg: AnalysisStreamMessage) => {
    if (msg.type === 'task') {
      setTaskId(msg.taskId);
      return;
    }

    if (msg.type === 'delta') {
      fullOutputRef.current += msg.content;
      setOutput(keepLastLines(fullOutputRef.current, 80));
      return;
    }

    if (msg.type === 'done') {
      const doneAt = Date.now();
      const parsed = msg.result ?? extractLastJsonCodeBlock(fullOutputRef.current);
      const revealDelayMs = TIMELINE_FINISH_AFTER_DONE_MS;

      setResult(parsed);
      setStreamDoneAt(doneAt);
      setTimelineNow(doneAt);
      setIsRunning(false);
      setIsSettling(true);
      setShowResult(false);
      abortRef.current = null;
      resetRevealTimer();
      revealTimerRef.current = setTimeout(() => {
        setIsSettling(false);
        setShowResult(true);
      }, revealDelayMs);
      return;
    }

    if (msg.type === 'error') {
      resetRevealTimer();
      setError(msg.message);
      setIsRunning(false);
      setIsSettling(false);
      setShowResult(false);
      runStartedAtRef.current = null;
      setRunStartedAt(null);
      setStreamDoneAt(null);
      abortRef.current = null;
    }
  };

  const start = async () => {
    if (isRunning) return;

    const startedAt = Date.now();
    resetRevealTimer();
    setIsRunning(true);
    setIsSettling(false);
    setShowResult(false);
    runStartedAtRef.current = startedAt;
    setRunStartedAt(startedAt);
    setStreamDoneAt(null);
    setTimelineNow(startedAt);
    setTaskId(null);
    setOutput('');
    setResult(null);
    setError(null);
    fullOutputRef.current = '';

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAnalysis(eventId, marketId, undefined, {
        signal: controller.signal,
        onMessage: handleMessage,
      });
    } catch (streamError) {
      if (controller.signal.aborted) return;
      resetRevealTimer();
      setError(streamError instanceof Error ? streamError.message : String(streamError));
      setIsRunning(false);
      setIsSettling(false);
      setShowResult(false);
      runStartedAtRef.current = null;
      setRunStartedAt(null);
      setStreamDoneAt(null);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    resetRevealTimer();
    setIsRunning(false);
    setIsSettling(false);
    setShowResult(false);
    runStartedAtRef.current = null;
    setRunStartedAt(null);
    setStreamDoneAt(null);
  };

  const r = isRecord(result) ? result : {};
  const fairBand = isRecord(r.fair_probability_band) ? r.fair_probability_band : undefined;
  const evidenceSummary = isRecord(r.evidence_summary) ? r.evidence_summary : undefined;
  const riskFactors = isRecord(r.risk_factors) ? r.risk_factors : undefined;
  const formula = isRecord(r.formula) ? r.formula : undefined;

  const bas = readNumber(r, 'bet_attractiveness_score');
  const prior = readNumber(r, 'prior_probability');
  const posterior = readNumber(r, 'posterior_probability');
  const confidence = readNumber(r, 'confidence');
  const fairLow = fairBand ? readNumber(fairBand, 'low') : undefined;
  const fairHigh = fairBand ? readNumber(fairBand, 'high') : undefined;

  const evidenceCount = evidenceSummary ? readNumber(evidenceSummary, 'count') : undefined;
  const evidenceSignal = evidenceSummary ? readNumber(evidenceSummary, 'net_signal') : undefined;
  const evidenceWeight = evidenceSummary ? readNumber(evidenceSummary, 'total_weight') : undefined;

  const riskResolution = riskFactors ? readNumber(riskFactors, 'resolution') : undefined;
  const riskTime = riskFactors ? readNumber(riskFactors, 'time') : undefined;
  const riskTail = riskFactors ? readNumber(riskFactors, 'tail') : undefined;

  const eventText = readString(r, 'event');
  const formulaPosterior = formula ? readString(formula, 'posterior_probability') : undefined;
  const formulaBas = formula ? readString(formula, 'bas') : undefined;

  const riskComposite =
    typeof riskResolution === 'number' &&
    typeof riskTime === 'number' &&
    typeof riskTail === 'number'
      ? 0.5 * riskResolution + 0.3 * riskTime + 0.2 * riskTail
      : undefined;

  const animatedBas = useAnimatedNumber(bas, showResult, 980);
  const animatedPosterior = useAnimatedNumber(posterior, showResult, 880);
  const animatedPrior = useAnimatedNumber(prior, showResult, 880);
  const animatedConfidence = useAnimatedNumber(confidence, showResult, 960);
  const animatedRisk = useAnimatedNumber(riskComposite, showResult, 920);

  const streamLines = output ? output.split(/\r?\n/).filter(Boolean) : [];

  const reasoningTasks = useMemo(
    () => [
      {
        key: 'scope',
        title: t('ai.reasoning.scope.title'),
        detail: t('ai.reasoning.scope.detail'),
      },
      {
        key: 'signals',
        title: t('ai.reasoning.signals.title'),
        detail: t('ai.reasoning.signals.detail'),
      },
      {
        key: 'weights',
        title: t('ai.reasoning.weights.title'),
        detail: t('ai.reasoning.weights.detail'),
      },
      {
        key: 'posterior',
        title: t('ai.reasoning.posterior.title'),
        detail: t('ai.reasoning.posterior.detail'),
      },
      {
        key: 'bas',
        title: t('ai.reasoning.bas.title'),
        detail: t('ai.reasoning.bas.detail'),
      },
    ],
    [t]
  );

  const timelineHoldProgress = reasoningTasks.length - 1 + TIMELINE_HOLD_ON_LAST_TASK;
  const elapsedSinceStartMs = runStartedAt ? Math.max(0, timelineNow - runStartedAt) : 0;
  const runningTimelineProgress = clamp(
    (elapsedSinceStartMs / TIMELINE_TOTAL_MS) * timelineHoldProgress,
    0,
    timelineHoldProgress
  );

  const progressAtDone =
    runStartedAt && streamDoneAt
      ? clamp(((streamDoneAt - runStartedAt) / TIMELINE_TOTAL_MS) * timelineHoldProgress, 0, timelineHoldProgress)
      : runningTimelineProgress;

  const settleDurationMs = TIMELINE_FINISH_AFTER_DONE_MS;

  const settleElapsedMs = streamDoneAt ? Math.max(0, timelineNow - streamDoneAt) : 0;
  const settlingTimelineProgress =
    progressAtDone +
    (reasoningTasks.length - progressAtDone) *
      clamp(settleElapsedMs / Math.max(1, settleDurationMs), 0, 1);

  const taskProgress = showResult
    ? reasoningTasks.length
    : isSettling
      ? settlingTimelineProgress
      : isRunning
        ? runningTimelineProgress
        : 0;

  const recommendation = buildRecommendation(t, bas, posterior, fairLow, fairHigh);
  const basDial = typeof animatedBas === 'number' ? clamp(animatedBas, 0, 100) : 0;

  const compactMetrics = useMemo<CompactMetric[]>(() => {
    const fairBandText =
      typeof fairLow === 'number' && typeof fairHigh === 'number'
        ? `${formatPct(fairLow)} - ${formatPct(fairHigh)}`
        : '--';

    return [
      {
        id: 'prior',
        label: t('ai.priorProbability'),
        shortValue: formatMaybe(animatedPrior, (value) => formatPct(value)),
        detail: t('ai.metricDetails.prior'),
        progress: typeof prior === 'number' ? prior : 0,
        barClass: 'bg-violet-500/70 dark:bg-violet-400/80',
      },
      {
        id: 'confidence',
        label: t('ai.confidence'),
        shortValue: formatMaybe(animatedConfidence, (value) => value.toFixed(3)),
        detail: t('ai.metricDetails.confidence'),
        progress: typeof confidence === 'number' ? confidence : 0,
        barClass: 'bg-accent/80',
      },
      {
        id: 'risk',
        label: t('ai.compositeRisk'),
        shortValue: formatMaybe(animatedRisk, (value) => value.toFixed(3)),
        detail: t('ai.metricDetails.risk'),
        progress: typeof riskComposite === 'number' ? riskComposite : 0,
        barClass: 'bg-amber-500/75 dark:bg-amber-400/85',
      },
      {
        id: 'fair',
        label: t('ai.fairBand'),
        shortValue: fairBandText,
        detail: t('ai.metricDetails.fairBand'),
        progress:
          typeof fairLow === 'number' && typeof fairHigh === 'number'
            ? clamp((fairLow + fairHigh) / 2, 0, 1)
            : 0,
        barClass: 'bg-success/80',
      },
      {
        id: 'evidence-count',
        label: t('ai.evidenceCount'),
        shortValue: typeof evidenceCount === 'number' ? evidenceCount.toFixed(0) : '--',
        detail: t('ai.metricDetails.evidenceCount'),
        progress: typeof evidenceCount === 'number' ? clamp(evidenceCount / 10, 0, 1) : 0,
        barClass: 'bg-fuchsia-500/70 dark:bg-fuchsia-400/80',
      },
      {
        id: 'evidence-weight',
        label: t('ai.evidenceTotalWeight'),
        shortValue: typeof evidenceWeight === 'number' ? evidenceWeight.toFixed(3) : '--',
        detail: t('ai.metricDetails.evidenceWeight'),
        progress: typeof evidenceWeight === 'number' ? clamp(evidenceWeight / 3, 0, 1) : 0,
        barClass: 'bg-sky-500/75 dark:bg-sky-400/85',
      },
    ];
  }, [
    animatedConfidence,
    animatedPrior,
    confidence,
    evidenceCount,
    evidenceWeight,
    fairHigh,
    fairLow,
    prior,
    riskComposite,
    t,
  ]);

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold tracking-tight text-fg-primary">{t('ai.analysisTitle')}</h3>
          </div>
          <p className="text-xs text-fg-muted">
            {t('ai.sourceNetwork')}
          </p>
          {taskId && <p className="mt-1 text-[11px] text-fg-muted">{t('ai.taskLabel', { taskId })}</p>}
        </div>

        {isRunning ? (
          <button onClick={stop} className="app-btn-secondary h-9 gap-1.5 px-3 text-xs">
            <Square className="h-3.5 w-3.5" />
            {t('ai.stop')}
          </button>
        ) : (
          <button onClick={start} className="app-btn-primary h-9 gap-1.5 px-3 text-xs font-semibold">
            <Play className="h-3.5 w-3.5" />
            {t('ai.run')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-xl border border-border-strong/55 bg-elevated/75">
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-fg-muted">{t('ai.latest3Lines')}</div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-fg-secondary">
              <span
                className={clsx(
                  'h-1.5 w-1.5 rounded-full',
                  isRunning
                    ? 'animate-pulse bg-accent'
                    : isSettling
                      ? 'animate-pulse bg-amber-400'
                      : showResult
                        ? 'bg-success'
                        : 'bg-fg-muted'
                )}
              />
              {isRunning ? t('ai.running') : isSettling ? t('ai.statusAssembling') : showResult ? t('ai.statusReady') : t('ai.statusIdle')}
            </div>
          </div>

          <div
            ref={streamViewportRef}
            className="relative h-[3.75rem] overflow-y-auto px-3 py-0 font-mono text-xs leading-5 scrollbar-hide"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(10,132,255,0.08),transparent_60%)]" />
            <div className="relative space-y-0.5 pr-2">
              {streamLines.length > 0 ? (
                streamLines.map((line, index) => {
                  const isLastLine = index === streamLines.length - 1;
                  return (
                    <p
                      key={`${index}-${line.slice(0, 20)}`}
                      className={clsx(
                        'truncate transition-colors duration-300',
                        isLastLine ? 'text-fg-primary' : 'text-fg-secondary'
                      )}
                    >
                      {line}
                    </p>
                  );
                })
              ) : (
                <p className="text-fg-muted">{isRunning ? t('ai.running') : t('ai.noOutput')}</p>
              )}
              {isRunning && <span className="inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/85 bg-surface/90 p-3">
          <div className={clsx('flex items-center justify-between', showResult ? 'mb-0' : 'mb-2')}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{t('ai.timelineTitle')}</p>
            <p className="text-[11px] text-fg-muted">
              {showResult
                ? t('ai.timelineStatus.completed')
                : isSettling
                  ? t('ai.timelineStatus.finalizing')
                  : isRunning
                    ? t('ai.timelineStatus.running')
                    : t('ai.timelineStatus.waiting')}
            </p>
          </div>

          {!showResult && (
            <div className="space-y-2">
              {reasoningTasks.map((task, index) => {
                const done = taskProgress >= index + 1;
                const active = !done && taskProgress > index;
                const fill = done ? 100 : active ? clamp((taskProgress - index) * 100, 12, 96) : 0;

                return (
                  <div
                    key={task.key}
                    className={clsx(
                      'rounded-lg border px-2.5 py-2 transition-all duration-500',
                      done
                        ? 'border-success/30 bg-success/10'
                        : active
                          ? 'border-accent/30 bg-accent-soft/60'
                          : 'border-border/80 bg-elevated/55'
                    )}
                    style={{ transitionDelay: `${index * 45}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      ) : (
                        <CircleDashed className="h-3.5 w-3.5 text-fg-muted" />
                      )}
                      <span className={clsx('text-xs font-medium', done || active ? 'text-fg-primary' : 'text-fg-secondary')}>
                        {task.title}
                      </span>
                      <span className="ml-auto text-[10px] text-fg-muted">
                        {done ? t('ai.taskStatus.done') : active ? t('ai.taskStatus.inProgress') : t('ai.taskStatus.queued')}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-fg-secondary">{task.detail}</p>
                    <div className="mt-2 h-1 rounded-full bg-elevated">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-500', done ? 'bg-success' : active ? 'bg-accent' : 'bg-border')}
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isRunning && (
          <div className="rounded-lg border border-border/80 bg-elevated/55 px-3 py-2">
            <Loading size="sm" text={t('ai.running')} />
          </div>
        )}

        {isSettling && (
          <div className="space-y-2 rounded-xl border border-border/75 bg-surface/92 p-3">
            <p className="text-xs text-fg-secondary">{t('ai.mappingMetrics')}</p>
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border bg-elevated/80 p-3">
                  <div className="h-3 w-20 rounded bg-border/80" />
                  <div className="mt-3 h-6 w-14 rounded bg-border/80" />
                </div>
              ))}
            </div>
          </div>
        )}

        {result !== null && (
          <div
            className={clsx(
              'space-y-3 transition-all duration-500',
              showResult ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            )}
          >
            <div className="space-y-3">
              <div className="group rounded-2xl border border-accent/28 bg-gradient-to-br from-accent-soft/75 via-surface to-surface p-4 transition-all duration-500 hover:border-accent/45 hover:from-accent-soft/90 hover:shadow-[0_18px_40px_rgba(10,132,255,0.18)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{t('ai.bas')}</div>
                    <div className="mt-1 flex items-end gap-1 text-fg-primary">
                      <span className="text-[2.1rem] font-semibold tracking-[-0.02em]">
                        {formatMaybe(animatedBas, (value) => value.toFixed(0))}
                      </span>
                      <span className="mb-1 text-sm font-medium text-fg-muted">/ 100</span>
                    </div>
                  </div>
                  <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-semibold', recommendation.badgeClass)}>
                    {recommendation.badge}
                  </span>
                </div>

                <div className="relative mt-3 h-[80px] overflow-hidden rounded-xl border border-border/70 bg-surface/72 transition-[height] duration-500 ease-out group-hover:h-[256px]">
                  <div className="absolute inset-0 px-3 py-3 transition-all duration-500 group-hover:-translate-y-2 group-hover:opacity-0">
                    <p className="text-sm font-medium text-fg-primary">{recommendation.headline}</p>
                    <div className="mt-2 h-2 rounded-full bg-elevated/90">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent/75 via-accent to-success/85 transition-all duration-700"
                        style={{ width: `${Math.max(6, basDial)}%` }}
                      />
                    </div>
                  </div>

                  <div className="absolute inset-0 translate-y-5 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="flex h-full flex-col items-center px-3 py-3 text-center">
                      <div className="relative w-full max-w-[360px]">
                        <GaugeComponent
                          type="semicircle"
                          minValue={0}
                          maxValue={100}
                          value={basDial}
                          marginInPercent={{ top: 0.06, bottom: 0, left: 0.08, right: 0.08 }}
                          arc={{
                            width: 0.22,
                            cornerRadius: 8,
                            padding: 0.008,
                            subArcs: [
                              { limit: 35, color: 'rgb(var(--color-danger) / 0.72)' },
                              { limit: 55, color: 'rgb(245 158 11 / 0.82)' },
                              { limit: 75, color: 'rgb(var(--color-accent) / 0.78)' },
                              { limit: 100, color: 'rgb(var(--color-success) / 0.86)' },
                            ],
                          }}
                          pointer={{
                            type: 'needle',
                            color: 'rgb(var(--color-text-primary))',
                            baseColor: 'rgb(var(--color-bg-surface))',
                            length: 0.74,
                            width: 18,
                            strokeWidth: 1.8,
                            strokeColor: 'rgb(var(--color-text-primary) / 0.45)',
                            animate: true,
                            elastic: true,
                            animationDuration: 900,
                          }}
                          labels={{
                            valueLabel: {
                              hide: true,
                            },
                            tickLabels: {
                              type: 'outer',
                              hideMinMax: false,
                              ticks: [
                                { value: 0 },
                                { value: 25 },
                                { value: 50 },
                                { value: 75 },
                                { value: 100 },
                              ],
                              defaultTickValueConfig: {
                                formatTextValue: (value: number) => `${value}`,
                                style: {
                                  fill: 'rgb(var(--color-text-muted))',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                },
                              },
                              defaultTickLineConfig: {
                                color: 'rgb(var(--color-border-strong) / 0.95)',
                                width: 1.4,
                                length: 8,
                                distanceFromArc: 2,
                              },
                            },
                          }}
                          className="pointer-events-none"
                        />

                      </div>

                      <p className="mt-2 text-sm font-semibold text-fg-primary">{recommendation.headline}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="app-stat border-border-strong/65 bg-surface/92 p-3">
                  <div className="text-[11px] text-fg-muted">{t('ai.posteriorProbability')}</div>
                  <div className="mt-1 text-[1.7rem] font-semibold tracking-[-0.015em] text-fg-primary">
                    {formatMaybe(animatedPosterior, (value) => formatPct(value))}
                  </div>
                  <div className="mt-1 text-xs text-fg-secondary">
                    {t('ai.posteriorCaption')}
                  </div>
                </div>

                <div className={clsx('rounded-xl border p-3', recommendation.panelClass)}>
                  <p className="text-sm font-semibold text-fg-primary">{recommendation.headline}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {compactMetrics.map((metric, index) => (
                <div
                  key={metric.id}
                  className="group rounded-xl border border-border/80 bg-surface/92 px-3 py-2 transition-all duration-500 hover:border-accent/35 hover:bg-surface hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                  style={{ transitionDelay: `${index * 45}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium text-fg-muted">{metric.label}</div>
                    <div className="text-sm font-semibold text-fg-primary">{metric.shortValue}</div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-elevated">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', metric.barClass)}
                      style={{ width: `${Math.max(6, metric.progress * 100)}%` }}
                    />
                  </div>
                  <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-500 group-hover:mt-2 group-hover:max-h-20 group-hover:opacity-100">
                    <div className="flex items-start gap-1 text-[11px] leading-4 text-fg-secondary">
                      <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                      <span>{metric.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="app-stat border-border-strong/65 bg-surface/92 p-3">
              <div className="text-[11px] text-fg-muted">{t('ai.event')}</div>
              <p className="mt-1 text-sm text-fg-primary">{eventText ?? '--'}</p>
              {(formulaPosterior || formulaBas) && (
                <div className="mt-2 space-y-1 rounded-lg border border-border/75 bg-elevated/60 px-2.5 py-2 text-xs font-mono text-fg-secondary">
                  {formulaPosterior && <div>{formulaPosterior}</div>}
                  {formulaBas && <div>{formulaBas}</div>}
                  {typeof evidenceSignal === 'number' && (
                    <div>{t('ai.netSignalLabel', { value: evidenceSignal.toFixed(3) })}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
