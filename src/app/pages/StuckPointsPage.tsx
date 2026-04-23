import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { LifeBuoy, Search, Filter, CheckCircle2, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getStuckPointDisplay } from '../utils/stuckPointDisplay';
import { getStuckSuggestion, type StuckSuggestionResult } from '../utils/grammarCheck';
import { VERBS } from '../data/verbData';
import { ExpressionHelperPanel } from '../components/stuck/ExpressionHelperPanel';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

/** 句内「用'make':」式短语加粗 */
function highlightVerbUsePhrases(s: string): ReactNode {
  const re = /用[\u2018']([^'\u2019]+)[\u2019'][:：]/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      out.push(<span key={`p-${k++}`}>{s.slice(last, m.index)}</span>);
    }
    out.push(
      <strong key={`p-${k++}`} className="font-semibold text-amber-950">
        {m[0]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push(<span key={`p-${k++}`}>{s.slice(last)}</span>);
  }
  return out.length ? out : s;
}

/** **markdown 粗体** + 动词短语 */
function renderRichFragments(s: string): ReactNode {
  const chunks = s.split(/(\*\*[^*]+\*\*)/g);
  return chunks.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      const inner = chunk.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-amber-950">
          {highlightVerbUsePhrases(inner)}
        </strong>
      );
    }
    return <span key={i}>{highlightVerbUsePhrases(chunk)}</span>;
  });
}

function StuckAiSuggestionBody({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const raw = line.replace(/\s+$/, '');
        if (!raw.trim()) {
          return <div key={i} className="h-1" aria-hidden />;
        }
        const t = raw.trimStart();

        if (/^\d+\.\s/.test(t)) {
          const mm = t.match(/^(\d+\.\s)([\s\S]*)$/);
          if (mm) {
            return (
              <p key={i} className="text-amber-900">
                <span className="font-semibold text-amber-950 tabular-nums">{mm[1]}</span>
                {renderRichFragments(mm[2])}
              </p>
            );
          }
        }

        if (/^例句[:：]/.test(t)) {
          const rest = t.replace(/^例句[:：]\s*/, '');
          return (
            <p key={i} className="text-amber-900">
              <span className="font-semibold text-amber-950">例句</span>
              <span className="text-amber-800/90">：</span>
              {renderRichFragments(rest)}
            </p>
          );
        }

        return (
          <p key={i} className="text-amber-900/92 font-normal">
            {renderRichFragments(raw)}
          </p>
        );
      })}
    </div>
  );
}

