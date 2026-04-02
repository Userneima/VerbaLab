import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Layers,
  Languages,
  ArrowLeft,
  Plus,
  Trash2,
  RotateCcw,
  PenLine,
} from 'lucide-react';
import { VERBS, Verb, Collocation, type ExampleSentence } from '../data/verbData';
import { useStore } from '../store/StoreContext';
import { diverseDailyExamples } from '../utils/collocationExamples';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const STORAGE_KEY_SHOW_TRANSLATION = 'elis_foundry_show_translation';
function getStoredShowTranslation(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SHOW_TRANSLATION) === 'true';
  } catch {
    return false;
  }
}

/** 仅保留母语者日常真实使用的搭配，剔除书面语 */
const DAILY_VERBS: Verb[] = VERBS.map(v => ({
  ...v,
  collocations: v.collocations.filter((c: Collocation) => c.usage !== 'written'),
})).filter(v => v.collocations.length > 0) as Verb[];

function useIsLg() {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setIsLg(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return isLg;
}

/** 小屏：先选动词 → 再左搭配右例句；大屏保持三栏 */
type MobileFoundryPhase = 'pickVerb' | 'verbDetail';

export function FoundryPage() {
  const store = useStore();
  const firstVerbId = DAILY_VERBS[0]?.id ?? VERBS[0].id;
  const [selectedVerbId, setSelectedVerbId] = useState<string>(firstVerbId);
  const [selectedCollocation, setSelectedCollocation] = useState<Collocation | null>(null);
  const [search, setSearch] = useState('');
  const [showTranslationGlobal, setShowTranslationGlobal] = useState(getStoredShowTranslation);
  const [clickedExampleKey, setClickedExampleKey] = useState<string | null>(null);
  const isLg = useIsLg();
  const [mobilePhase, setMobilePhase] = useState<MobileFoundryPhase>('pickVerb');
  const [foundryEditorModalOpen, setFoundryEditorModalOpen] = useState(false);

  useEffect(() => {
    if (isLg) setMobilePhase('pickVerb');
  }, [isLg]);

  useEffect(() => {
    setFoundryEditorModalOpen(false);
  }, [selectedCollocation?.id]);

  const toggleTranslation = useCallback(() => {
    const next = !showTranslationGlobal;
    setShowTranslationGlobal(next);
    try {
      localStorage.setItem(STORAGE_KEY_SHOW_TRANSLATION, String(next));
    } catch {}
    if (!next) setClickedExampleKey(null);
  }, [showTranslationGlobal]);

  const selectedVerb = DAILY_VERBS.find(v => v.id === selectedVerbId) || DAILY_VERBS[0] || { ...VERBS[0], collocations: [] };

  const verbProgress = useMemo(() =>
    DAILY_VERBS.map(v => ({
      ...v,
      learnedCount: v.collocations.filter(c => store.learnedCollocations.has(c.id)).length,
    })),
    [store.learnedCollocations]
  );

  const filteredVerbs = useMemo(() =>
    verbProgress.filter(v =>
      v.verb.toLowerCase().includes(search.toLowerCase()) ||
      v.meaning.includes(search) ||
      v.collocations.some(c => c.phrase.toLowerCase().includes(search.toLowerCase()) || c.meaning.includes(search))
    ),
    [verbProgress, search]
  );

  const handleToggleLearned = (colId: string) => {
    if (store.learnedCollocations.has(colId)) {
      store.unmarkAsLearned(colId);
    } else {
      store.markAsLearned(colId);
    }
  };

  const verbLearnedCount = selectedVerb.collocations.filter(c => store.learnedCollocations.has(c.id)).length;
  const verbPercent = Math.round((verbLearnedCount / selectedVerb.collocations.length) * 100);

  // Clear per-sentence reveal when switching collocation
  const handleSelectCollocation = useCallback((col: Collocation | null) => {
    setSelectedCollocation(col);
    setClickedExampleKey(null);
  }, []);

  const enterMobileVerbDetail = useCallback((verbId: string) => {
    const v = DAILY_VERBS.find(x => x.id === verbId);
    setSelectedVerbId(verbId);
    setClickedExampleKey(null);
    const first = v?.collocations[0] ?? null;
    setSelectedCollocation(first);
    setMobilePhase('verbDetail');
  }, []);

  const backToMobileVerbList = useCallback(() => {
    setMobilePhase('pickVerb');
    setSelectedCollocation(null);
    setClickedExampleKey(null);
  }, []);

  type FoundryEditorLine = { content: string; chinese: string };
  const [foundryEditorLines, setFoundryEditorLines] = useState<FoundryEditorLine[]>([
    { content: '', chinese: '' },
  ]);

  const foundryPackFingerprint = selectedCollocation
    ? `${selectedCollocation.id}:${JSON.stringify(store.foundryExampleOverrides[selectedCollocation.id] ?? null)}`
    : '';

  useEffect(() => {
    if (!selectedCollocation) return;
    const p = store.foundryExampleOverrides[selectedCollocation.id];
    if (p?.items?.length) {
      setFoundryEditorLines(p.items.map(i => ({ content: i.content, chinese: i.chinese ?? '' })));
    } else {
      setFoundryEditorLines([{ content: '', chinese: '' }]);
    }
  }, [foundryPackFingerprint, selectedCollocation?.id]);

  const displayFoundryExamples: ExampleSentence[] = useMemo(() => {
    if (!selectedCollocation) return [];
    const p = store.foundryExampleOverrides[selectedCollocation.id];
    if (p?.items?.length) {
      return p.items.map(ex => ({
        scenario: 'daily' as const,
        content: ex.content,
        chinese: ex.chinese,
      }));
    }
    return diverseDailyExamples(selectedCollocation.examples);
  }, [selectedCollocation, foundryPackFingerprint]);

  const usingCustomFoundryExamples =
    !!selectedCollocation &&
    (store.foundryExampleOverrides[selectedCollocation.id]?.items?.length ?? 0) > 0;

  const saveFoundryExamples = () => {
    if (!selectedCollocation) return;
    store.setFoundryExamplesForCollocation(
      selectedCollocation.id,
      foundryEditorLines.map(({ content, chinese }) => ({
        content: content.trim(),
        chinese: chinese.trim() || undefined,
      }))
    );
    setFoundryEditorModalOpen(false);
  };

  const fillFoundryEditorFromBuiltin = () => {
    if (!selectedCollocation) return;
    const daily = diverseDailyExamples(selectedCollocation.examples);
    setFoundryEditorLines(
      daily.length
        ? daily.map(ex => ({ content: ex.content, chinese: ex.chinese ?? '' }))
        : [{ content: '', chinese: '' }]
    );
  };

  const restoreBuiltinFoundryExamples = () => {
    if (!selectedCollocation) return;
    if (!confirm('确定恢复为内置例句？当前自订内容将删除。')) return;
    store.clearFoundryExamplesForCollocation(selectedCollocation.id);
    setFoundryEditorLines([{ content: '', chinese: '' }]);
  };

  const highlightPhrase = (content: string, phrase: string) => {
    // Escape special regex chars in the phrase
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = content.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, idx) =>
      part.toLowerCase() === phrase.toLowerCase()
        ? <mark key={idx} className="bg-indigo-100 text-indigo-800 px-0.5 rounded font-medium">{part}</mark>
        : part
    );
  };

  const collocationList = (
    <>
      {selectedVerb.collocations.map(col => {
        const isLearned = store.learnedCollocations.has(col.id);
        const isSelected = selectedCollocation?.id === col.id;
        return (
          <div
            key={col.id}
            onClick={() => handleSelectCollocation(col)}
            className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
              isSelected
                ? 'bg-white border-indigo-300 shadow-sm'
                : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {col.phrase}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{col.meaning}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isSelected && <ChevronRight size={14} className="text-indigo-400 hidden lg:block" />}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleToggleLearned(col.id); }}
                  className="shrink-0 touch-manipulation"
                >
                  {isLearned
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <Circle size={18} className="text-gray-300 hover:text-indigo-400 transition-colors" />
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  const examplesPanel = selectedCollocation ? (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">{selectedCollocation.phrase}</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {selectedVerb.verb}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Layers size={12} />
                {displayFoundryExamples.length} 句
              </span>
            </div>
            <p className="text-gray-500 text-sm">{selectedCollocation.meaning}</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleLearned(selectedCollocation.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 self-start ${
              store.learnedCollocations.has(selectedCollocation.id)
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {store.learnedCollocations.has(selectedCollocation.id) ? (
              <><CheckCircle2 size={15} /> 已标记学习</>
            ) : (
              <><Circle size={15} /> 标记为已学</>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 gap-y-2">
          <button
            type="button"
            onClick={() => setFoundryEditorModalOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 transition-colors"
          >
            <PenLine size={16} className="shrink-0" />
            编辑我的例句
          </button>
          {usingCustomFoundryExamples && (
            <button
              type="button"
              onClick={restoreBuiltinFoundryExamples}
              className="text-xs font-medium text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              恢复内置例句
            </button>
          )}
          <span className="text-xs text-gray-400">在弹窗中收录、修改并保存</span>
        </div>

        <Dialog open={foundryEditorModalOpen} onOpenChange={setFoundryEditorModalOpen}>
          <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden border-gray-200 bg-white p-0 sm:max-w-xl">
            <DialogHeader className="shrink-0 space-y-1 border-b border-gray-100 px-5 pt-5 pb-3 pr-12 text-left">
              <DialogTitle className="text-base text-gray-900">收录我喜欢的例句</DialogTitle>
              <DialogDescription asChild>
                <p className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-600">{selectedCollocation.phrase}</span>
                  {' · '}
                  保存后替换下方展示；删光英文再保存即恢复内置。已登录且开启同步会随学习数据备份。
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fillFoundryEditorFromBuiltin}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50"
                >
                  <RotateCcw size={12} />
                  填入内置口语例句
                </button>
                {usingCustomFoundryExamples && (
                  <button
                    type="button"
                    onClick={restoreBuiltinFoundryExamples}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 px-2.5 py-1.5 rounded-lg border border-red-100 bg-white hover:bg-red-50"
                  >
                    恢复内置
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {foundryEditorLines.map((line, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        第 {idx + 1} 句
                      </span>
                      {foundryEditorLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFoundryEditorLines(prev => prev.filter((_, i) => i !== idx))
                          }
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label="删除该行"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={line.content}
                      onChange={e => {
                        const v = e.target.value;
                        setFoundryEditorLines(prev =>
                          prev.map((row, i) => (i === idx ? { ...row, content: v } : row))
                        );
                      }}
                      placeholder="英文句子（建议包含本搭配）"
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 font-sans bg-white"
                    />
                    <input
                      type="text"
                      value={line.chinese}
                      onChange={e => {
                        const v = e.target.value;
                        setFoundryEditorLines(prev =>
                          prev.map((row, i) => (i === idx ? { ...row, chinese: v } : row))
                        );
                      }}
                      placeholder="中文翻译（可选）"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/90 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setFoundryEditorLines(prev => [...prev, { content: '', chinese: '' }])
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              >
                <Plus size={14} />
                添加一句
              </button>
              <button
                type="button"
                onClick={saveFoundryExamples}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700"
              >
                保存我的例句
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                usingCustomFoundryExamples
                  ? 'bg-fuchsia-100 text-fuchsia-800'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {usingCustomFoundryExamples ? '当前展示 · 我的例句' : '当前展示 · 内置口语例句'}
            </span>
            <button
              type="button"
              onClick={toggleTranslation}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                showTranslationGlobal
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Languages size={12} />
              {showTranslationGlobal ? '隐藏中文' : '显示中文'}
            </button>
            <div className="flex-1 h-px bg-gray-100 min-w-[40px]" />
          </div>
          <p className="text-gray-400 text-xs mb-2">
            {showTranslationGlobal ? '已开启：所有例句显示中文' : '已关闭：点击英文例句可单独显示该句中文'}
          </p>
          <div className="space-y-2.5">
            {displayFoundryExamples.map((ex, i) => {
              const exKey = `${selectedCollocation.id}-${i}`;
              const showChinese = showTranslationGlobal || clickedExampleKey === exKey;
              return (
                <div
                  key={i}
                  role={showTranslationGlobal ? undefined : 'button'}
                  tabIndex={showTranslationGlobal ? undefined : 0}
                  onClick={() => {
                    if (!showTranslationGlobal) {
                      setClickedExampleKey(k => (k === exKey ? null : exKey));
                    }
                  }}
                  onKeyDown={e => {
                    if (!showTranslationGlobal && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setClickedExampleKey(k => (k === exKey ? null : exKey));
                    }
                  }}
                  className="rounded-xl p-4 border border-blue-200 bg-blue-50/50 hover:shadow-sm transition-all cursor-pointer"
                >
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {highlightPhrase(ex.content, selectedCollocation.phrase)}
                  </p>
                  {showChinese && (
                    <p className="text-gray-500 text-sm mt-2 pt-2 border-t border-blue-100">
                      {ex.chinese ?? '（暂无翻译）'}
                    </p>
                  )}
                </div>
              );
            })}
            {displayFoundryExamples.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无例句：点「编辑我的例句」添加并保存，或换一个有内置例句的搭配
              </div>
            )}
          </div>
        </div>
      </div>
    ) : (
    <div className="flex flex-col items-center justify-center min-h-[30vh] lg:min-h-0 lg:h-full text-center py-8 lg:py-0 px-2">
      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
        <BookOpen size={28} className="text-indigo-500" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-2">选择一个搭配</h3>
      <p className="text-gray-400 text-sm max-w-xs">
        从左侧选择搭配：可浏览内置口语例句，也可自订你喜欢的句子并保存；学完后标记为已学习
      </p>
      <div className="mt-4 flex gap-2 text-xs text-gray-400">
        <TrendingUp size={14} />
        <span>已学 {verbLearnedCount}/{selectedVerb.collocations.length} 个搭配</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* Verb List Sidebar — 小屏仅在「选动词」阶段全屏显示 */}
      <div
        className={`w-full lg:w-56 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col min-h-0 lg:max-h-none
          ${!isLg && mobilePhase === 'verbDetail' ? 'hidden' : 'flex'}
          ${!isLg && mobilePhase === 'pickVerb' ? 'flex-1 min-h-0' : ''}
          max-lg:max-h-none
        `}
      >
        <div className="p-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-800 text-sm mb-3">资产区 · 动词库</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索动词或搭配"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-gray-50"
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredVerbs.map(verb => {
            const isSelected = verb.id === selectedVerbId;
            const pct = Math.round((verb.learnedCount / verb.collocations.length) * 100);
            return (
              <button
                key={verb.id}
                type="button"
                onClick={() => {
                  if (isLg) {
                    setSelectedVerbId(verb.id);
                    setSelectedCollocation(null);
                    setClickedExampleKey(null);
                  } else {
                    enterMobileVerbDetail(verb.id);
                  }
                }}
                className={`w-full px-4 py-3 text-left border-b border-gray-50 transition-colors touch-manipulation ${
                  isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {verb.verb}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{verb.meaning}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${verb.learnedCount === verb.collocations.length ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {verb.learnedCount}/{verb.collocations.length}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 搭配 + 例句：小屏「选动词」阶段隐藏；进入动词后左搭配右例句 */}
      <div
        className={`flex-1 flex flex-col min-h-0 min-w-0 lg:overflow-hidden
          ${!isLg && mobilePhase === 'pickVerb' ? 'hidden' : 'flex'}
          ${!isLg && mobilePhase === 'verbDetail' ? 'overflow-hidden' : 'overflow-y-auto'}
        `}
      >
        {!isLg && mobilePhase === 'verbDetail' && (
          <div className="lg:hidden shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">
            <button
              type="button"
              onClick={backToMobileVerbList}
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 py-2 px-2 -ml-1 rounded-lg hover:bg-indigo-50 touch-manipulation shrink-0"
            >
              <ArrowLeft size={20} />
              选动词
            </button>
            <span className="text-gray-200 shrink-0">|</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 text-sm truncate">{selectedVerb.verb}</div>
              <div className="text-[11px] text-gray-500 truncate">{selectedVerb.meaning}</div>
            </div>
          </div>
        )}

        {/* Verb Header — 大屏三栏；小屏第二屏用顶栏代替 */}
        <div
          className={`bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 shrink-0 ${
            !isLg && mobilePhase === 'verbDetail' ? 'hidden' : ''
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedVerb.verb}</h1>
                <span className="text-gray-400 text-lg shrink-0" aria-hidden>/</span>
                <span className="text-gray-500 text-sm sm:text-base">{selectedVerb.meaning}</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                共 {selectedVerb.collocations.length} 个搭配 · 已学 {verbLearnedCount} 个
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <div className={`text-lg font-bold ${verbPercent === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {verbPercent}%
                </div>
                <div className="text-xs text-gray-400">完成率</div>
              </div>
              <div className="w-12 h-12 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={verbPercent === 100 ? '#10b981' : '#6366f1'}
                    strokeWidth="3"
                    strokeDasharray={`${verbPercent * 0.942} 94.2`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`flex flex-1 min-h-0 overflow-hidden lg:flex-row ${
            !isLg && mobilePhase === 'verbDetail' ? 'flex-row' : 'flex-col'
          }`}
        >
          <div
            className={`shrink-0 border-gray-100 bg-gray-50 space-y-2 border-b lg:border-b-0 lg:border-r p-3 sm:p-4
              w-full lg:w-72 lg:min-h-0 lg:overflow-y-auto
              ${!isLg && mobilePhase === 'verbDetail' ? 'w-[42%] max-w-[12rem] min-w-0 border-b-0 border-r overflow-y-auto py-2 px-2' : ''}
            `}
          >
            {!isLg && mobilePhase === 'verbDetail' && (
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1 lg:hidden">
                搭配
              </div>
            )}
            {collocationList}
          </div>

          <div
            className={`min-w-0 overflow-y-auto p-4 sm:p-6 pb-safe lg:pb-6 lg:flex-1 lg:min-h-0
              ${!isLg && mobilePhase === 'verbDetail' ? 'flex-1 min-h-0' : 'flex-none w-full'}
            `}
          >
            {examplesPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
