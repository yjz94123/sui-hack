import { useRef, useState } from 'react';
import { Loading } from '../common';
import { streamAnalysis, type AnalysisStreamMessage } from '../../api/markets';
import { useTranslation } from 'react-i18next';

interface AnalysisPanelProps {
  eventId: string;
  marketId: string;
}

function keepLastLines(text: string, maxLines = 5): string {
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

export function AnalysisPanel({ eventId, marketId }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fullOutputRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  const handleMessage = (msg: AnalysisStreamMessage) => {
    if (msg.type === 'task') {
      setTaskId(msg.taskId);
      return;
    }

    if (msg.type === 'delta') {
      fullOutputRef.current += msg.content;
      setOutput((prev) => keepLastLines(prev + msg.content, 5));
      return;
    }

    if (msg.type === 'done') {
      const parsed = msg.result ?? extractLastJsonCodeBlock(fullOutputRef.current);
      setResult(parsed);
      setIsRunning(false);
      abortRef.current = null;
      return;
    }

    if (msg.type === 'error') {
      setError(msg.message);
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const start = async () => {
    if (isRunning) return;
    setIsRunning(true);
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
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  };

  const r = (result ?? {}) as any;
  const bas = typeof r.bet_attractiveness_score === 'number' ? r.bet_attractiveness_score : undefined;
  const p0 = typeof r.prior_probability === 'number' ? r.prior_probability : undefined;
  const pTrue = typeof r.posterior_probability === 'number' ? r.posterior_probability : undefined;
  const conf = typeof r.confidence === 'number' ? r.confidence : undefined;
  const bandLow = typeof r.fair_probability_band?.low === 'number' ? r.fair_probability_band.low : undefined;
  const bandHigh = typeof r.fair_probability_band?.high === 'number' ? r.fair_probability_band.high : undefined;
  const evidenceCount = typeof r.evidence_summary?.count === 'number' ? r.evidence_summary.count : undefined;
  const evidenceNetSignal = typeof r.evidence_summary?.net_signal === 'number' ? r.evidence_summary.net_signal : undefined;
  const evidenceTotalWeight = typeof r.evidence_summary?.total_weight === 'number' ? r.evidence_summary.total_weight : undefined;
  const riskResolution = typeof r.risk_factors?.resolution === 'number' ? r.risk_factors.resolution : undefined;
  const riskTime = typeof r.risk_factors?.time === 'number' ? r.risk_factors.time : undefined;
  const riskTail = typeof r.risk_factors?.tail === 'number' ? r.risk_factors.tail : undefined;
  const eventText = typeof r.event === 'string' ? r.event : undefined;
  const formulaPosterior =
    typeof r.formula?.posterior_probability === 'string' ? r.formula.posterior_probability : undefined;
  const formulaBas = typeof r.formula?.bas === 'string' ? r.formula.bas : undefined;

  const formatPct = (p: number) => `${(p * 100).toFixed(1)}%`;

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-fg-primary">{t('ai.analysisTitle')}</h3>
          {taskId && <div className="text-[11px] text-fg-muted mt-1">Task: {taskId}</div>}
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={stop}
              className="px-3 py-1 text-xs rounded-lg bg-elevated text-fg-secondary hover:text-fg-primary transition border border-border-strong"
            >
              {t('ai.stop')}
            </button>
          ) : (
            <button
              onClick={start}
              className="px-3 py-1 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition"
            >
              {t('ai.run')}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-fg-muted mb-3">Powered by 0G Compute Network</p>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs text-fg-muted mb-1">{t('ai.latest5Lines')}</div>
          <textarea
            readOnly
            value={output}
            rows={5}
            className="w-full bg-elevated border border-border-strong rounded-lg p-3 text-xs text-fg-primary font-mono focus:outline-none"
            placeholder={isRunning ? t('ai.running') : t('ai.noOutput')}
          />
        </div>

        {isRunning && <Loading size="sm" text={t('ai.running')} />}

        {result !== null && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.bas')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof bas === 'number' ? bas.toFixed(0) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.posteriorProbability')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof pTrue === 'number' ? formatPct(pTrue) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.priorProbability')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof p0 === 'number' ? formatPct(p0) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.confidence')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof conf === 'number' ? conf.toFixed(3) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.fairBand')}</div>
                <div className="text-sm font-medium text-fg-primary">
                  {typeof bandLow === 'number' && typeof bandHigh === 'number'
                    ? `${formatPct(bandLow)} – ${formatPct(bandHigh)}`
                    : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.evidenceCount')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof evidenceCount === 'number' ? evidenceCount.toFixed(0) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.evidenceNetSignal')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof evidenceNetSignal === 'number' ? evidenceNetSignal.toFixed(3) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.evidenceTotalWeight')}</div>
                <div className="text-lg font-semibold text-fg-primary">
                  {typeof evidenceTotalWeight === 'number' ? evidenceTotalWeight.toFixed(3) : '--'}
                </div>
              </div>
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.riskFactors')}</div>
                <div className="text-xs text-fg-secondary mt-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">{t('ai.riskResolution')}</span>
                    <span className="text-fg-primary">
                      {typeof riskResolution === 'number' ? riskResolution.toFixed(3) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">{t('ai.riskTime')}</span>
                    <span className="text-fg-primary">{typeof riskTime === 'number' ? riskTime.toFixed(3) : '--'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">{t('ai.riskTail')}</span>
                    <span className="text-fg-primary">{typeof riskTail === 'number' ? riskTail.toFixed(3) : '--'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-elevated border border-border rounded-lg p-3">
              <div className="text-[11px] text-fg-muted">{t('ai.event')}</div>
              <div className="text-sm text-fg-primary mt-1">{eventText ?? '--'}</div>
            </div>

            {(formulaPosterior || formulaBas) && (
              <div className="bg-elevated border border-border rounded-lg p-3">
                <div className="text-[11px] text-fg-muted">{t('ai.formula')}</div>
                <div className="mt-2 space-y-1 text-xs text-fg-secondary font-mono">
                  {formulaPosterior && <div>{formulaPosterior}</div>}
                  {formulaBas && <div>{formulaBas}</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
