import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Search, CheckCircle2, Filter, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { ErrorCategory } from '../store/useStore';
import { VirtualizedStack } from '../components/VirtualizedStack';

type FilterStatus = 'all' | 'unresolved' | 'resolved';

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { label: string }> = {
  grammar: { label: '语法错' },
  collocation: { label: '搭配错' },
  chinglish: { label: '中式表达错' },
};

/** AI / 本地校验返回的 error type → 中文标签（键统一小写匹配） */
const ERROR_TYPE_LABELS: Record<string, { label: string }> = {
  capitalization: { label: '大写规范' },
  pronoun_capitalization: { label: '代词大写' },
  punctuation: { label: '标点符号' },
  tense: { label: '动词时态' },
  article: { label: '冠词使用' },
  formatting: { label: '格式规范' },
  completeness: { label: '句子完整性' },
  empty: { label: '输入为空' },
  subject_verb_agreement: { label: '主谓一致' },
  pronoun_agreement: { label: '代词一致' },
  redundancy: { label: '冗余表达' },
  collocation_usage: { label: '搭配用法' },
  word_order: { label: '词序' },
  preposition: { label: '介词' },
  prepositional_phrase: { label: '介词短语' },
  plural_singular: { label: '单复数' },
  number_agreement: { label: '数的一致' },
  verb_form: { label: '动词形式' },
  modal_verb: { label: '情态动词' },
  infinitive_gerund: { label: '不定式与动名词' },
  passive_voice: { label: '被动语态' },
  conditional: { label: '条件句' },
  comparative_superlative: { label: '比较级与最高级' },
  possessive: { label: '所有格' },
  conjunction: { label: '连词' },
  relative_clause: { label: '定语从句' },
  subordinate_clause: { label: '从句' },
  parallel_structure: { label: '平行结构' },
  dangling_modifier: { label: '悬垂修饰语' },
  misplaced_modifier: { label: '修饰语位置' },
  fragment: { label: '句子片段' },
  run_on: { label: '粘连句' },
  run_on_sentence: { label: '粘连句' },
  spelling: { label: '拼写' },
  vocabulary: { label: '用词' },
  word_choice: { label: '选词' },
  register: { label: '语体' },
  collocation: { label: '搭配' },
  syntax: { label: '句法' },
  semantics: { label: '语义' },
  negation: { label: '否定' },
  quantifier: { label: '量词' },
  determiner: { label: '限定词' },
  adverb_placement: { label: '副词位置' },
  adjective_order: { label: '形容词顺序' },
  voice: { label: '语态' },
  aspect: { label: '体（进行/完成）' },
  grammar: { label: '语法' },
  agreement: { label: '一致关系' },
  consistency: { label: '一致性' },
};

const DEFAULT_ERROR_TYPE_STYLE = { label: '' } as const;

const ERROR_TYPE_WORD_ZH: Record<string, string> = {
  subject: '主语',
  verb: '动词',
  agreement: '一致',
  pronoun: '代词',
  redundancy: '冗余',
  collocation: '搭配',
  usage: '用法',
  word: '词',
  order: '顺序',
  tense: '时态',
  plural: '复数',
  singular: '单数',
  passive: '被动',
  active: '主动',
  voice: '语态',
  article: '冠词',
  preposition: '介词',
  punctuation: '标点',
  capitalization: '大小写',
  fragment: '片段',
  clause: '从句',
  relative: '关系',
  modal: '情态',
  comparative: '比较',
  superlative: '最高',
  possessive: '所有格',
  conjunction: '连词',
  spelling: '拼写',
  vocabulary: '词汇',
  syntax: '句法',
  semantic: '语义',
  negation: '否定',
  adverb: '副词',
  adjective: '形容词',
  noun: '名词',
  gerund: '动名词',
  infinitive: '不定式',
  participle: '分词',
  conditional: '条件',
  parallel: '平行',
  structure: '结构',
  dangling: '悬垂',
  misplaced: '错位',
  modifier: '修饰语',
  determiner: '限定词',
  quantifier: '量词',
  register: '语体',
  error: '错误',
  type: '类型',
};

function getErrorTypeStyle(type: string): { label: string } {
  const raw = type.trim();
  if (!raw) return { ...DEFAULT_ERROR_TYPE_STYLE, label: '未分类' };
  const norm = raw.toLowerCase().replace(/-/g, '_');
  const hit = ERROR_TYPE_LABELS[norm];
  if (hit) return hit;
  const parts = norm.split(/_+/).filter(Boolean);
  if (parts.length > 0) {
    const zhParts = parts.map(p => ERROR_TYPE_WORD_ZH[p] || p);
    return { label: zhParts.join('·') };
  }
  return { label: raw };
}

function errorTypeSummary(entry: { errorTypes: string[] }): string {
  const labels = entry.errorTypes.map(t => getErrorTypeStyle(t).label).filter(Boolean);
  return [...new Set(labels)].join('、');
}

/** 展示用：去掉历史记录里「中文标点」类诊断行并重新编号 */
function filterDiagnosisForDisplay(diagnosis: string): string {
  const lines = diagnosis
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(line => !/中文标点|全角标点|全形标点|使用了中文标点/.test(line));
  return lines
    .map((line, i) => {
      const body = line.replace(/^\d+\.\s*/, '').trim();
      return `${i + 1}. ${body}`;
    })
    .join('\n');
}

