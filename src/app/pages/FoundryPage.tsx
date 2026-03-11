import { useState, useMemo, useCallback } from 'react';
import { Search, CheckCircle2, Circle, ChevronRight, BookOpen, TrendingUp, Layers, Languages } from 'lucide-react';
import { VERBS, Verb, Collocation } from '../data/verbData';
import { useStore } from '../store/StoreContext';

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

export function FoundryPage() {
  const store = useStore();
  const firstVerbId = DAILY_VERBS[0]?.id ?? VERBS[0].id;
  const [selectedVerbId, setSelectedVerbId] = useState<string>(firstVerbId);
  const [selectedCollocation, setSelectedCollocation] = useState<Collocation | null>(null);
  const [search, setSearch] = useState('');
  const [showTranslationGlobal, setShowTranslationGlobal] = useState(getStoredShowTranslation);
  const [clickedExampleKey, setClickedExampleKey] = useState<string | null>(null);

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Verb List Sidebar */}
      <div className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
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
        <div className="flex-1 overflow-y-auto">
          {filteredVerbs.map(verb => {
            const isSelected = verb.id === selectedVerbId;
            const pct = Math.round((verb.learnedCount / verb.collocations.length) * 100);
            return (
              <button
                key={verb.id}
                onClick={() => { setSelectedVerbId(verb.id); setSelectedCollocation(null); setClickedExampleKey(null); }}
                className={`w-full px-4 py-3 text-left border-b border-gray-50 transition-colors ${
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

      {/* Collocation Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Verb Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{selectedVerb.verb}</h1>
                <span className="text-gray-400 text-lg">/</span>
                <span className="text-gray-500 text-base">{selectedVerb.meaning}</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                共 {selectedVerb.collocations.length} 个搭配 · 已学 {verbLearnedCount} 个
              </p>
            </div>
            <div className="flex items-center gap-3">
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

        <div className="flex flex-1 overflow-hidden">
          {/* Collocation list */}
          <div className="w-72 border-r border-gray-100 overflow-y-auto bg-gray-50 p-4 space-y-2">
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
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {col.phrase}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">{col.meaning}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSelected && <ChevronRight size={14} className="text-indigo-400" />}
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleLearned(col.id); }}
                        className="shrink-0"
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
          </div>

          {/* Example sentences: 仅展示母语者日常例句 */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedCollocation ? (() => {
              const dailyExamples = selectedCollocation.examples.filter(ex => ex.scenario === 'daily');
              return (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-gray-900">{selectedCollocation.phrase}</h2>
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                          {selectedVerb.verb}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Layers size={12} />
                          {dailyExamples.length} 句
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">{selectedCollocation.meaning}</p>
                    </div>
                    <button
                      onClick={() => handleToggleLearned(selectedCollocation.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
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

                  <div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        母语者日常例句
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
                      {dailyExamples.map((ex, i) => {
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
                      {dailyExamples.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          暂无日常口语例句
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen size={28} className="text-indigo-500" />
                </div>
                <h3 className="text-gray-700 font-semibold mb-2">选择一个搭配</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                  从左侧选择搭配，查看母语者日常例句（仅保留口语搭配，已剔除书面语），学完后标记为已学习
                </p>
                <div className="mt-4 flex gap-2 text-xs text-gray-400">
                  <TrendingUp size={14} />
                  <span>已学 {verbLearnedCount}/{selectedVerb.collocations.length} 个搭配</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
