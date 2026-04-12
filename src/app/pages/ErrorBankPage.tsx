import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Search, CheckCircle2, Filter, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { ErrorCategory } from '../store/useStore';
import { VirtualizedStack } from '../components/VirtualizedStack';
import { aiGrammarCheck } from '../utils/api';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { label: string }> = {
  grammar: { label: '语法错' },
  collocation: { label: '搭配错' },
  chinglish: { label: '中式表达错' },
};

/** 展示用：去掉历史记录里「中文标点」类诊断行并重新编号 */
function filterDiagnosisForDisplay(diagnosis: string): string {
  const lines = diagnosis
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(line => !/中文标点|全角标点|全形标点|使用了中文标点/.test(line));
  return lines
    .map((line, i) => {
      const body = line.replace(/^\d+\.\s*/, '').trim();
      return `${i + 1}. ${body}`;
    })
    .join('\n');
}

function normalizeSentenceForCompare(sentence: string): string {
  return sentence.replace(/\s+/g, ' ').trim().toLowerCase();
}

type DiffRenderToken = {
  text: string;
  isSpace: boolean;
  changed: boolean;
  wordLike: boolean;
};

type SentenceDiff = {
  correctedTokens: DiffRenderToken[];
  originalTokens: DiffRenderToken[];
  keyPhrases: string[];
};