export function ErrorBankPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const store = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertCircle size={20} className="text-red-500 shrink-0" />
                <h1 className="font-bold text-gray-800 text-base sm:text-lg">语法错误库</h1>
                {unresolvedCount > 0 && (
                  <span className="text-xs text-gray-500 font-medium tabular-nums">{unresolvedCount} 条待处理</span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-0.5">记录薄弱点；展开查看诊断与范例，处理完后可标记已解决</p>
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
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">{unresolvedCount}</div>
                    <div className="text-xs text-gray-500 mt-1.5">待复习</div>
                  </div>
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">{resolvedCount}</div>
                    <div className="text-xs text-gray-500 mt-1.5">已解决</div>
                  </div>
                  <div className="px-4 py-3.5 sm:px-5">
                    <div className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">{totalCount}</div>
                    <div className="text-xs text-gray-500 mt-1.5">总计</div>
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
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
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
                  const isExpanded = expandedId === entry.id;
                  const cat = entry.errorCategory ?? 'grammar';
                  const typeLine = errorTypeSummary(entry);
                  const cs = entry.correctedSentence?.trim();
                  const diagnosisShown = filterDiagnosisForDisplay(entry.diagnosis);
                  return (
                    <div
                      key={entry.id}
                      id={`error-row-${entry.id}`}
                      className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition-shadow scroll-mt-24 ${
                        entry.resolved ? 'opacity-[0.92]' : ''
                      } ${isExpanded ? 'ring-1 ring-gray-200 shadow-sm' : 'hover:border-gray-300'}`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        className="w-full text-left p-4 sm:p-5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedId(isExpanded ? null : entry.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {cs ? (
                              <p className="text-[15px] sm:text-base font-medium text-gray-900 leading-relaxed text-pretty">
                                {cs}
                              </p>
                            ) : null}
                            <p
                              className={`leading-relaxed text-pretty ${
                                cs
                                  ? 'text-sm text-gray-500 line-through decoration-gray-400'
                                  : 'text-[15px] sm:text-base font-medium text-gray-900'
                              }`}
                            >
                              {entry.originalSentence}
                            </p>
                            {entry.resolved ? (
                              <p className="text-xs text-emerald-700 font-medium">已解决</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[11px] text-gray-400 tabular-nums">
                              {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                deleteErrorEntry(entry.id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-red-600 px-2 py-1 rounded-md border border-transparent hover:border-red-100 hover:bg-red-50/50 transition-colors"
                            >
                              <Trash2 size={12} aria-hidden />
                              删除
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-5 sm:px-5 space-y-5">
                          <section className="space-y-2">
                            {cs ? (
                              <p className="text-base font-medium text-gray-900 leading-relaxed text-pretty">{cs}</p>
                            ) : null}
                            <p
                              className={`leading-relaxed text-pretty ${
                                cs
                                  ? 'text-sm text-gray-500 line-through decoration-gray-400'
                                  : 'text-base font-medium text-gray-900'
                              }`}
                            >
                              {entry.originalSentence}
                            </p>
                          </section>

                          {diagnosisShown ? (
                            <section>
                              <h2 className="text-sm font-semibold text-gray-900 mb-2">诊断结果</h2>
                              <div className="text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-gray-300 whitespace-pre-line">
                                {diagnosisShown}
                              </div>
                            </section>
                          ) : null}

                          {(entry as { errorCategory?: ErrorCategory }).errorCategory === 'chinglish' &&
                            ((entry as { nativeVersion?: string }).nativeVersion ||
                              (entry as { nativeThinking?: string }).nativeThinking) && (
                              <section className="space-y-4">
                                {(entry as { nativeVersion?: string }).nativeVersion && (
                                  <div>
                                    <h2 className="text-sm font-semibold text-gray-900 mb-2">母语者说法</h2>
                                    <p className="text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-gray-300">
                                      {(entry as { nativeVersion: string }).nativeVersion}
                                    </p>
                                  </div>
                                )}
                                {(entry as { nativeThinking?: string }).nativeThinking && (
                                  <div>
                                    <h2 className="text-sm font-semibold text-gray-900 mb-2">母语者思路</h2>
                                    <p className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-200">
                                      {(entry as { nativeThinking: string }).nativeThinking}
                                    </p>
                                  </div>
                                )}
                              </section>
                            )}

                          <section>
                            <h2 className="text-sm font-semibold text-gray-900 mb-2">语法点和来源</h2>
                            <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-3 space-y-3 text-sm text-gray-700">
                              <p className="leading-relaxed">
                                <span className="font-medium text-gray-800">来源</span>
                                <span className="text-gray-300 mx-1.5">·</span>
                                <span className="text-gray-700">{entry.verb}</span>
                                <span className="text-gray-300 mx-1.5">·</span>
                                <span>{entry.collocation}</span>
                                <span className="text-gray-300 mx-1.5">·</span>
                                <span>{ERROR_CATEGORY_LABELS[cat].label}</span>
                              </p>
                              {typeLine ? (
                                <div>
                                  <span className="font-medium text-gray-800">错误类型</span>
                                  <span className="text-gray-300 mx-1.5">·</span>
                                  <span>{typeLine}</span>
                                </div>
                              ) : null}
                              {entry.grammarPoints.length > 0 ? (
                                <div>
                                  <div className="font-medium text-gray-800 mb-2">语法点</div>
                                  <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                                    {entry.grammarPoints.map((gp, i) => (
                                      <li
                                        key={i}
                                        className="text-xs text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md"
                                      >
                                        {gp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          </section>

                          {!entry.resolved && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => store.resolveError(entry.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                              >
                                <CheckCircle2 size={16} />
                                标记为已解决
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
