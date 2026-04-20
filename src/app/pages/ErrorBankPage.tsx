import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Search, CheckCircle2, Filter } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { ErrorCategory } from '../store/useStore';
import { VirtualizedStack } from '../components/VirtualizedStack';
import { aiGrammarCheck } from '../utils/api';
import { ErrorBankEntryCard } from '../components/error-bank/ErrorBankEntryCard';
import { normalizeSentenceForCompare } from '../components/error-bank/errorSentenceDiff';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { label: string }> = {
  grammar: { label: '语法错' },
  collocation: { label: '搭配错' },
  chinglish: { label: '中式表达错' },
};

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
              store.setErrorBankCorrectedSentence(entry.id, corrected);
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
  }, [filtered, store]);

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
                  const cs =
                    backfilledCorrections[entry.id]?.trim() ||
                    entry.correctedSentence?.trim() ||
                    entry.nativeVersion?.trim();
                  const correctionStatus = backfillStatus[entry.id];
                  return (
                    <ErrorBankEntryCard
                      entry={entry}
                      isExpanded={expandedId === entry.id}
                      correctedSentence={cs || undefined}
                      correctionStatus={correctionStatus}
                      onToggleExpanded={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      onDelete={() => deleteErrorEntry(entry.id)}
                      onResolve={() => store.resolveError(entry.id)}
                    />
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
