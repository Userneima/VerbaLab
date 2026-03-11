import { useState, useMemo } from 'react';
import { AlertCircle, Search, CheckCircle2, Filter, BookOpen, Clock, RotateCcw } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { ErrorCategory } from '../store/useStore';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { label: string; color: string }> = {
  grammar: { label: '语法错', color: 'bg-red-100 text-red-700' },
  collocation: { label: '搭配错', color: 'bg-purple-100 text-purple-700' },
  chinglish: { label: '中式表达错', color: 'bg-amber-100 text-amber-700' },
};

const ERROR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  capitalization: { label: '大写规范', color: 'bg-red-100 text-red-700' },
  pronoun_capitalization: { label: '代词大写', color: 'bg-red-100 text-red-700' },
  punctuation: { label: '标点符号', color: 'bg-orange-100 text-orange-700' },
  tense: { label: '动词时态', color: 'bg-purple-100 text-purple-700' },
  article: { label: '冠词使用', color: 'bg-blue-100 text-blue-700' },
  formatting: { label: '格式规范', color: 'bg-gray-100 text-gray-700' },
  completeness: { label: '句子完整性', color: 'bg-yellow-100 text-yellow-700' },
  empty: { label: '输入为空', color: 'bg-gray-100 text-gray-700' },
};

export function ErrorBankPage() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const errorsDueForReview = useMemo(() => {
    const now = new Date().toISOString();
    return store.errorBank.filter(e => !e.resolved && e.nextReviewAt && e.nextReviewAt <= now);
  }, [store.errorBank]);

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
    if (filterCategory !== 'all') result = result.filter(e => (e as any).errorCategory === filterCategory);

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [store.errorBank, search, filterStatus, filterCategory]);

  // Error type stats
  const errorTypeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    store.errorBank
      .filter(e => !e.resolved)
      .forEach(e => {
        e.errorTypes.forEach(t => {
          stats[t] = (stats[t] || 0) + 1;
        });
      });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [store.errorBank]);

  const unresolvedCount = store.errorBank.filter(e => !e.resolved).length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                <h1 className="font-bold text-gray-800">语法错误库</h1>
                {unresolvedCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {unresolvedCount} 待复习
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-0.5">记录你的语法薄弱点，每一条错误都是进步的机会</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
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
              {/* 待重测：24h / 3d / 7d */}
              {errorsDueForReview.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-amber-600" />
                      <h3 className="font-semibold text-amber-800">待重测</h3>
                      <span className="text-amber-600 text-sm">{errorsDueForReview.length} 条到点</span>
                    </div>
                  </div>
                  <p className="text-amber-700 text-xs mb-3">错句按 24 小时 → 3 天 → 7 天重测；通过则进入下一轮，未通过则重置为 24h。</p>
                  <div className="space-y-2">
                    {errorsDueForReview.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                        <span className="text-gray-700 text-sm truncate flex-1">"{entry.originalSentence}"</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => store.scheduleNextReview(entry.id)}
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => store.resetReview(entry.id)}
                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200"
                          >
                            再测
                          </button>
                        </div>
                      </div>
                    ))}
                    {errorsDueForReview.length > 5 && (
                      <p className="text-amber-600 text-xs">还有 {errorsDueForReview.length - 5} 条待重测，在下方列表中可操作</p>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">{unresolvedCount}</div>
                  <div className="text-red-700 text-sm">待复习</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">
                    {store.errorBank.filter(e => e.resolved).length}
                  </div>
                  <div className="text-emerald-700 text-sm">已解决</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-700">{store.errorBank.length}</div>
                  <div className="text-gray-500 text-sm">总错误数</div>
                </div>
              </div>

              {/* Error type breakdown */}
              {errorTypeStats.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3">高频错误类型</h3>
                  <div className="flex flex-wrap gap-2">
                    {errorTypeStats.map(([type, count]) => {
                      const info = ERROR_TYPE_LABELS[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
                      return (
                        <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${info.color}`}>
                          <span>{info.label}</span>
                          <span className="bg-white/60 px-1.5 py-0.5 rounded-full">{count}次</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索句子、搭配、语法点..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
                  />
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['all', 'unresolved', 'resolved'] as FilterStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        filterStatus === s ? 'bg-white shadow text-gray-800' : 'text-gray-500'
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
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        filterCategory === cat ? 'bg-white shadow text-gray-800' : 'text-gray-500'
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

              {/* Error list */}
              <div className="space-y-3">
                {filtered.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className={`bg-white border rounded-xl overflow-hidden transition-all ${
                        entry.resolved ? 'border-gray-100 opacity-70' : 'border-red-100'
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium">
                                {entry.verb} · {entry.collocation}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ERROR_CATEGORY_LABELS[(entry as any).errorCategory || 'grammar'].color}`}>
                                {ERROR_CATEGORY_LABELS[(entry as any).errorCategory || 'grammar'].label}
                              </span>
                              {entry.resolved && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded font-medium">
                                  ✓ 已解决
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed">"{entry.originalSentence}"</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {entry.errorTypes.map((t, i) => {
                                const info = ERROR_TYPE_LABELS[t] || { label: t, color: 'bg-gray-100 text-gray-700' };
                                return (
                                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>
                                    {info.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 shrink-0">
                            {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-red-50 p-4 bg-red-50/50 space-y-3">
                          {/* Diagnosis */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">诊断结果</div>
                            <div className="bg-white border border-red-100 rounded-lg p-3">
                              <p className="text-gray-700 text-sm whitespace-pre-line">{entry.diagnosis}</p>
                            </div>
                          </div>

                          {/* Hint */}
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">提示</div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                              <span>💡</span>
                              <p className="text-amber-800 text-sm">{entry.hint}</p>
                            </div>
                          </div>

                          {/* 中式表达错：母语者正确版本与思维方式 */}
                          {(entry as any).errorCategory === 'chinglish' && ((entry as any).nativeVersion || (entry as any).nativeThinking) && (
                            <div className="space-y-2">
                              {(entry as any).nativeVersion && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">母语者说法</div>
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <p className="text-emerald-800 text-sm">{(entry as any).nativeVersion}</p>
                                  </div>
                                </div>
                              )}
                              {(entry as any).nativeThinking && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">母语者思路</div>
                                  <p className="text-gray-600 text-sm">{(entry as any).nativeThinking}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grammar points */}
                          {entry.grammarPoints.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                相关语法点
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {entry.grammarPoints.map((gp, i) => (
                                  <span key={i} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                                    <BookOpen size={11} />
                                    {gp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 复习操作：通过 / 再测 */}
                          {!entry.resolved && entry.nextReviewAt && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => store.scheduleNextReview(entry.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200"
                              >
                                重测通过
                              </button>
                              <button
                                onClick={() => store.resetReview(entry.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200"
                              >
                                <RotateCcw size={12} />
                                再测
                              </button>
                            </div>
                          )}

                          {/* Actions */}
                          {!entry.resolved && (
                            <button
                              onClick={() => store.resolveError(entry.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              标记为已解决
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {search ? `未找到匹配 "${search}" 的错误记录` : '没有符合条件的记录'}
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