export function StuckPointsPage() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [helperInput, setHelperInput] = useState('');
  const [helperLoading, setHelperLoading] = useState(false);
  const [helperError, setHelperError] = useState<string | null>(null);
  const [helperResult, setHelperResult] = useState<StuckSuggestionResult | null>(null);
  const [customSentence, setCustomSentence] = useState('');
  const [savingSentence, setSavingSentence] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [latestHelperEntryId, setLatestHelperEntryId] = useState<string | null>(null);
  const [backfilledTitleMap, setBackfilledTitleMap] = useState<Record<string, string>>({});
  const [backfillingIds, setBackfillingIds] = useState<Record<string, boolean>>({});

  const handleDeleteStuckPoint = (entryId: string) => {
    if (!confirm('确定删除这条卡壳记录？删除后无法恢复。')) return;
    store.deleteStuckPoint(entryId);
    setExpandedId((prev) => (prev === entryId ? null : prev));
    setBackfilledTitleMap((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    setBackfillingIds((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  };

  const corpusForSearch = useMemo(
    () => store.corpus.map((entry) => ({
      userSentence: entry.userSentence,
      collocation: entry.collocation,
      verb: entry.verb,
    })),
    [store.corpus],
  );

  const verbDataForSearch = useMemo(
    () =>
      VERBS.map((verb) => ({
        verb: verb.verb,
        collocations: verb.collocations.map((collocation) => ({
          phrase: collocation.phrase,
          meaning: collocation.meaning,
        })),
      })),
    [],
  );

  const saveSentenceToCorpus = (sentence: string, translation?: string) => {
    const thought = helperInput.trim();
    const trimmedSentence = sentence.trim();
    if (!thought || !trimmedSentence) return;
    const collocationId = `free-expression:${encodeURIComponent(thought.toLowerCase())}`;
    const savedEntry = store.addToCorpus({
      verbId: 'free-expression',
      verb: 'free expression',
      collocationId,
      collocation: thought,
      userSentence: trimmedSentence,
      isCorrect: true,
      mode: 'stuck',
      tags: ['free-expression', 'stuck-helper'],
      nativeThinking: thought,
    });
    if (translation?.trim()) {
      store.setCorpusEntryZhTranslation(savedEntry.id, translation.trim());
    } else {
      store.setCorpusEntryZhTranslation(savedEntry.id, thought);
    }
    if (latestHelperEntryId) {
      store.resolveStuck(latestHelperEntryId);
    }
    setSaveMessage('已收进语料库');
  };

  const handleGenerate = async () => {
    const thought = helperInput.trim();
    if (!thought) return;
    setHelperLoading(true);
    setHelperError(null);
    setSaveMessage(null);
    try {
      const result = await getStuckSuggestion(thought, corpusForSearch, verbDataForSearch, {
        allowFallback: false,
      });
      setHelperResult(result);
      setCustomSentence(result.examples[0]?.sentence || '');
      const entry = store.addStuckPoint({
        chineseThought: thought,
        englishAttempt: '',
        aiSuggestion: result.guidanceZh?.trim() || result.suggestion,
        recommendedExpression: result.recommendedExpression,
        sourceMode: 'free',
      });
      setLatestHelperEntryId(entry.id);
    } catch (error) {
      setHelperError(error instanceof Error ? error.message : '生成表达指导失败');
    } finally {
      setHelperLoading(false);
    }
  };

  const handleSaveExampleToCorpus = (sentence: string, translation?: string) => {
    setSavingSentence(sentence);
    setSaveMessage(null);
    try {
      saveSentenceToCorpus(sentence, translation);
    } finally {
      setSavingSentence(null);
    }
  };

  const handleSaveCustomSentence = () => {
    const sentence = customSentence.trim();
    if (!sentence) return;
    setSavingSentence('__custom__');
    setSaveMessage(null);
    try {
      saveSentenceToCorpus(sentence);
    } finally {
      setSavingSentence(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...store.stuckPoints];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        s =>
          s.chineseThought.toLowerCase().includes(q) ||
          s.englishAttempt.toLowerCase().includes(q) ||
          s.aiSuggestion.toLowerCase().includes(q)
      );
    }

    if (filterStatus === 'unresolved') result = result.filter(s => !s.resolved);
    if (filterStatus === 'resolved') result = result.filter(s => s.resolved);

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [store.stuckPoints, search, filterStatus]);

  useEffect(() => {
    let cancelled = false;
    const candidates = filtered.filter((entry) => {
      const display = getStuckPointDisplay(entry);
      if (display.titleEnglish?.trim()) return false;
      if (backfilledTitleMap[entry.id]) return false;
      if (backfillingIds[entry.id]) return false;
      return true;
    });
    if (candidates.length === 0) return;

    setBackfillingIds((prev) => ({
      ...prev,
      ...Object.fromEntries(candidates.map((entry) => [entry.id, true])),
    }));

    void (async () => {
      for (const entry of candidates) {
        if (cancelled) return;
        try {
          const result = await getStuckSuggestion(entry.chineseThought, corpusForSearch, verbDataForSearch);
          const phrase = result.recommendedExpression?.trim();
          if (phrase && !cancelled) {
            store.setStuckPointRecommendedExpression(entry.id, phrase);
            setBackfilledTitleMap((prev) => ({ ...prev, [entry.id]: phrase }));
          }
        } catch {
          // ignore per-entry backfill failure
        } finally {
          if (!cancelled) {
            setBackfillingIds((prev) => {
              const next = { ...prev };
              delete next[entry.id];
              return next;
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtered, backfilledTitleMap, backfillingIds, corpusForSearch, verbDataForSearch, store]);

  const unresolved = store.stuckPoints.filter(s => !s.resolved).length;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <LifeBuoy size={20} className="text-amber-600 shrink-0" />
                <h1 className="font-bold text-gray-800 text-base sm:text-lg">卡壳点记录</h1>
                {unresolved > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    {unresolved} 未解决
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-0.5">
                把中文想法丢进来拿表达指导，或回看你之前在练习中留下的卡壳记录
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 space-y-5">
          <ExpressionHelperPanel
            chineseThought={helperInput}
            onChineseThoughtChange={setHelperInput}
            loading={helperLoading}
            error={helperError}
            result={helperResult}
            customSentence={customSentence}
            onCustomSentenceChange={setCustomSentence}
            onSubmit={handleGenerate}
            onUseExampleSentence={(sentence) => {
              setCustomSentence(sentence);
              setSaveMessage(null);
            }}
            onSaveExampleToCorpus={handleSaveExampleToCorpus}
            onSaveCustomSentence={handleSaveCustomSentence}
            savingSentence={savingSentence}
            saveMessage={saveMessage}
          />

          {store.stuckPoints.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LifeBuoy size={28} className="text-amber-600" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">还没有卡壳记录</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                你可以直接在上面输入中文想法获取表达指导；在实验室和实战仓里遇到说不出口的情况，也会自动沉淀到这里
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索中文思路、英文尝试、AI 建议…"
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white"
                >
                  <option value="all">全部</option>
                  <option value="unresolved">未解决</option>
                  <option value="resolved">已解决</option>
                </select>
                <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  <Filter size={14} />
                  {filtered.length} 条
                </div>
              </div>

              <div className="space-y-3">
                {filtered.map(entry => {
                  const d = getStuckPointDisplay(entry);
                  const titleEnglish = d.titleEnglish || backfilledTitleMap[entry.id];
                  return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-shadow ${
                      entry.resolved ? 'border-gray-100 opacity-90' : 'border-amber-100 shadow-sm'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left p-4 hover:bg-amber-50/40 transition-colors"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <MessageSquare size={14} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="min-w-0 flex-1 text-[15px] leading-snug line-clamp-3 text-left">
                              <span className="font-medium text-gray-900">{d.chinese}</span>
                              {titleEnglish ? (
                                <>
                                  <span className="mx-1.5 text-gray-300 font-normal select-none" aria-hidden>
                                    ·
                                  </span>
                                  <span className="text-sm text-gray-600 font-normal">{titleEnglish}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {entry.resolved ? (
                            <span className="text-xs text-emerald-600 font-medium">已解决</span>
                          ) : (
                            <span className="text-xs text-amber-700 font-medium">待消化</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedId === entry.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                        <div className="mt-3 space-y-3">
                          {(d.sourceLabel || d.practiceCollocation) ? (
                            <div className="text-xs text-gray-500 pb-2 border-b border-gray-100 space-y-1">
                              {d.sourceLabel ? (
                                <div>
                                  <span className="font-medium text-gray-600">来源</span>
                                  <span className="mx-1 text-gray-300">·</span>
                                  <span>{d.sourceLabel}</span>
                                </div>
                              ) : null}
                              {d.practiceCollocation ? (
                                <div>
                                  <span className="font-medium text-gray-600">练习搭配</span>
                                  <span className="mx-1 text-gray-300">·</span>
                                  <span className="text-gray-600">{d.practiceCollocation}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {entry.englishAttempt ? (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">当时英文尝试</div>
                              <p className="text-sm text-gray-700">{entry.englishAttempt}</p>
                            </div>
                          ) : null}
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-2">
                              <Sparkles size={14} className="shrink-0" />
                              AI 建议
                            </div>
                            <StuckAiSuggestionBody text={entry.aiSuggestion} />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteStuckPoint(entry.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={14} />
                              删除
                            </button>
                            {!entry.resolved ? (
                              <button
                                type="button"
                                onClick={() => store.resolveStuck(entry.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                              >
                                <CheckCircle2 size={14} />
                                标记为已解决
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-600">已标记为已解决</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
                {filtered.length === 0 && search && (
                  <div className="text-center py-8 text-gray-400 text-sm">未找到匹配「{search}」的记录</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
