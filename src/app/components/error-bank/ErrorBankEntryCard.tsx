import { CheckCircle2, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ErrorBankEntry, ErrorCategory } from '../../store/useStore';
import {
  analyzeSentenceDiff,
  normalizeSentenceForCompare,
  renderSentenceWithDiff,
} from './errorSentenceDiff';

function filterDiagnosisForDisplay(diagnosis: string): string {
  const lines = diagnosis
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => !/中文标点|全角标点|全形标点|使用了中文标点/.test(line));
  return lines
    .map((line, i) => {
      const body = line.replace(/^\d+\.\s*/, '').trim();
      return `${i + 1}. ${body}`;
    })
    .join('\n');
}

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { label: string }> = {
  grammar: { label: '语法错' },
  collocation: { label: '搭配错' },
  chinglish: { label: '中式表达错' },
};

type ErrorBankEntryCardProps = {
  entry: ErrorBankEntry;
  isExpanded: boolean;
  correctedSentence?: string;
  correctionStatus?: 'loading' | 'ready' | 'missing' | 'error';
  onToggleExpanded: () => void;
  onDelete: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onSaveCorrectedSentence: (sentence: string) => void;
};

export function ErrorBankEntryCard({
  entry,
  isExpanded,
  correctedSentence,
  correctionStatus,
  onToggleExpanded,
  onDelete,
  onResolve,
  onReopen,
  onSaveCorrectedSentence,
}: ErrorBankEntryCardProps) {
  const cat = entry.errorCategory ?? 'grammar';
  const [editingCorrection, setEditingCorrection] = useState(false);
  const [correctedDraft, setCorrectedDraft] = useState(correctedSentence || '');

  useEffect(() => {
    setCorrectedDraft(correctedSentence || '');
  }, [correctedSentence]);

  const sentenceDiff =
    correctedSentence &&
    normalizeSentenceForCompare(correctedSentence) !==
      normalizeSentenceForCompare(entry.originalSentence)
      ? analyzeSentenceDiff(entry.originalSentence, correctedSentence)
      : null;
  const diagnosisShown = filterDiagnosisForDisplay(entry.diagnosis);

  const handleSaveCorrection = () => {
    const trimmed = correctedDraft.trim();
    if (!trimmed) return;
    onSaveCorrectedSentence(trimmed);
    setEditingCorrection(false);
  };

  return (
    <div
      key={entry.id}
      id={`error-row-${entry.id}`}
      className={`bg-white/95 border rounded-xl overflow-hidden transition-all scroll-mt-24 shadow-sm ${
        entry.resolved
          ? 'border-slate-200/90 opacity-[0.96]'
          : 'border-rose-100 hover:border-rose-200/90'
      } ${isExpanded ? 'ring-2 ring-rose-100/80 shadow-md' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="w-full text-left p-4 sm:p-5 hover:bg-rose-50/25 transition-colors cursor-pointer"
        onClick={onToggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpanded();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="space-y-1">
              <p className="text-[10px] font-medium tracking-wide text-emerald-700/80">正确句</p>
              {editingCorrection ? (
                <textarea
                  value={correctedDraft}
                  onChange={(e) => setCorrectedDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full min-h-[5.5rem] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 focus:outline-none focus:border-emerald-400"
                  placeholder="手动整理成一条你认可的正确句"
                />
              ) : (
                <p
                  className={`leading-relaxed text-pretty whitespace-pre-wrap ${
                    correctedSentence
                      ? 'text-[15px] sm:text-[16px] font-medium text-slate-800'
                      : correctionStatus === 'loading'
                        ? 'text-sm text-slate-400'
                        : correctionStatus === 'error'
                          ? 'text-sm text-amber-600'
                          : 'text-sm text-slate-500'
                  }`}
                >
                  {correctedSentence
                    ? sentenceDiff
                      ? renderSentenceWithDiff(sentenceDiff.correctedTokens, 'correct')
                      : correctedSentence
                    : correctionStatus === 'loading'
                      ? '正在补全正确句…'
                      : correctionStatus === 'error'
                        ? '正确句补全失败，请刷新页面后重试'
                        : '展开查看诊断后，再把这句改成你自己的正确版本'}
                </p>
              )}
              {sentenceDiff?.keyPhrases.length ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-medium tracking-wide text-lime-700/80">
                    关键改动
                  </span>
                  {sentenceDiff.keyPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="rounded-full border border-lime-200/90 bg-lime-100/80 px-2 py-0.5 text-[11px] font-medium text-lime-800"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              ) : null}
              {isExpanded ? (
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  {editingCorrection ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveCorrection();
                        }}
                        disabled={!correctedDraft.trim()}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Save size={12} />
                        保存正确句
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCorrectedDraft(correctedSentence || '');
                          setEditingCorrection(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <X size={12} />
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCorrection(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil size={12} />
                      手动修改正确句
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium tracking-wide text-slate-400">原句</p>
              <p className="text-xs sm:text-[13px] text-slate-500 line-through decoration-slate-400 decoration-1 leading-relaxed text-pretty whitespace-pre-wrap">
                {sentenceDiff
                  ? renderSentenceWithDiff(sentenceDiff.originalTokens, 'original')
                  : entry.originalSentence}
              </p>
            </div>
            {entry.resolved ? <p className="text-xs text-emerald-700 font-medium">已解决</p> : null}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 tabular-nums">
              {new Date(entry.timestamp).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg border border-transparent hover:border-rose-100 hover:bg-rose-50/60 transition-colors"
            >
              <Trash2 size={12} aria-hidden />
              删除
            </button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-rose-100/70 bg-gradient-to-b from-rose-50/40 to-slate-50/50 px-4 py-5 sm:px-5 space-y-5">
          {diagnosisShown ? (
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-2">诊断结果</h2>
              <div className="text-sm text-slate-600 leading-relaxed pl-3 border-l-2 border-rose-300/80 bg-white/60 rounded-r-lg py-2 pr-2 whitespace-pre-line">
                {diagnosisShown}
              </div>
            </section>
          ) : null}

          {cat === 'chinglish' &&
          (entry.nativeVersion || (entry as { nativeThinking?: string }).nativeThinking) ? (
            <section className="space-y-4">
              {entry.nativeVersion ? (
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 mb-2">母语者说法</h2>
                  <p className="text-sm text-slate-600 leading-relaxed pl-3 border-l-2 border-sky-200 bg-white/60 rounded-r-lg py-2 pr-2">
                    {entry.nativeVersion}
                  </p>
                </div>
              ) : null}
              {(entry as { nativeThinking?: string }).nativeThinking ? (
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 mb-2">母语者思路</h2>
                  <p className="text-sm text-slate-500 leading-relaxed pl-3 border-l-2 border-slate-200 bg-white/50 rounded-r-lg py-2 pr-2">
                    {(entry as { nativeThinking?: string }).nativeThinking}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">语法点与来源</h2>
            <div className="rounded-xl border border-rose-100/80 bg-white/90 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-slate-600 leading-snug">
                <span className="text-slate-500 font-normal shrink-0">来源</span>
                <span className="text-slate-300 select-none">·</span>
                <span className="font-normal text-slate-700">{entry.verb}</span>
                <span className="text-slate-300 select-none">·</span>
                <span className="font-normal text-slate-700">{entry.collocation}</span>
                <span className="text-slate-300 select-none">·</span>
                <span className="font-normal text-slate-700">{ERROR_CATEGORY_LABELS[cat].label}</span>
                {entry.grammarPoints.length > 0 ? (
                  <>
                    <span className="text-slate-300 select-none px-0.5">·</span>
                    <span className="text-slate-500 font-normal shrink-0">语法点</span>
                    <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0 items-center">
                      {entry.grammarPoints.map((point, index) => (
                        <li
                          key={index}
                          className="text-xs font-normal text-slate-700 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded-md"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <div className="pt-0.5 flex flex-wrap items-center gap-2">
            {!entry.resolved ? (
              <button
                type="button"
                onClick={onResolve}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 shadow-sm shadow-rose-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
              >
                <CheckCircle2 size={16} aria-hidden />
                标记为已解决
              </button>
            ) : (
              <button
                type="button"
                onClick={onReopen}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                <RotateCcw size={16} aria-hidden />
                恢复为待复习
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
