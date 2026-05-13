import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { Library, Search, Download, Loader2, Trash2, RotateCcw, X, Pencil, ArrowUpDown } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { aiTranslateSentence } from '../utils/api';
import { corpusDuplicateGroupSizes, getCorpusDuplicateSummary } from '../utils/corpusDedupe';
import { isCorpusEntryDue } from '../utils/corpusReview';
import { VocabReproducePanel } from '../components/VocabReproducePanel';
import { VirtualizedStack } from '../components/VirtualizedStack';
import { sentenceSupportsWordDifficultyUpgrade } from '../utils/sentenceTileBank';

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

type SortBy = 'added' | 'edited' | 'due' | 'verb';
type FilterVerb = 'all' | string;

const DISPLAY_MODE_OPTIONS: Array<{ value: SortBy; label: string; description: string }> = [
  { value: 'added', label: '添加时间', description: '按收录时间倒序' },
  { value: 'edited', label: '修改时间', description: '按最近修改倒序' },
  { value: 'due', label: '待复习优先', description: '优先处理到期句子' },
  { value: 'verb', label: '对应动词', description: '按动词浏览语料' },
];

export function CorpusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectToVocabReview = searchParams.get('tab') === 'cards';

  const store = useStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('edited');
  const [filterVerb, setFilterVerb] = useState<FilterVerb>('all');
  const [flashSentenceId, setFlashSentenceId] = useState<string | null>(null);
  const [showZhTranslation, setShowZhTranslation] = useState(readShowZhPreference);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateErr, setTranslateErr] = useState<string | null>(null);
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null);
  const [editingSentenceDraft, setEditingSentenceDraft] = useState('');
  const [reviewingSentenceId, setReviewingSentenceId] = useState<string | null>(null);
  const [reviewPassedSentenceId, setReviewPassedSentenceId] = useState<string | null>(null);
  const [showDifficultyUpgradePrompt, setShowDifficultyUpgradePrompt] = useState(false);

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

  const dueCorpusEntries = useMemo(
    () =>
      [...store.corpus]
        .filter((entry) => isCorpusEntryDue(entry.nextReviewAt))
        .sort((a, b) => String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || ''))),
    [store.corpus],
  );

  const reviewingEntry = useMemo(
    () => store.corpus.find((entry) => entry.id === reviewingSentenceId) ?? null,
    [reviewingSentenceId, store.corpus],
  );

  const reviewActionsUnlocked =
    Boolean(reviewingSentenceId) && reviewingSentenceId === reviewPassedSentenceId;
  const currentMode = DISPLAY_MODE_OPTIONS.find((option) => option.value === sortBy);

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

    if (sortBy === 'added') result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sortBy === 'edited') result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (sortBy === 'verb') result.sort((a, b) => a.verb.localeCompare(b.verb));
    if (sortBy === 'due') {
      result.sort((a, b) => {
        const aDue = isCorpusEntryDue(a.nextReviewAt);
        const bDue = isCorpusEntryDue(b.nextReviewAt);
        if (aDue !== bDue) return aDue ? -1 : 1;
        if (aDue && bDue) {
          return String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || ''));
        }
        return b.timestamp.localeCompare(a.timestamp);
      });
    }

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

  const startEditingSentence = (entryId: string, sentence: string) => {
    setEditingSentenceId(entryId);
    setEditingSentenceDraft(sentence);
    setTranslateErr(null);
  };

  const cancelEditingSentence = () => {
    setEditingSentenceId(null);
    setEditingSentenceDraft('');
  };

  const saveEditedSentence = (entryId: string) => {
    const trimmed = editingSentenceDraft.trim();
    if (!trimmed) return;
    store.updateCorpusEntrySentence(entryId, trimmed);
    setEditingSentenceId(null);
    setEditingSentenceDraft('');
    if (flashSentenceId === entryId) setFlashSentenceId(null);
  };

  const closeReviewModal = useCallback(() => {
    setReviewingSentenceId(null);
    setReviewPassedSentenceId(null);
    setShowDifficultyUpgradePrompt(false);
  }, []);

  const openReviewModal = useCallback(
    (entryId: string) => {
      const entry = store.corpus.find((item) => item.id === entryId);
      if (!entry) return;
      setReviewingSentenceId(entryId);
      setReviewPassedSentenceId(null);
      setShowDifficultyUpgradePrompt(
        entry.sentenceReviewDifficulty === 'phrase' &&
          entry.reviewRememberedStreak === 5 &&
          sentenceSupportsWordDifficultyUpgrade(entry.userSentence),
      );
      if (!entry.zhTranslation?.trim()) {
        void requestTranslationIfMissing(entry.id, entry.userSentence);
      }
    },
    [requestTranslationIfMissing, store.corpus],
  );

  const handleCorpusViewed = useCallback(() => {
    if (!reviewingEntry || !reviewActionsUnlocked) return;
    store.markCorpusEntryViewed(reviewingEntry.id);
    closeReviewModal();
  }, [closeReviewModal, reviewActionsUnlocked, reviewingEntry, store]);

  const handleCorpusRemembered = useCallback(() => {
    if (!reviewingEntry || !reviewActionsUnlocked) return;
    store.markCorpusEntryRemembered(reviewingEntry.id);
    closeReviewModal();
  }, [closeReviewModal, reviewActionsUnlocked, reviewingEntry, store]);

  const handleCorpusStruggled = useCallback(() => {
    if (!reviewingEntry || !reviewActionsUnlocked) return;
    store.markCorpusEntryStruggled(reviewingEntry.id);
    closeReviewModal();
  }, [closeReviewModal, reviewActionsUnlocked, reviewingEntry, store]);

  const handleUpgradeCorpusDifficulty = useCallback(() => {
    if (!reviewingEntry) return;
    store.setCorpusEntryReviewDifficulty(reviewingEntry.id, 'word');
    setShowDifficultyUpgradePrompt(false);
  }, [reviewingEntry, store]);

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

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <ArrowUpDown size={12} />
                  {currentMode?.label}
                </div>
                <div className="text-[11px] text-gray-400">
                  {sortBy === 'due'
                    ? `本轮 ${dueCorpusEntries.length} 句待复习`
                    : currentMode?.description}
                </div>
                {dueCorpusEntries.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openReviewModal(dueCorpusEntries[0].id)}
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    开始复习
                  </button>
                ) : null}
                <div className="text-[11px] text-gray-400">{filtered.length} 条</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {DISPLAY_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortBy(option.value);
                      if (option.value !== 'verb') setFilterVerb('all');
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortBy === option.value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-100 hover:text-emerald-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {sortBy === 'verb' && uniqueVerbs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterVerb('all')}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterVerb === 'all'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-100 hover:text-emerald-700'
                    }`}
                  >
                    全部动词
                  </button>
                  {uniqueVerbs.map((verb) => (
                    <button
                      key={verb}
                      type="button"
                      onClick={() => setFilterVerb(verb)}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filterVerb === verb
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-100 hover:text-emerald-700'
                      }`}
                    >
                      {verb}
                    </button>
                  ))}
                </div>
              )}

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
                  const isEditing = editingSentenceId === entry.id;
                  const isDue = isCorpusEntryDue(entry.nextReviewAt);

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
                          {isEditing ? (
                            <div className="space-y-2.5">
                              <textarea
                                value={editingSentenceDraft}
                                onChange={(e) => setEditingSentenceDraft(e.target.value)}
                                className="w-full min-h-[6rem] rounded-xl border border-indigo-200 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:outline-none focus:border-indigo-400"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEditedSentence(entry.id)}
                                  disabled={!editingSentenceDraft.trim()}
                                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                  保存句子
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingSentence}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  取消
                                </button>
                                <span className="text-[11px] text-gray-400">修改后中文翻译会清空，避免旧译文失真</span>
                              </div>
                            </div>
                          ) : needsFetch ? (
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
                              来源：{entry.mode === 'test' ? '实验室' : entry.mode === 'field' ? '实战仓' : '表达求助'}
                            </span>
                            {isDue && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 bg-emerald-50">
                                待复习
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                          <div className="text-[11px] text-gray-400 tabular-nums">
                            {new Date(sortBy === 'added' ? entry.createdAt : entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                          <button
                            type="button"
                            onClick={() => openReviewModal(entry.id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border ${
                              isDue
                                ? 'text-emerald-700 border-emerald-100/80 hover:bg-emerald-50/80'
                                : 'text-gray-400 border-gray-100 bg-gray-50 cursor-not-allowed'
                            }`}
                            disabled={!isDue}
                          >
                            <RotateCcw size={12} />
                            复习
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditingSentence(entry.id, entry.userSentence)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600/90 px-2 py-1 rounded-md border border-indigo-100/80 hover:bg-indigo-50/80"
                          >
                            <Pencil size={12} />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm('确定删除这条语料句子？删除后无法恢复。')) return;
                              store.removeCorpusEntry(entry.id);
                              if (editingSentenceId === entry.id) cancelEditingSentence();
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

      {reviewingEntry && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <RotateCcw size={12} />
                  语料复习
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">根据中文提示复原句子</h3>
                <p className="mt-1 text-sm text-gray-500">
                  你之前真正写过的一句，现在把它重新拼出来。
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="shrink-0 rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                aria-label="关闭语料复习"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50/80">
                  {reviewingEntry.verb}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 bg-gray-50/80">
                  {reviewingEntry.collocation}
                </span>
                {reviewingEntry.lastReviewedAt && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 bg-white">
                    上次复习 {new Date(reviewingEntry.lastReviewedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {translatingId === reviewingEntry.id && !reviewingEntry.zhTranslation?.trim() && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-700">
                  <Loader2 size={15} className="animate-spin" />
                  正在补充中文翻译，拿到提示后再开始复习。
                </div>
              )}

              {reviewingEntry.zhTranslation?.trim() || reviewingEntry.nativeThinking?.trim() ? (
                <VocabReproducePanel
                  referenceSentence={reviewingEntry.userSentence}
                  targetCollocation={reviewingEntry.collocation}
                  cueZh={
                    reviewingEntry.zhTranslation?.trim() ||
                    reviewingEntry.nativeThinking?.trim()
                  }
                  alreadyPassed={reviewPassedSentenceId === reviewingEntry.id}
                  difficulty={reviewingEntry.sentenceReviewDifficulty}
                  onComplete={() => setReviewPassedSentenceId(reviewingEntry.id)}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  {translateErr
                    ? `中文翻译暂时获取失败：${translateErr}`
                    : '这条语料还在准备中文提示，暂时不能开始复习。'}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleCorpusViewed}
                  disabled={!reviewActionsUnlocked}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  已浏览
                </button>
                <button
                  type="button"
                  onClick={handleCorpusRemembered}
                  disabled={!reviewActionsUnlocked}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  记住了
                </button>
                <button
                  type="button"
                  onClick={handleCorpusStruggled}
                  disabled={!reviewActionsUnlocked}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  还不太熟
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewingEntry && showDifficultyUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-4">
              <div className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                难度建议
              </div>
              <h4 className="mt-3 text-lg font-semibold text-gray-900">推荐提升到逐词模式</h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                这句话你已经连续 5 次都选了“记住了”。下次可以试试更细的逐词切分，练得更扎实一些。
              </p>
            </div>
            <div className="grid gap-3 border-t border-gray-100 px-5 py-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowDifficultyUpgradePrompt(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUpgradeCorpusDifficulty}
                className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                提升难度
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
