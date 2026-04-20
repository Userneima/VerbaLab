import { ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import type { VocabCard, VocabCardItem } from '../../store/useStore';
import { pickCollocationForCloze } from '../../utils/reviewGate';
import { VocabReproducePanel } from '../VocabReproducePanel';
import { VocabRegisterGuideCard } from '../VocabRegisterGuideCard';

const PREVIEW_LEN = 120;

function truncatePreview(s: string, max = PREVIEW_LEN): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function itemCollapsedPrimaryLine(it: {
  questionSnapshot: string;
  sentence: string;
}): string {
  const q = it.questionSnapshot?.trim();
  if (q) return truncatePreview(q);
  return truncatePreview(it.sentence);
}

export function hasDetailedRegisterGuide(card: {
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

type VocabCardExamplesSectionProps = {
  card: VocabCard;
  displayItems: VocabCardItem[];
  expandedItemIds: Set<string>;
  zhHiddenById: Record<string, boolean>;
  passedReproItemIds: Set<string>;
  anyReproPassed: boolean;
  isDue: boolean;
  reviewTargetItemId: string | null;
  registerGuideOpen: boolean;
  registerGuideLoading: boolean;
  registerGuideError: string | null;
  registerGuideDetailed: boolean;
  needsOriginalDailyRow: boolean;
  origLoading: boolean;
  origError: string | null;
  onToggleItemExpanded: (itemId: string) => void;
  onToggleZh: (itemId: string) => void;
  onCompleteRepro: (itemId: string) => void;
  onToggleRegisterGuideOpen: () => void;
  onHydrateRegisterGuide: () => void;
  onAppendOriginalDailyItem: () => void;
};

export function VocabCardExamplesSection({
  card,
  displayItems,
  expandedItemIds,
  zhHiddenById,
  passedReproItemIds,
  anyReproPassed,
  isDue,
  reviewTargetItemId,
  registerGuideOpen,
  registerGuideLoading,
  registerGuideError,
  registerGuideDetailed,
  needsOriginalDailyRow,
  origLoading,
  origError,
  onToggleItemExpanded,
  onToggleZh,
  onCompleteRepro,
  onToggleRegisterGuideOpen,
  onHydrateRegisterGuide,
  onAppendOriginalDailyItem,
}: VocabCardExamplesSectionProps) {
  const hasRegisterAnalysis =
    !!card.registerGuide ||
    !!card.registerNoteZh?.trim() ||
    (card.spokenAlternatives?.length ?? 0) > 0;

  const targetPhraseForItem = (item: VocabCardItem) =>
    pickCollocationForCloze(item.sentence, item.collocationsUsed) ||
    item.collocationsUsed[0] ||
    card.spokenPracticePhrase ||
    card.headword;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
      <div className="space-y-3">
        {hasRegisterAnalysis ? (
          <div className="bg-white">
            <div className="space-y-2">
              <button
                type="button"
                onClick={onToggleRegisterGuideOpen}
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
                      onClick={onHydrateRegisterGuide}
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

        <div className="space-y-2">
          {displayItems.map((item) => {
            const open = expandedItemIds.has(item.id);
            const primaryLine = itemCollapsedPrimaryLine(item);
            const isColloquialWordLabRow =
              item.part === 0 &&
              (item.topic === '日常用语' ||
                (!item.topic?.trim() && !item.questionSnapshot?.trim()));
            const isOriginalDailyWordLabRow = item.part === 0 && item.topic === '原词日常';
            const isReviewTargetItem = reviewTargetItemId === item.id;
            const isReviewLockedTarget = isDue && !anyReproPassed && isReviewTargetItem;
            const showHeaderMeta = open && item.collocationsUsed.length > 0;
            const headerBadgeClassName = isColloquialWordLabRow
              ? 'text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full shrink-0'
              : isOriginalDailyWordLabRow
                ? 'text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-100 px-2 py-0.5 rounded-full shrink-0'
                : 'text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded shrink-0';
            const headerBadgeLabel = isColloquialWordLabRow
              ? '口语'
              : isOriginalDailyWordLabRow
                ? '原词·日常'
                : item.part === 0
                  ? '日常'
                  : `Part ${item.part}`;

            return (
              <div
                key={item.id}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  open ? 'border-violet-200 ring-1 ring-violet-100 bg-violet-50/20' : 'border-gray-100 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleItemExpanded(item.id)}
                  className={`w-full flex gap-2 text-left px-3 py-2.5 hover:bg-gray-50/80 transition-colors ${
                    open ? 'items-center min-h-[2.75rem]' : 'items-start'
                  }`}
                >
                  {open ? (
                    <>
                      <div className="flex-1 min-w-0">
                        {showHeaderMeta ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-gray-400 shrink-0">目标搭配</span>
                            <div className="flex flex-wrap gap-1">
                              {item.collocationsUsed.map((phrase) => (
                                <span
                                  key={phrase}
                                  className="text-[11px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-100 font-medium"
                                >
                                  {phrase}
                                </span>
                              ))}
                            </div>
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
                        {!isColloquialWordLabRow && !isOriginalDailyWordLabRow && item.topic ? (
                          <span className="text-[11px] text-gray-400 block mb-0.5">{item.topic}</span>
                        ) : null}
                        <p className="text-gray-800 text-sm leading-snug line-clamp-3">{primaryLine}</p>
                      </div>
                      <ChevronDown size={18} className="text-gray-400 shrink-0 mt-0.5" />
                    </>
                  )}
                </button>
                {open ? (
                  <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-100">
                    {isReviewLockedTarget ? (
                      <div className="pt-3">
                        <VocabReproducePanel
                          key={item.id}
                          referenceSentence={item.sentence}
                          targetCollocation={targetPhraseForItem(item)}
                          cueZh={item.chinese}
                          alreadyPassed={passedReproItemIds.has(item.id)}
                          onComplete={() => onCompleteRepro(item.id)}
                        />
                      </div>
                    ) : null}
                    {isReviewLockedTarget ? (
                      <p className="text-[11px] text-violet-600 leading-relaxed">
                        完成当前复习句子的复原后即可查看例句；任一条目通过即可解锁全部例句。
                      </p>
                    ) : null}
                    {!isReviewLockedTarget ? (
                      <div className="pt-3 space-y-2">
                        {item.chinese ? (
                          <button
                            type="button"
                            onClick={() => onToggleZh(item.id)}
                            className="w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:bg-violet-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                            aria-expanded={!zhHiddenById[item.id]}
                            aria-label={zhHiddenById[item.id] ? '点击例句显示中文翻译' : '点击例句隐藏中文翻译'}
                          >
                            <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium text-gray-900">
                              {item.sentence}
                            </p>
                            {!zhHiddenById[item.id] ? (
                              <p className="mt-2.5 pl-3 border-l-2 border-violet-300 text-[12.5px] sm:text-[13.5px] leading-relaxed font-normal text-gray-600">
                                {item.chinese}
                              </p>
                            ) : null}
                          </button>
                        ) : (
                          <div className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                            <p className="text-[14px] sm:text-[15px] leading-relaxed font-medium text-gray-900">
                              {item.sentence}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {needsOriginalDailyRow ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5 mt-1">
              <p className="text-[11px] text-amber-950/85 leading-relaxed mb-2">
                上方是更口语的说法；可再生成一条把「{card.headword}」用在日常对话里的例句（聊天、随口评论等，非作文腔）。
              </p>
              {origError ? <p className="text-[11px] text-red-600 mb-2 leading-snug">{origError}</p> : null}
              <button
                type="button"
                onClick={onAppendOriginalDailyItem}
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
  );
}
