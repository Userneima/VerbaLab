import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { Library, Search, Filter, Download, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { aiTranslateSentence } from '../utils/api';
import { corpusDuplicateGroupSizes, getCorpusDuplicateSummary } from '../utils/corpusDedupe';
import { VirtualizedStack } from '../components/VirtualizedStack';

const SHOW_ZH_STORAGE_KEY = 'ff_corpus_show_zh';

function readShowZhPreference(): boolean {
  try {
    const v = localStorage.getItem(SHOW_ZH_STORAGE_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

type SortBy = 'newest' | 'oldest' | 'verb';
type FilterVerb = 'all' | string;

export function CorpusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectToVocabReview = searchParams.get('tab') === 'cards';

  const store = useStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterVerb, setFilterVerb] = useState<FilterVerb>('all');
  const [flashSentenceId, setFlashSentenceId] = useState<string | null>(null);
  const [showZhTranslation, setShowZhTranslation] = useState(readShowZhPreference);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateErr, setTranslateErr] = useState<string | null>(null);

  const sentenceHighlight = searchParams.get('sentence');

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_ZH_STORAGE_KEY, showZhTranslation ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [showZhTranslation]);

  const uniqueVerbs = useMemo(() => {
    const verbs = new Set(store.corpus.map(e => e.verb));
    return Array.from(verbs).sort();
  }, [store.corpus]);

  const corpusDupSizesById = useMemo(
    () => corpusDuplicateGroupSizes(store.corpus),
    [store.corpus]
  );

  const corpusDupSummary = useMemo(
    () => getCorpusDuplicateSummary(store.corpus),
    [store.corpus]
  );

  const filtered = useMemo(() => {
    let result = [...store.corpus];

    if (search) {
      result = result.filter(
        e =>
          e.userSentence.toLowerCase().includes(search.toLowerCase()) ||
          e.collocation.toLowerCase().includes(search.toLowerCase()) ||
          e.verb.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterVerb !== 'all') {
      result = result.filter(e => e.verb === filterVerb);
    }

    if (sortBy === 'newest') result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (sortBy === 'oldest') result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (sortBy === 'verb') result.sort((a, b) => a.verb.localeCompare(b.verb));

    return result;
  }, [store.corpus, search, sortBy, filterVerb]);

  useEffect(() => {
    if (!sentenceHighlight) return;
    const entry = store.corpus.find(e => e.id === sentenceHighlight);
    if (!entry) {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('sentence');
        return p;
      }, { replace: true });
      return;
    }
    setSearch('');
    setFilterVerb('all');
  }, [sentenceHighlight, store.corpus, setSearchParams]);

  useEffect(() => {
    if (!sentenceHighlight) return;
    if (!filtered.some(e => e.id === sentenceHighlight)) return;
    const id = sentenceHighlight;
    const t = window.requestAnimationFrame(() => {
      const el = document.getElementById(`corpus-sentence-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashSentenceId(id);
        window.setTimeout(() => setFlashSentenceId(null), 2200);
      }
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('sentence');
        return p;
      }, { replace: true });
    });
    return () => window.cancelAnimationFrame(t);
  }, [sentenceHighlight, filtered, setSearchParams]);

  const requestTranslationIfMissing = useCallback(
    async (id: string, userSentence: string) => {
      const row = store.corpus.find(e => e.id === id);
      if (row?.zhTranslation) return;
      setTranslateErr(null);
      setTranslatingId(id);
      try {
        const { translation } = await aiTranslateSentence(userSentence);
        store.setCorpusEntryZhTranslation(id, translation);
      } catch (e: unknown) {
        setTranslateErr(e instanceof Error ? e.message : '翻译失败');
      } finally {
        setTranslatingId(null);
      }
    },
    [store.corpus, store.setCorpusEntryZhTranslation]
  );

  const handleExport = () => {
    const text = store.corpus
      .map(e => `[${e.verb} · ${e.collocation}]\n${e.userSentence}\n${new Date(e.timestamp).toLocaleDateString()}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verbalab-corpus.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (redirectToVocabReview) {
    return <Navigate to="/vocab-review" replace />;
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Library size={20} className="text-emerald-600 shrink-0" />
                <h1 className="font-bold text-gray-800 text-base sm:text-lg">个人语料库</h1>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">
                仅收录造句语料；单词卡片请在侧栏「单词卡片」进入。中文翻译会随账号同步到云端。
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {store.corpus.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Download size={15} />
                  导出
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 space-y-5">
          {store.corpus.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Library size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">语料库还是空的</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                前往实验室，造句并通过 AI 语法检查，句子将自动存入你的私人语料库
              </p>
            </div>
          ) : (
            <>
              {corpusDupSummary.duplicateGroupCount > 0 && (
                <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <span className="shrink-0 font-medium">重复检测</span>
                  <span className="text-amber-800/90">
                    同一搭配下实质相同的句子共{' '}
                    <strong className="font-semibold text-amber-900">{corpusDupSummary.duplicateGroupCount}</strong> 组，若每组只保留一条可删去{' '}
                    <strong className="font-semibold text-amber-900">{corpusDupSummary.redundantEntryCount}</strong>{' '}
                    条。规则：忽略大小写、首尾空格与句末标点差异。
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索句子、搭配..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <select
                  value={filterVerb}
                  onChange={e => setFilterVerb(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                >
                  <option value="all">所有动词</option>
                  {uniqueVerbs.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                >
                  <option value="newest">最新</option>
                  <option value="oldest">最早</option>
                  <option value="verb">按动词</option>
                </select>
                <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                  <Filter size={14} />
                  {filtered.length} 条
                </div>
                <div className="inline-flex items-center gap-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 bg-white shrink-0">
                  <span className="whitespace-nowrap select-none">中文翻译</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showZhTranslation}
                    aria-label={showZhTranslation ? '关闭中文翻译显示' : '开启中文翻译显示'}
                    onClick={() => setShowZhTranslation(v => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      showZhTranslation ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        showZhTranslation ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-400 hidden sm:inline select-none">已缓存时默认展示</span>
                </div>
              </div>

              {translateErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{translateErr}</div>
              )}

              <VirtualizedStack
                items={filtered}
                estimateSize={200}
                className="max-h-[min(78vh,56rem)] overflow-y-auto pr-1"
                empty={search ? <div className="text-center py-8 text-gray-400 text-sm">未找到匹配 "{search}" 的句子</div> : null}
                renderItem={entry => {
                  const hasZh = Boolean(entry.zhTranslation?.trim());
                  const showZhBlock = showZhTranslation && hasZh;
                  const needsFetch = !hasZh;

                  return (
                    <div
                      key={entry.id}
                      id={`corpus-sentence-${entry.id}`}
                      className={`bg-white border border-gray-100 rounded-xl p-4 sm:p-5 hover:shadow-sm transition-shadow scroll-mt-24 ${
                        flashSentenceId === entry.id ? 'ring-2 ring-indigo-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 space-y-3">
                          {needsFetch ? (
                            <button
                              type="button"
                              onClick={() => requestTranslationIfMissing(entry.id, entry.userSentence)}
                              disabled={translatingId === entry.id}
                              title="点击获取中文翻译"
                              aria-label="获取中文翻译"
                              className="group w-full text-left rounded-lg -mx-1 px-1 py-0.5 border border-transparent transition-colors hover:border-emerald-100 hover:bg-emerald-50/40 disabled:cursor-wait"
                            >
                              <span className="inline-flex items-start gap-2">
                                {translatingId === entry.id && (
                                  <Loader2 size={16} className="animate-spin shrink-0 mt-1 text-emerald-600" aria-hidden />
                                )}
                                <span className="min-w-0 text-[15px] sm:text-base font-medium text-gray-900 leading-[1.7] tracking-[-0.01em]">
                                  {entry.userSentence}
                                </span>
                              </span>
                              <span className="block text-[11px] text-gray-400 mt-1.5 font-normal">
                                尚无译文 · 点击句子请求翻译
                              </span>
                            </button>
                          ) : (
                            <div className="space-y-2.5">
                              <p className="text-[15px] sm:text-base font-medium text-gray-900 leading-[1.7] tracking-[-0.01em]">
                                {entry.userSentence}
                              </p>
                              {showZhBlock && (
                                <p className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-emerald-200/90 bg-emerald-50/20 py-1.5 pr-1 rounded-r-md">
                                  {entry.zhTranslation}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {(corpusDupSizesById.get(entry.id) ?? 1) > 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200/80 text-amber-800/90 bg-amber-50/50">
                                重复 {corpusDupSizesById.get(entry.id)} 条
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50/80">
                              {entry.verb}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50/80 max-w-[14rem] truncate" title={entry.collocation}>
                              {entry.collocation}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 bg-white">
                              {entry.mode === 'test' ? '实验室' : entry.mode === 'field' ? '实战仓' : '表达求助'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                          <div className="text-[11px] text-gray-400 tabular-nums">
                            {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm('确定删除这条语料句子？删除后无法恢复。')) return;
                              store.removeCorpusEntry(entry.id);
                              if (flashSentenceId === entry.id) setFlashSentenceId(null);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600/90 px-2 py-1 rounded-md border border-red-100/80 hover:bg-red-50/80"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
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
