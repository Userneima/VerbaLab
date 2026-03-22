import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Library, Search, Filter, Download, TrendingUp, BookMarked, Sparkles, Languages, Loader2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { aiTranslateSentence } from '../utils/api';
import { isVocabCardDue } from '../utils/vocabCardReview';

type SortBy = 'newest' | 'oldest' | 'verb';
type FilterVerb = 'all' | string;

export function CorpusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'cards' ? 'cards' : 'sentences';

  const store = useStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterVerb, setFilterVerb] = useState<FilterVerb>('all');
  const [cardSearch, setCardSearch] = useState('');
  const [cardTag, setCardTag] = useState<string>('all');
  const [flashSentenceId, setFlashSentenceId] = useState<string | null>(null);
  const [zhById, setZhById] = useState<Record<string, string>>({});
  const [zhVisible, setZhVisible] = useState<Record<string, boolean>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateErr, setTranslateErr] = useState<string | null>(null);

  const sentenceHighlight = searchParams.get('sentence');

  const uniqueVerbs = useMemo(() => {
    const verbs = new Set(store.corpus.map(e => e.verb));
    return Array.from(verbs).sort();
  }, [store.corpus]);

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
    if (tab !== 'sentences') {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('tab');
        return p;
      });
      return;
    }
    setSearch('');
    setFilterVerb('all');
  }, [sentenceHighlight, store.corpus, tab, setSearchParams]);

  useEffect(() => {
    if (!sentenceHighlight || tab !== 'sentences') return;
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
  }, [sentenceHighlight, filtered, tab, setSearchParams]);

  const handleToggleSentenceZh = useCallback(
    async (id: string, userSentence: string) => {
      setTranslateErr(null);
      if (zhVisible[id]) {
        setZhVisible(v => ({ ...v, [id]: false }));
        return;
      }
      if (zhById[id]) {
        setZhVisible(v => ({ ...v, [id]: true }));
        return;
      }
      setTranslatingId(id);
      try {
        const { translation } = await aiTranslateSentence(userSentence);
        setZhById(v => ({ ...v, [id]: translation }));
        setZhVisible(v => ({ ...v, [id]: true }));
      } catch (e: unknown) {
        setTranslateErr(e instanceof Error ? e.message : '翻译失败');
      } finally {
        setTranslatingId(null);
      }
    },
    [zhById, zhVisible]
  );

  const verbDist = useMemo(() => {
    const dist: Record<string, number> = {};
    store.corpus.forEach(e => {
      dist[e.verb] = (dist[e.verb] || 0) + 1;
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [store.corpus]);

  const allCardTags = useMemo(() => {
    const s = new Set<string>();
    store.vocabCards.forEach(c => c.tags.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [store.vocabCards]);

  const filteredCards = useMemo(() => {
    let list = [...store.vocabCards];
    if (cardSearch.trim()) {
      const q = cardSearch.toLowerCase();
      list = list.filter(
        c =>
          c.headword.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q)) ||
          (c.sense && c.sense.toLowerCase().includes(q))
      );
    }
    if (cardTag !== 'all') {
      list = list.filter(c => c.tags.includes(cardTag));
    }
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list;
  }, [store.vocabCards, cardSearch, cardTag]);

  const handleExport = () => {
    const text = store.corpus
      .map(e => `[${e.verb} · ${e.collocation}]\n${e.userSentence}\n${new Date(e.timestamp).toLocaleDateString()}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluentflow-corpus.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

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
                造句语料（实验室/实战）与单词卡片（词卡工坊）分栏管理
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {tab === 'sentences' && store.corpus.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Download size={15} />
                  导出
                </button>
              )}
              <Link
                to="/word-lab"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <Sparkles size={15} />
                词卡工坊
              </Link>
            </div>
          </div>

          <div className="flex gap-1 mt-4 p-1 bg-gray-100 rounded-xl max-w-md">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'sentences' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              造句语料
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'cards' })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              单词卡片
              {store.stats.vocabCardCount > 0 && (
                <span className="ml-1 text-xs text-violet-600">({store.stats.vocabCardCount})</span>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 space-y-5">
          {tab === 'cards' ? (
            <>
              {store.vocabCards.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookMarked size={28} className="text-violet-600" />
                  </div>
                  <h3 className="text-gray-700 font-semibold mb-2">还没有单词卡片</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto mb-4">
                    在词卡工坊输入单词，生成绑定雅思题与搭配的例句后保存，即可在此查看与复习。
                  </p>
                  <Link
                    to="/word-lab"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                  >
                    <Sparkles size={16} />
                    去词卡工坊
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-violet-600">{store.vocabCards.length}</div>
                      <div className="text-violet-800 text-sm">单词卡片</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-amber-600">{store.stats.vocabDueCount}</div>
                      <div className="text-amber-800 text-sm">待复习</div>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={cardSearch}
                        onChange={e => setCardSearch(e.target.value)}
                        placeholder="搜索单词、标签…"
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
                      />
                    </div>
                    <select
                      value={cardTag}
                      onChange={e => setCardTag(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white min-w-[8rem]"
                    >
                      <option value="all">全部标签</option>
                      {allCardTags.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                      <Filter size={14} />
                      {filteredCards.length} 张
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredCards.map(card => {
                      const due = isVocabCardDue(card.nextDueAt);
                      return (
                        <Link
                          key={card.id}
                          to={`/vocab/${card.id}`}
                          className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm transition-all"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800">{card.headword}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {card.items.length} 条例句 · {new Date(card.timestamp).toLocaleDateString('zh-CN')}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {card.tags.slice(0, 5).map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {t}
                                </span>
                              ))}
                              {card.tags.length > 5 && (
                                <span className="text-[10px] text-gray-400">+{card.tags.length - 5}</span>
                              )}
                            </div>
                          </div>
                          {due && (
                            <span className="shrink-0 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              待复习
                            </span>
                          )}
                        </Link>
                      );
                    })}
                    {filteredCards.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">没有匹配的卡片</div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : store.corpus.length === 0 ? (
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">{store.corpus.length}</div>
                  <div className="text-emerald-700 text-sm">总句数</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-indigo-600">{uniqueVerbs.length}</div>
                  <div className="text-indigo-700 text-sm">涉及动词</div>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-violet-600">
                    {new Set(store.corpus.map(e => e.collocation)).size}
                  </div>
                  <div className="text-violet-700 text-sm">不同搭配</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(store.corpus.reduce((s, e) => s + e.userSentence.split(' ').length, 0) / store.corpus.length) || 0}
                  </div>
                  <div className="text-blue-700 text-sm">平均词数</div>
                </div>
              </div>

              {verbDist.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <h3 className="font-semibold text-gray-700 text-sm">常用动词分布</h3>
                  </div>
                  <div className="space-y-2.5">
                    {verbDist.map(([verb, count]) => (
                      <div key={verb} className="flex items-center gap-3">
                        <div className="w-12 text-sm font-medium text-gray-700">{verb}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${(count / (verbDist[0][1] || 1)) * 100}%` }}
                          />
                        </div>
                        <div className="w-8 text-right text-sm text-gray-500">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
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
              </div>

              {translateErr && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{translateErr}</div>
              )}

              <div className="space-y-3">
                {filtered.map(entry => (
                  <div
                    key={entry.id}
                    id={`corpus-sentence-${entry.id}`}
                    className={`bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow scroll-mt-24 ${
                      flashSentenceId === entry.id ? 'ring-2 ring-indigo-400 ring-offset-2' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 text-sm leading-relaxed mb-2">{entry.userSentence}</p>
                        {zhVisible[entry.id] && zhById[entry.id] && (
                          <p className="text-gray-600 text-sm leading-relaxed mb-2 pt-2 border-t border-gray-100">
                            {zhById[entry.id]}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {entry.verb}
                          </span>
                          <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">
                            {entry.collocation}
                          </span>
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                            {entry.mode === 'test' ? '实验室' : '实战仓'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSentenceZh(entry.id, entry.userSentence)}
                            disabled={translatingId === entry.id}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
                          >
                            {translatingId === entry.id ? (
                              <Loader2 size={12} className="animate-spin shrink-0" />
                            ) : (
                              <Languages size={12} className="shrink-0" />
                            )}
                            {zhVisible[entry.id] ? '收起中文' : '中文'}
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && search && (
                  <div className="text-center py-8 text-gray-400 text-sm">未找到匹配 "{search}" 的句子</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