const SENTENCE_TOKEN_PATTERN = /\s+|[A-Za-z]+(?:['’][A-Za-z]+)?|[0-9]+(?:[.,][0-9]+)?|[^\sA-Za-z0-9]/g;

function tokenizeSentence(sentence: string): Array<{ text: string; isSpace: boolean; normalized: string; wordLike: boolean }> {
  const tokens = sentence.match(SENTENCE_TOKEN_PATTERN) ?? [sentence];
  return tokens.map((text) => ({
    text,
    isSpace: /^\s+$/.test(text),
    normalized: text.replace(/’/g, "'").toLowerCase(),
    wordLike: /[A-Za-z0-9]/.test(text),
  }));
}

function buildLcsKeepMap(source: string[], target: string[]) {
  const dp = Array.from({ length: source.length + 1 }, () => Array<number>(target.length + 1).fill(0));

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      if (source[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const sourceKeep = Array<boolean>(source.length).fill(false);
  const targetKeep = Array<boolean>(target.length).fill(false);
  let i = source.length;
  let j = target.length;

  while (i > 0 && j > 0) {
    if (source[i - 1] === target[j - 1]) {
      sourceKeep[i - 1] = true;
      targetKeep[j - 1] = true;
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return { sourceKeep, targetKeep };
}

function createRenderTokens(
  tokens: Array<{ text: string; isSpace: boolean; wordLike: boolean }>,
  keepMap: boolean[]
): DiffRenderToken[] {
  let visibleIndex = 0;
  return tokens.map((token) => {
    if (token.isSpace) {
      return {
        text: token.text,
        isSpace: true,
        changed: false,
        wordLike: false,
      };
    }

    const changed = !keepMap[visibleIndex];
    visibleIndex += 1;
    return {
      text: token.text,
      isSpace: false,
      changed,
      wordLike: token.wordLike,
    };
  });
}

function extractChangedPhrases(tokens: DiffRenderToken[]): string[] {
  const phrases: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    if (current.length === 0) return;
    const phrase = current
      .join(' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
    if (phrase && /[A-Za-z0-9]/.test(phrase) && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
    current = [];
  };

  for (const token of tokens) {
    if (token.isSpace) continue;
    if (token.changed) {
      if (token.wordLike || current.length > 0) {
        current.push(token.text);
      }
    } else {
      pushCurrent();
    }
  }

  pushCurrent();
  return phrases.slice(0, 4);
}

function analyzeSentenceDiff(originalSentence: string, correctedSentence: string): SentenceDiff | null {
  const originalTokens = tokenizeSentence(originalSentence);
  const correctedTokens = tokenizeSentence(correctedSentence);
  const originalVisible = originalTokens.filter((token) => !token.isSpace).map((token) => token.normalized);
  const correctedVisible = correctedTokens.filter((token) => !token.isSpace).map((token) => token.normalized);

  if (originalVisible.length === 0 || correctedVisible.length === 0) return null;

  const { sourceKeep, targetKeep } = buildLcsKeepMap(originalVisible, correctedVisible);
  const renderedOriginalTokens = createRenderTokens(originalTokens, sourceKeep);
  const renderedCorrectedTokens = createRenderTokens(correctedTokens, targetKeep);
  const keyPhrases = extractChangedPhrases(renderedCorrectedTokens);

  if (!renderedCorrectedTokens.some((token) => token.changed)) return null;

  return {
    correctedTokens: renderedCorrectedTokens,
    originalTokens: renderedOriginalTokens,
    keyPhrases,
  };
}

function renderSentenceWithDiff(tokens: DiffRenderToken[], tone: 'correct' | 'original') {
  return tokens.map((token, index) => {
    if (token.isSpace) {
      return <span key={`space-${index}`}>{token.text}</span>;
    }

    const changedClassName = tone === 'correct'
      ? 'rounded-sm bg-lime-200/80 px-0.5 text-slate-900 shadow-[inset_0_-0.18em_0_rgba(190,242,100,0.7)]'
      : 'rounded-sm bg-rose-100/70 px-0.5 text-rose-500 decoration-rose-300';

    return (
      <span key={`${tone}-${index}`} className={token.changed ? changedClassName : undefined}>
        {token.text}
      </span>
    );
  });
}

export function ErrorBankPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const store = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [backfilledCorrections, setBackfilledCorrections] = useState<Record<string, string>>({});
  const [backfillStatus, setBackfillStatus] = useState<Record<string, 'loading' | 'ready' | 'missing' | 'error'>>({});

  const filtered = useMemo(() => {
    let result = [...store.errorBank];

    if (search) {
      result = result.filter(
        e =>
          e.originalSentence.toLowerCase().includes(search.toLowerCase()) ||
          e.collocation.toLowerCase().includes(search.toLowerCase()) ||
          e.grammarPoints.some(g => g.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (filterStatus === 'unresolved') result = result.filter(e => !e.resolved);
    if (filterStatus === 'resolved') result = result.filter(e => e.resolved);
    if (filterCategory !== 'all') result = result.filter(e => (e as { errorCategory?: ErrorCategory }).errorCategory === filterCategory);

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [store.errorBank, search, filterStatus, filterCategory]);

  useEffect(() => {
    if (!highlightId) return;
    const entry = store.errorBank.find(e => e.id === highlightId);
    if (!entry) {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('highlight');
        return p;
      }, { replace: true });
      return;
    }
    setSearch('');
    setFilterStatus('all');
    setFilterCategory('all');
    setExpandedId(highlightId);
  }, [highlightId, store.errorBank, setSearchParams]);

  useEffect(() => {
    if (!highlightId) return;
    if (!filtered.some(e => e.id === highlightId)) return;
    const id = highlightId;
    const t = window.requestAnimationFrame(() => {
      document.getElementById(`error-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('highlight');
        return p;
      }, { replace: true });
    });
    return () => window.cancelAnimationFrame(t);
  }, [highlightId, filtered, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const candidates = filtered.filter(entry => {
      const existingCorrection =
        backfilledCorrections[entry.id]?.trim() ||
        entry.correctedSentence?.trim() ||
        entry.nativeVersion?.trim();
      return !existingCorrection && !backfillStatus[entry.id];
    });

    if (candidates.length === 0) return;
    setBackfillStatus(prev => ({
      ...prev,
      ...Object.fromEntries(candidates.map(entry => [entry.id, 'loading' as const])),
    }));

    void (async () => {
      for (const entry of candidates) {
        if (cancelled) return;
        try {
          const result = await aiGrammarCheck(entry.originalSentence, entry.collocation);
          const corrected = result.correctedSentence?.trim();
          if (
            corrected &&
            normalizeSentenceForCompare(corrected) !== normalizeSentenceForCompare(entry.originalSentence)
          ) {
            if (!cancelled) {
              setBackfilledCorrections(prev => ({ ...prev, [entry.id]: corrected }));
              setBackfillStatus(prev => ({ ...prev, [entry.id]: 'ready' }));
            }
          } else if (!cancelled) {
            setBackfillStatus(prev => ({ ...prev, [entry.id]: 'missing' }));
          }
        } catch (error) {
          console.error(`Failed to backfill corrected sentence for error entry: ${entry.id}`, error);
          if (!cancelled) {
            setBackfillStatus(prev => ({ ...prev, [entry.id]: 'error' }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtered]);

  const unresolvedCount = store.errorBank.filter(e => !e.resolved).length;
  const resolvedCount = store.errorBank.filter(e => e.resolved).length;
  const totalCount = store.errorBank.length;

  const deleteErrorEntry = (entryId: string) => {
    if (!confirm('确定删除这条错误记录？删除后无法恢复。')) return;
    store.removeErrorBankEntry(entryId);
    setExpandedId(prev => (prev === entryId ? null : prev));
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-rose-50/35 via-slate-50/80 to-slate-100/90">
        <div className="bg-white/90 backdrop-blur-sm border-b border-rose-100/60 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertCircle size={20} strokeWidth={2} />
                </div>
                <h1 className="font-semibold text-slate-800 text-base sm:text-lg tracking-tight">语法错误库</h1>
                {unresolvedCount > 0 && (
                  <span className="text-xs text-rose-700/80 font-medium tabular-nums bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                    {unresolvedCount} 条待处理
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">记录薄弱点；展开查看诊断，处理完后可标记已解决</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 space-y-5">
          {store.errorBank.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">暂无错误记录</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                错误库是空的！继续在实验室练习，犯了语法错误才会出现在这里
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-rose-100/70 bg-white/90 shadow-sm overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-rose-50">
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-rose-600 tabular-nums leading-none">{unresolvedCount}</div>
                    <div className="text-xs text-slate-500 mt-1.5">待复习</div>
                  </div>
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-emerald-600 tabular-nums leading-none">{resolvedCount}</div>
                    <div className="text-xs text-slate-500 mt-1.5">已解决</div>
                  </div>
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-slate-700 tabular-nums leading-none">{totalCount}</div>
                    <div className="text-xs text-slate-500 mt-1.5">总计</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索句子、搭配、语法点..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['all', 'unresolved', 'resolved'] as FilterStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        filterStatus === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s === 'all' ? '全部' : s === 'unresolved' ? '待复习' : '已解决'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['all', 'grammar', 'collocation', 'chinglish'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        filterCategory === cat ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {cat === 'all' ? '分类' : ERROR_CATEGORY_LABELS[cat].label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  <Filter size={14} />
                  {filtered.length} 条
                </div>
              </div>

              <VirtualizedStack
                items={filtered}
                estimateSize={200}
                className="max-h-[68vh] overflow-y-auto pr-1"
                empty={
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {search ? `未找到匹配 "${search}" 的错误记录` : '没有符合条件的记录'}
                  </div>
                }
                renderItem={entry => {
                  const isExpanded = expandedId === entry.id;
                  const cat = entry.errorCategory ?? 'grammar';
                  const cs =
                    backfilledCorrections[entry.id]?.trim() ||
                    entry.correctedSentence?.trim() ||
                    entry.nativeVersion?.trim();
                  const sentenceDiff =
                    cs && normalizeSentenceForCompare(cs) !== normalizeSentenceForCompare(entry.originalSentence)
                      ? analyzeSentenceDiff(entry.originalSentence, cs)
                      : null;
                  const diagnosisShown = filterDiagnosisForDisplay(entry.diagnosis);
                  const correctionStatus = backfillStatus[entry.id];
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
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedId(isExpanded ? null : entry.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium tracking-wide text-emerald-700/80">正确句</p>
                              <p
                                className={`leading-relaxed text-pretty whitespace-pre-wrap ${
                                  cs
                                    ? 'text-[15px] sm:text-[16px] font-medium text-slate-800'
                                    : correctionStatus === 'loading'
                                      ? 'text-sm text-slate-400'
                                      : correctionStatus === 'error'
                                        ? 'text-sm text-amber-600'
                                        : 'text-sm text-slate-500'
                                }`}
                              >
                                {cs
                                  ? sentenceDiff
                                    ? renderSentenceWithDiff(sentenceDiff.correctedTokens, 'correct')
                                    : cs
                                  : correctionStatus === 'loading'
                                    ? '正在补全正确句…'
                                    : correctionStatus === 'error'
                                      ? '正确句补全失败，请刷新页面后重试'
                                    : '展开查看诊断后，再把这句改成你自己的正确版本'}
                              </p>
                              {sentenceDiff?.keyPhrases.length ? (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] font-medium tracking-wide text-lime-700/80">关键改动</span>
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
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium tracking-wide text-slate-400">原句</p>
                              <p className="text-xs sm:text-[13px] text-slate-500 line-through decoration-slate-400 decoration-1 leading-relaxed text-pretty whitespace-pre-wrap">
                                {sentenceDiff
                                  ? renderSentenceWithDiff(sentenceDiff.originalTokens, 'original')
                                  : entry.originalSentence}
                              </p>
                            </div>
                            {entry.resolved ? (
                              <p className="text-xs text-emerald-700 font-medium">已解决</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                deleteErrorEntry(entry.id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg border border-transparent hover:border-rose-100 hover:bg-rose-50/60 transition-colors"
                            >
                              <Trash2 size={12} aria-hidden />
                              删除
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-rose-100/70 bg-gradient-to-b from-rose-50/40 to-slate-50/50 px-4 py-5 sm:px-5 space-y-5">
                          {diagnosisShown ? (
                            <section>
                              <h2 className="text-sm font-semibold text-slate-700 mb-2">诊断结果</h2>
                              <div className="text-sm text-slate-600 leading-relaxed pl-3 border-l-2 border-rose-300/80 bg-white/60 rounded-r-lg py-2 pr-2 whitespace-pre-line">
                                {diagnosisShown}
                              </div>
                            </section>
                          ) : null}

                          {(entry as { errorCategory?: ErrorCategory }).errorCategory === 'chinglish' &&
                            ((entry as { nativeVersion?: string }).nativeVersion ||
                              (entry as { nativeThinking?: string }).nativeThinking) && (
                              <section className="space-y-4">
                                {(entry as { nativeVersion?: string }).nativeVersion && (
                                  <div>
                                    <h2 className="text-sm font-semibold text-slate-700 mb-2">母语者说法</h2>
                                    <p className="text-sm text-slate-600 leading-relaxed pl-3 border-l-2 border-sky-200 bg-white/60 rounded-r-lg py-2 pr-2">
                                      {(entry as { nativeVersion: string }).nativeVersion}
                                    </p>
                                  </div>
                                )}
                                {(entry as { nativeThinking?: string }).nativeThinking && (
                                  <div>
                                    <h2 className="text-sm font-semibold text-slate-700 mb-2">母语者思路</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed pl-3 border-l-2 border-slate-200 bg-white/50 rounded-r-lg py-2 pr-2">
                                      {(entry as { nativeThinking: string }).nativeThinking}
                                    </p>
                                  </div>
                                )}
                              </section>
                            )}

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
                                      {entry.grammarPoints.map((gp, i) => (
                                        <li
                                          key={i}
                                          className="text-xs font-normal text-slate-700 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded-md"
                                        >
                                          {gp}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </section>

                          {!entry.resolved && (
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => store.resolveError(entry.id)}
                                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 shadow-sm shadow-rose-200/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                              >
                                <CheckCircle2 size={16} aria-hidden />
                                标记为已解决
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
