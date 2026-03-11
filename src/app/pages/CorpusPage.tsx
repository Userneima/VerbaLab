import { useState, useMemo } from 'react';
import { Library, Search, Filter, Download, Trash2, TrendingUp } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { VERBS } from '../data/verbData';

type SortBy = 'newest' | 'oldest' | 'verb';
type FilterVerb = 'all' | string;

export function CorpusPage() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [filterVerb, setFilterVerb] = useState<FilterVerb>('all');

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

  // Verb distribution
  const verbDist = useMemo(() => {
    const dist: Record<string, number> = {};
    store.corpus.forEach(e => {
      dist[e.verb] = (dist[e.verb] || 0) + 1;
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [store.corpus]);

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
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Library size={20} className="text-emerald-600" />
                <h1 className="font-bold text-gray-800">个人语料库</h1>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">你自己造出来的正确句子 · 符合个人思维逻辑的弹药库</p>
            </div>
            <div className="flex gap-2">
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

        <div className="p-6 space-y-5">
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
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
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

              {/* Verb distribution */}
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

              {/* Filters */}
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
                    <option key={v} value={v}>{v}</option>
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

              {/* Sentence list */}
              <div className="space-y-3">
                {filtered.map(entry => (
                  <div key={entry.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-gray-800 text-sm leading-relaxed mb-2">{entry.userSentence}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {entry.verb}
                          </span>
                          <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full">
                            {entry.collocation}
                          </span>
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                            {entry.mode === 'test' ? '实验室' : '实战仓'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && search && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    未找到匹配 "{search}" 的句子
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
