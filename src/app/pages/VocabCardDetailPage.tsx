import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  BookMarked,
  Trash2,
  ArrowLeft,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { VocabCardItem } from '../store/useStore';
import { aiGenerateVocabCardOriginalDaily, aiGenerateVocabCardRegisterGuide } from '../utils/api';
import { pickWordLabCollocations } from '../utils/wordLabCollocations';
import {
  buildWordLabTags,
  mergeStandardizedTags,
  VOCAB_TAG_OPTION_GROUPS,
} from '../utils/vocabCardScenarioTags';
import { isVocabCardDue } from '../utils/vocabCardReview';
import { pickCollocationForCloze } from '../utils/reviewGate';
import { VocabReproducePanel } from '../components/VocabReproducePanel';
import { VocabRegisterGuideCard } from '../components/VocabRegisterGuideCard';

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

function hasDetailedRegisterGuide(card: {
  registerNoteZh?: string;
  registerGuide?: {
    anchorZh?: string;
    alternatives?: Array<{ usageZh?: string }>;
    compareExamples?: { original?: string; spoken?: string };
    pitfalls?: string[];
    coreCollocations?: string[];
  };
}): boolean {
  const guide = card.registerGuide;
  const alternativesWithUsage = guide?.alternatives?.filter((alt) => alt.usageZh?.trim()) || [];
  return Boolean(
    card.registerNoteZh?.trim() &&
      guide?.anchorZh?.trim() &&
      alternativesWithUsage.length >= 2 &&
      guide?.compareExamples?.original?.trim() &&
      guide?.compareExamples?.spoken?.trim() &&
      (guide?.pitfalls?.length ?? 0) >= 1 &&
      (guide?.coreCollocations?.length ?? 0) >= 2
  );
}

