import { useState, useMemo } from 'react';
import { LifeBuoy, Search, Filter, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../store/StoreContext';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

export function StuckPointsPage() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const unresolved = store.stuckPoints.filter(s => !s.resolved).length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy size={20} className="text-amber-600" />
                <h1 className="font-bold text-gray-800">卡壳点记录</h1>
                {unresolved > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    {unresolved} 未解决
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-0.5">
                实战仓中点击「卡壳」并输入中文思路后，AI 建议会保存在此，便于回顾与复盘
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {store.stuckPoints.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LifeBuoy size={28} className="text-amber-600" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">还没有卡壳记录</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                在实战仓练习口语时，遇到说不出口的情况可点击「卡壳」，记录中文想法并获取平替表达
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
                {filtered.map(entry => (
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
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={14} className="text-amber-600 shrink-0" />
                            <span className="text-sm font-medium text-gray-800 line-clamp-2">
                              {entry.chineseThought}
                            </span>
                          </div>
                          {entry.englishAttempt ? (
                            <p className="text-xs text-gray-500 line-clamp-2 pl-5">尝试：{entry.englishAttempt}</p>
                          ) : null}
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
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">中文思路</div>
                            <p className="text-sm text-gray-800">{entry.chineseThought}</p>
                          </div>
                          {entry.englishAttempt ? (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">当时英文尝试</div>
                              <p className="text-sm text-gray-700">{entry.englishAttempt}</p>
                            </div>
                          ) : null}
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 mb-2">
                              <Sparkles size={14} />
                              AI 调度建议
                            </div>
                            <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                              {entry.aiSuggestion}
                            </p>
                          </div>
                          <div className="flex justify-end">
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
                ))}
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
