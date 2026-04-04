import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  BookMarked,
  Trash2,
  ArrowLeft,
  Check,
  ThumbsUp,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { isVocabCardDue } from '../utils/vocabCardReview';
import { pickCollocationForCloze } from '../utils/reviewGate';
import { VocabReproducePanel } from '../components/VocabReproducePanel';

const PREVIEW_LEN = 120;

function truncatePreview(s: string, max = PREVIEW_LEN): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 折叠行主文案：优先题干快照，否则直接展示例句（避免「日常用语」重复三遍） */
function itemCollapsedPrimaryLine(it: {
  questionSnapshot: string;
  sentence: string;
}): string {
  const q = it.questionSnapshot?.trim();
  if (q) return truncatePreview(q);
  return truncatePreview(it.sentence);
}

export function VocabCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();

  const card = useMemo(() => store.vocabCards.find(c => c.id === id), [store.vocabCards, id]);
  const [tagInput, setTagInput] = useState('');
  const [tagsEditingOpen, setTagsEditingOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  /** true = 用户主动隐藏中文翻译；默认不记录即「默认显示中文」 */
  const [zhHiddenById, setZhHiddenById] = useState<Record<string, boolean>>({});
  const [passedReproItemIds, setPassedReproItemIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setTagsEditingOpen(false);
    setTagInput('');
    setZhHiddenById({});
    setPassedReproItemIds(new Set());
  }, [id]);

  const itemIdsKey = card?.items?.map(i => i.id).join('|') ?? '';

  useEffect(() => {
    if (!card?.items.length) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(prev =>
      prev && card.items.some(it => it.id === prev) ? prev : card.items[0].id
    );
  }, [card?.id, itemIdsKey]);

  const toggleZh = useCallback((itemId: string) => {
    setZhHiddenById(m => ({ ...m, [itemId]: !m[itemId] }));
  }, []);

  useEffect(() => {
    setZhHiddenById({});
  }, [expandedItemId]);

  if (!card) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 text-sm mb-4">找不到这张卡片</p>
        <Link to="/vocab-review" className="text-indigo-600 text-sm font-medium hover:underline">
          返回单词卡片
        </Link>
      </div>
    );
  }

  const saveTags = () => {
    const next = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    if (next.length === 0) return;
    store.updateVocabCard(card.id, { tags: Array.from(new Set([...card.tags, ...next])) });
    setTagInput('');
  };

  const closeTagEditor = () => {
    setTagsEditingOpen(false);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    store.updateVocabCard(card.id, {
      tags: card.tags.filter(t => t !== tagToRemove),
    });
  };

  const isDue = isVocabCardDue(card.nextDueAt);
  const anyReproPassed = passedReproItemIds.size > 0;
  const reproFooterBlocked = isDue && !anyReproPassed;
  const targetPhraseForItem = (it: (typeof card.items)[0]) =>
    pickCollocationForCloze(it.sentence, it.collocationsUsed) ||
    it.collocationsUsed[0] ||
    card.spokenPracticePhrase ||
    card.headword;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-100">
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4">
        <div className="max-w-2xl mx-auto w-full flex-1 min-h-0 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* —— 图一：顶部信息 —— */}
          <div className="shrink-0 px-4 pt-3 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft size={14} />
                返回
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('确定删除整张单词卡片？')) {
                    store.deleteVocabCard(card.id);
                    navigate('/vocab-review');
                  }
                }}
                className="flex items-center gap-1 text-xs text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <BookMarked size={18} className="text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">{card.headword}</h1>
                  {isDue && (
                    <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      待复习
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-1.5 space-y-0.5">
                  {card.spokenPracticePhrase &&
                    card.spokenPracticePhrase.trim().toLowerCase() !== card.headword.trim().toLowerCase() && (
                      <p>
                        口语表述：<span className="text-gray-800">{card.spokenPracticePhrase}</span>
                      </p>
                    )}
                  {card.writtenSupplement && <p>书面：{card.writtenSupplement}</p>}
                  {card.sense && <p>{card.sense}</p>}
                  <p className="text-gray-400">
                    阶段 {card.reviewStage}
                    {card.nextDueAt
                      ? ` · 提醒 ${new Date(card.nextDueAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 标签（并入同一张卡片） */}
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-gray-500">标签</span>
              {!tagsEditingOpen ? (
                <button
                  type="button"
                  onClick={() => setTagsEditingOpen(true)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded-lg hover:bg-violet-50"
                >
                  编辑标签
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeTagEditor}
                  className="text-xs font-medium text-gray-600 hover:text-gray-800 px-2 py-0.5 rounded-lg hover:bg-gray-100"
                >
                  完成
                </button>
              )}
            </div>
            {!tagsEditingOpen ? (
              card.tags.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">暂无标签</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {card.tags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2 mt-2">
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((t, i) => (
                      <span
                        key={`${t}-${i}`}
                        className="inline-flex items-center gap-0.5 text-xs pl-2 pr-1 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                          aria-label={`删除标签 ${t}`}
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder="追加标签，逗号分隔"
                    className="flex-1 min-w-[10rem] border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveTags}
                    className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                  >
                    添加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 例句区：中间可滚动 */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
              {card.items.map(it => {
                const open = expandedItemId === it.id;
                const primaryLine = itemCollapsedPrimaryLine(it);
                const isDailyWordLab =
                  it.part === 0 && (it.topic === '日常用语' || !it.questionSnapshot?.trim());

                return (
                  <div
                    key={it.id}
                    className={`rounded-xl border overflow-hidden transition-colors ${
                      open ? 'border-violet-200 ring-1 ring-violet-100 bg-violet-50/20' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedItemId(open ? null : it.id)}
                      className={`w-full flex gap-2 text-left px-3 py-2.5 hover:bg-gray-50/80 transition-colors ${
                        open ? 'items-center min-h-[2.75rem]' : 'items-start'
                      }`}
                    >
                      {isDailyWordLab ? (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                          例句
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded shrink-0">
                          {it.part === 0 ? '日常' : `Part ${it.part}`}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        {!isDailyWordLab && it.topic && !open && (
                          <span className="text-[11px] text-gray-400 block mb-0.5">{it.topic}</span>
                        )}
                        {/* 展开后例句只在下方展示一次，标题行不再重复 */}
                        {!open && (
                          <p className="text-gray-800 text-sm leading-snug line-clamp-3">{primaryLine}</p>
                        )}
                      </div>
                      {open ? (
                        <ChevronUp size={18} className="text-gray-400 shrink-0 mt-0.5" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                    {open && (
                      <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-100">
                        {isDue && !anyReproPassed && (
                          <div className="pt-3">
                            <VocabReproducePanel
                              key={it.id}
                              referenceSentence={it.sentence}
                              targetCollocation={targetPhraseForItem(it)}
                              cueZh={it.chinese}
                              alreadyPassed={false}
                              onComplete={() =>
                                setPassedReproItemIds(prev => new Set(prev).add(it.id))
                              }
                            />
                          </div>
                        )}
                        {isDue && !anyReproPassed && (
                          <p className="text-[11px] text-violet-600 leading-relaxed">
                            完成上方再产出后即可查看例句；任一条目通过即可解锁全部例句与下方复习按钮。
                          </p>
                        )}
                        {(!isDue || anyReproPassed) && (
                          <>
                            <div className="pt-3 space-y-2">
                              {it.chinese ? (
                                <button
                                  type="button"
                                  onClick={() => toggleZh(it.id)}
                                  className="w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-violet-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                                  aria-expanded={!zhHiddenById[it.id]}
                                  aria-label={zhHiddenById[it.id] ? '点击例句显示中文翻译' : '点击例句隐藏中文翻译'}
                                >
                                  <p className="text-sm leading-relaxed font-medium text-gray-900">{it.sentence}</p>
                                  {!zhHiddenById[it.id] ? (
                                    <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed mt-2.5 pl-3 border-l-2 border-violet-300">
                                      {it.chinese}
                                    </p>
                                  ) : null}
                                </button>
                              ) : (
                                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                                  <p className="text-sm leading-relaxed font-medium text-gray-900">{it.sentence}</p>
                                </div>
                              )}
                            </div>
                            {it.collocationsUsed.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[10px] text-gray-400 shrink-0">目标搭配</span>
                                <div className="flex flex-wrap gap-1">
                                  {it.collocationsUsed.map(p => (
                                    <span
                                      key={p}
                                      className="text-[11px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-100 font-medium"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {card.registerNoteZh?.trim() ? (
            <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
              <div className="rounded-xl border border-violet-200 ring-1 ring-violet-100/80 bg-violet-50/20 p-3">
                <div className="mb-2">
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    平时怎么说
                  </span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                  <p className="text-sm sm:text-[15px] text-gray-800 leading-relaxed">{card.registerNoteZh.trim()}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* 底部复习操作（同一张卡片内） */}
          <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-slate-50/90 rounded-b-2xl">
            {isDue ? (
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                到期：须完成一条目下的填空与造句后，方可标记复习。
              </p>
            ) : null}
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={() => store.markVocabCardViewed(card.id)}
                disabled={reproFooterBlocked}
                title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 rounded-lg bg-white border border-violet-200 text-violet-800 text-xs sm:text-sm font-medium hover:bg-violet-50 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Check size={16} className="shrink-0" aria-hidden />
                <span className="truncate">已浏览</span>
              </button>
              <button
                type="button"
                onClick={() => store.markVocabCardRemembered(card.id)}
                disabled={reproFooterBlocked}
                title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <ThumbsUp size={16} className="shrink-0" aria-hidden />
                <span className="truncate">记住了</span>
              </button>
              <button
                type="button"
                onClick={() => store.markVocabCardStruggled(card.id)}
                disabled={reproFooterBlocked}
                title={reproFooterBlocked ? '请先完成至少一条目的再产出' : undefined}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 rounded-lg bg-amber-100 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium hover:bg-amber-200/80 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <HelpCircle size={16} className="shrink-0" aria-hidden />
                <span className="truncate">还不太熟</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