export function VocabCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();

  const card = useMemo(() => store.vocabCards.find(c => c.id === id), [store.vocabCards, id]);
  const [tagsEditingOpen, setTagsEditingOpen] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  /** true = 用户主动隐藏中文翻译；默认不记录即「默认显示中文」 */
  const [zhHiddenById, setZhHiddenById] = useState<Record<string, boolean>>({});
  const [passedReproItemIds, setPassedReproItemIds] = useState<Set<string>>(() => new Set());
  const [origLoading, setOrigLoading] = useState(false);
  const [origError, setOrigError] = useState<string | null>(null);
  const [registerGuideOpen, setRegisterGuideOpen] = useState(false);
  const [registerGuideLoading, setRegisterGuideLoading] = useState(false);
  const [registerGuideError, setRegisterGuideError] = useState<string | null>(null);

  useEffect(() => {
    setTagsEditingOpen(false);
    setZhHiddenById({});
    setPassedReproItemIds(new Set());
    setOrigError(null);
    setRegisterGuideOpen(false);
    setRegisterGuideLoading(false);
    setRegisterGuideError(null);
  }, [id]);

  const itemIdsKey = card?.items?.map(i => i.id).join('|') ?? '';

  useEffect(() => {
    if (!card?.items.length) {
      setExpandedItemIds(new Set());
      return;
    }
    setExpandedItemIds(prev => {
      const next = new Set(
        [...prev].filter((itemId) => card.items.some((it) => it.id === itemId))
      );
      if (next.size === 0 && card.items[0]?.id) {
        next.add(card.items[0].id);
      }
      return next;
    });
  }, [card?.id, itemIdsKey]);

  const toggleZh = useCallback((itemId: string) => {
    setZhHiddenById(m => ({ ...m, [itemId]: !m[itemId] }));
  }, []);

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const displayItems = useMemo(() => {
    if (!card) return [];
    return [...card.items].sort((a, b) => {
      const rank = (t: string) => (t === '原词日常' ? 1 : 0);
      return rank(a.topic) - rank(b.topic);
    });
  }, [card]);

  const needsOriginalDailyRow = useMemo(() => {
    if (!card) return false;
    const spoken = card.spokenPracticePhrase?.trim();
    if (!spoken) return false;
    if (spoken.toLowerCase() === card.headword.trim().toLowerCase()) return false;
    return !card.items.some(it => it.topic === '原词日常');
  }, [card]);

  const appendOriginalDailyItem = useCallback(async () => {
    const c = store.vocabCards.find(x => x.id === id);
    if (!c) return;
    setOrigLoading(true);
    setOrigError(null);
    try {
      const collocations = pickWordLabCollocations();
      const res = await aiGenerateVocabCardOriginalDaily({
        headword: c.headword,
        sense: c.sense,
        collocations,
      });
      const newItem: VocabCardItem = {
        id: `${c.id}-i${c.items.length}`,
        questionId: 'daily',
        part: 0,
        topic: '原词日常',
        questionSnapshot: '',
        sentence: res.item.sentence,
        collocationsUsed: res.item.collocationsUsed,
        chinese: res.item.chinese,
      };
      const tagExtra = buildWordLabTags({
        headword: c.headword,
        items: [...c.items, newItem],
        isCommonInSpokenEnglish: c.isCommonInSpokenEnglish ?? true,
        registerGuide: c.registerGuide,
      });
      const mergedTags = mergeStandardizedTags(c.tags, tagExtra);
      store.updateVocabCard(c.id, {
        items: [...c.items, newItem],
        tags: mergedTags,
      });
      setExpandedItemIds(prev => new Set(prev).add(newItem.id));
    } catch (e: unknown) {
      setOrigError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setOrigLoading(false);
    }
  }, [id, store]);

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

  const closeTagEditor = () => {
    setTagsEditingOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    store.updateVocabCard(card.id, {
      tags: card.tags.filter(t => t !== tagToRemove),
    });
  };

  const togglePresetTag = (tag: string) => {
    const next = card.tags.includes(tag)
      ? card.tags.filter(t => t !== tag)
      : mergeStandardizedTags(card.tags, [tag]);
    store.updateVocabCard(card.id, { tags: next });
  };

  const isDue = isVocabCardDue(card.nextDueAt);
  const anyReproPassed = passedReproItemIds.size > 0;
  const hasRegisterShift =
    !!card.spokenPracticePhrase &&
    card.spokenPracticePhrase.trim().toLowerCase() !== card.headword.trim().toLowerCase();
  const hasRegisterAnalysis =
    !!card.registerGuide ||
    !!card.registerNoteZh?.trim() ||
    (card.spokenAlternatives?.length ?? 0) > 0;
  const registerGuideDetailed = hasDetailedRegisterGuide(card);
  const targetPhraseForItem = (it: (typeof card.items)[0]) =>
    pickCollocationForCloze(it.sentence, it.collocationsUsed) ||
    it.collocationsUsed[0] ||
    card.spokenPracticePhrase ||
    card.headword;

  const hydrateRegisterGuide = useCallback(async () => {
    const current = store.vocabCards.find(c => c.id === id);
    if (!current || registerGuideLoading || hasDetailedRegisterGuide(current)) return;
    setRegisterGuideLoading(true);
    setRegisterGuideError(null);
    try {
      const res = await aiGenerateVocabCardRegisterGuide({
        headword: current.headword,
        sense: current.sense,
      });
      const autoTags = buildWordLabTags({
        headword: current.headword,
        items: current.items,
        isCommonInSpokenEnglish: res.isCommonInSpokenEnglish,
        registerGuide: res.registerGuide,
      });
      store.updateVocabCard(current.id, {
        spokenPracticePhrase: res.spokenPracticePhrase,
        writtenSupplement: res.writtenSupplement ?? undefined,
        registerNoteZh: res.registerNoteZh,
        registerGuide: res.registerGuide,
        spokenAlternatives: res.spokenAlternatives,
        isCommonInSpokenEnglish: res.isCommonInSpokenEnglish,
        tags: mergeStandardizedTags(autoTags, current.tags),
      });
    } catch (e: unknown) {
      setRegisterGuideError(e instanceof Error ? e.message : '语体解析补全失败');
    } finally {
      setRegisterGuideLoading(false);
    }
  }, [id, registerGuideLoading, store]);

  const toggleRegisterGuideOpen = useCallback(() => {
    setRegisterGuideOpen(prev => {
      const next = !prev;
      if (next && !registerGuideDetailed && !registerGuideLoading) {
        void hydrateRegisterGuide();
      }
      return next;
    });
  }, [hydrateRegisterGuide, registerGuideDetailed, registerGuideLoading]);

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
                  <div className="mt-1.5 space-y-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
                    <div className="min-w-0 flex-1 text-gray-500">
                      <p className="leading-snug">
                        {hasRegisterShift ? (
                          <>
                            日常里更常说 <span className="text-gray-800 font-medium">{card.spokenPracticePhrase}</span>
                          </>
                        ) : (
                          <>这个词本身就能直接用于日常口语</>
                        )}
                      </p>
                    </div>
                    <p className="text-gray-400 shrink-0 text-right tabular-nums leading-snug">
                      阶段 {card.reviewStage}
                      {card.nextDueAt
                        ? ` · 提醒 ${new Date(card.nextDueAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </p>
                  </div>
                  {card.sense && <p className="text-[11px] text-gray-500">{card.sense}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 标签（并入同一张卡片） */}
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
            {!tagsEditingOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
                  {card.tags.length === 0 ? (
                    <p className="text-xs text-gray-400">暂无标签</p>
                  ) : (
                    card.tags.map((t, i) => (
                      <span
                        key={`${t}-${i}`}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700"
                      >
                        {t}
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTagsEditingOpen(true)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded-lg hover:bg-violet-50 shrink-0 self-center"
                >
                  编辑标签
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
                    {card.tags.length > 0 ? (
                      card.tags.map((t, i) => (
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
                            <X size={12} strokeWidth={2} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">暂无标签</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeTagEditor}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded-lg hover:bg-violet-50 shrink-0 self-center"
                  >
                    完成
                  </button>
                </div>
                <div className="rounded-lg border border-gray-100 bg-slate-50/60 px-2 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-500">标准标签</span>
                    <span className="text-[10px] text-gray-400">建议控制在 2-4 个</span>
                  </div>
                  {VOCAB_TAG_OPTION_GROUPS.map(group => (
                    <div key={group.label} className="space-y-1">
                      <p className="text-[10px] text-gray-400">{group.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.tags.map(tag => {
                          const selected = card.tags.includes(tag);
                          const disabled = !selected && card.tags.length >= 4;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => togglePresetTag(tag)}
                              disabled={disabled}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                selected
                                  ? 'border-violet-200 bg-violet-50 text-violet-800'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:text-violet-700'
                              } ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {hasRegisterAnalysis ? (
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={toggleRegisterGuideOpen}
                  className="w-full inline-flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5 text-left hover:bg-violet-50 transition-colors"
                  aria-expanded={registerGuideOpen}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 shrink-0">语体解析</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {registerGuideOpen ? '点击收起' : '点击展开'}
                    </p>
                  </div>
                  {registerGuideOpen ? (
                    <ChevronUp size={18} className="text-violet-500 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-violet-500 shrink-0" />
                  )}
                </button>
                {registerGuideOpen ? (
                  registerGuideLoading && !registerGuideDetailed ? (
                    <div className="rounded-xl border border-violet-200 ring-1 ring-violet-100/80 bg-violet-50/20 p-3">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-4 flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 size={16} className="animate-spin text-violet-500 shrink-0" />
                        <span>正在补全语体解析…</span>
                      </div>
                    </div>
                  ) : registerGuideError && !registerGuideDetailed ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/60 px-3 py-3 space-y-2">
                      <p className="text-sm text-red-700">{registerGuideError}</p>
                      <button
                        type="button"
                        onClick={() => void hydrateRegisterGuide()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium hover:bg-red-50"
                      >
                        <RefreshCw size={14} className="shrink-0" />
                        重新补全
                      </button>
                    </div>
                  ) : (
                    <VocabRegisterGuideCard
                      headword={card.headword}
                      spokenPracticePhrase={card.spokenPracticePhrase}
                      registerGuide={card.registerGuide}
                      registerNoteZh={card.registerNoteZh}
                      spokenAlternatives={card.spokenAlternatives}
                    />
                  )
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 例句区：中间可滚动 */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
              {displayItems.map(it => {
                const open = expandedItemIds.has(it.id);
                const primaryLine = itemCollapsedPrimaryLine(it);
                const isColloquialWordLabRow =
                  it.part === 0 &&
                  (it.topic === '日常用语' ||
                    (!it.topic?.trim() && !it.questionSnapshot?.trim()));
                const isOriginalDailyWordLabRow = it.part === 0 && it.topic === '原词日常';
                const showHeaderMeta = open && it.collocationsUsed.length > 0;
                const headerBadgeClassName = isColloquialWordLabRow
                  ? 'text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0'
                  : isOriginalDailyWordLabRow
                    ? 'text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-100 px-2 py-0.5 rounded-full shrink-0'
                    : 'text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded shrink-0';
                const headerBadgeLabel = isColloquialWordLabRow
                  ? '口语'
                  : isOriginalDailyWordLabRow
                    ? '原词·日常'
                    : it.part === 0
                      ? '日常'
                      : `Part ${it.part}`;

                return (
                  <div
                    key={it.id}
                    className={`rounded-xl border overflow-hidden transition-colors ${
                      open ? 'border-violet-200 ring-1 ring-violet-100 bg-violet-50/20' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItemExpanded(it.id)}
                      className={`w-full flex gap-2 text-left px-3 py-2.5 hover:bg-gray-50/80 transition-colors ${
                        open ? 'items-center min-h-[2.75rem]' : 'items-start'
                      }`}
                    >
                      {open ? (
                        <>
                          <div className="flex-1 min-w-0">
                            {showHeaderMeta ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {it.collocationsUsed.length > 0 ? (
                                  <>
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
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <span className={headerBadgeClassName}>{headerBadgeLabel}</span>
                          <ChevronUp size={18} className="text-gray-400 shrink-0 mt-0.5" />
                        </>
                      ) : (
                        <>
                          <span className={headerBadgeClassName}>{headerBadgeLabel}</span>
                          <div className="flex-1 min-w-0">
                            {!isColloquialWordLabRow && !isOriginalDailyWordLabRow && it.topic && (
                              <span className="text-[11px] text-gray-400 block mb-0.5">{it.topic}</span>
                            )}
                            <p className="text-gray-800 text-sm leading-snug line-clamp-3">{primaryLine}</p>
                          </div>
                          <ChevronDown size={18} className="text-gray-400 shrink-0 mt-0.5" />
                        </>
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
                            完成上方再产出后即可查看例句；任一条目通过即可解锁全部例句。
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
                                  <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium text-gray-900">
                                    {it.sentence}
                                  </p>
                                  {!zhHiddenById[it.id] ? (
                                    <p className="mt-2.5 pl-3 border-l-2 border-violet-300 text-[12.5px] sm:text-[13.5px] leading-relaxed font-normal text-gray-600">
                                      {it.chinese}
                                    </p>
                                  ) : null}
                                </button>
                              ) : (
                                <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                                  <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium text-gray-900">
                                    {it.sentence}
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {needsOriginalDailyRow ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5 mt-1">
                  <p className="text-[11px] text-amber-950/85 leading-relaxed mb-2">
                    上方是更口语的说法；可再生成一条把「{card.headword}」用在日常对话里的例句（聊天、随口评论等，非作文腔）。
                  </p>
                  {origError ? (
                    <p className="text-[11px] text-red-600 mb-2 leading-snug">{origError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={appendOriginalDailyItem}
                    disabled={origLoading}
                    className="inline-flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                  >
                    {origLoading ? <Loader2 size={16} className="animate-spin shrink-0" aria-hidden /> : null}
                    {origLoading ? '生成中…' : '生成原词例句'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
