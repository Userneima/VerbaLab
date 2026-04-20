import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useStore } from '../store/StoreContext';
import type { VocabCardItem } from '../store/useStore';
import { aiGenerateVocabCardOriginalDaily, aiGenerateVocabCardRegisterGuide } from '../utils/api';
import { pickWordLabCollocations } from '../utils/wordLabCollocations';
import {
  buildWordLabTags,
  mergeStandardizedTags,
} from '../utils/vocabCardScenarioTags';
import { isVocabCardDue } from '../utils/vocabCardReview';
import {
  VocabCardExamplesSection,
  hasDetailedRegisterGuide,
} from '../components/vocab/VocabCardExamplesSection';
import { VocabCardDetailHeader } from '../components/vocab/VocabCardDetailHeader';
import { VocabCardReviewActions } from '../components/vocab/VocabCardReviewActions';
import { VocabCardTagSection } from '../components/vocab/VocabCardTagSection';

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
  const [reviewSentenceMode, setReviewSentenceMode] = useState<'auto' | 'original' | 'spoken'>('auto');

  useEffect(() => {
    setTagsEditingOpen(false);
    setZhHiddenById({});
    setPassedReproItemIds(new Set());
    setOrigError(null);
    setRegisterGuideOpen(false);
    setRegisterGuideLoading(false);
    setRegisterGuideError(null);
    setReviewSentenceMode('auto');
  }, [id]);

  const itemIdsKey = card?.items?.map(i => i.id).join('|') ?? '';

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

  const hasOriginalReviewOption = useMemo(
    () => !!card?.items.some((it) => it.topic === '原词日常'),
    [card]
  );

  const hasSpokenReviewOption = useMemo(
    () =>
      !!card?.items.some(
        (it) => it.part === 0 && (it.topic === '日常用语' || (!it.topic?.trim() && !it.questionSnapshot?.trim()))
      ),
    [card]
  );

  const canSwitchReviewSentence = hasOriginalReviewOption && hasSpokenReviewOption;

  const reviewTargetItemId = useMemo(() => {
    if (!card?.items.length) return null;
    const originalItem = card.items.find((it) => it.topic === '原词日常');
    const spokenItem = card.items.find(
      (it) => it.part === 0 && (it.topic === '日常用语' || (!it.topic?.trim() && !it.questionSnapshot?.trim()))
    );
    if (reviewSentenceMode === 'original') {
      return originalItem?.id ?? spokenItem?.id ?? card.items[0]?.id ?? null;
    }
    if (reviewSentenceMode === 'spoken') {
      return spokenItem?.id ?? originalItem?.id ?? card.items[0]?.id ?? null;
    }
    return originalItem?.id ?? spokenItem?.id ?? card.items[0]?.id ?? null;
  }, [card, reviewSentenceMode]);

  useEffect(() => {
    if (!card?.items.length) {
      setExpandedItemIds(new Set());
      return;
    }
    setExpandedItemIds(prev => {
      const next = new Set(
        [...prev].filter((itemId) => card.items.some((it) => it.id === itemId))
      );
      if (next.size === 0) {
        const preferredId = reviewTargetItemId ?? card.items[0]?.id;
        if (preferredId) next.add(preferredId);
      }
      return next;
    });
  }, [card?.id, itemIdsKey, reviewTargetItemId]);

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
      setReviewSentenceMode((prev) => (prev === 'spoken' ? prev : 'original'));
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
  const reviewActionsUnlocked = !isDue || anyReproPassed;
  const registerGuideDetailed = hasDetailedRegisterGuide(card);

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
          <VocabCardDetailHeader
            card={card}
            isDue={isDue}
            onBack={() => navigate(-1)}
            onDelete={() => {
              if (confirm('确定删除整张单词卡片？')) {
                store.deleteVocabCard(card.id);
                navigate('/vocab-review');
              }
            }}
          />

          <VocabCardTagSection
            tags={card.tags}
            tagsEditingOpen={tagsEditingOpen}
            onOpenEdit={() => setTagsEditingOpen(true)}
            onCloseEdit={closeTagEditor}
            onRemoveTag={removeTag}
            onTogglePresetTag={togglePresetTag}
          />

          <VocabCardExamplesSection
            card={card}
            displayItems={displayItems}
            expandedItemIds={expandedItemIds}
            zhHiddenById={zhHiddenById}
            passedReproItemIds={passedReproItemIds}
            anyReproPassed={anyReproPassed}
            isDue={isDue}
            reviewTargetItemId={reviewTargetItemId}
            registerGuideOpen={registerGuideOpen}
            registerGuideLoading={registerGuideLoading}
            registerGuideError={registerGuideError}
            registerGuideDetailed={registerGuideDetailed}
            needsOriginalDailyRow={needsOriginalDailyRow}
            origLoading={origLoading}
            origError={origError}
            onToggleItemExpanded={toggleItemExpanded}
            onToggleZh={toggleZh}
            onCompleteRepro={(itemId) =>
              setPassedReproItemIds(prev => new Set(prev).add(itemId))
            }
            onToggleRegisterGuideOpen={toggleRegisterGuideOpen}
            onHydrateRegisterGuide={() => void hydrateRegisterGuide()}
            onAppendOriginalDailyItem={() => void appendOriginalDailyItem()}
          />

          <VocabCardReviewActions
            isDue={isDue}
            reviewActionsUnlocked={reviewActionsUnlocked}
            canSwitchReviewSentence={canSwitchReviewSentence}
            hasOriginalReviewOption={hasOriginalReviewOption}
            hasSpokenReviewOption={hasSpokenReviewOption}
            reviewSentenceMode={reviewSentenceMode}
            onReviewSentenceModeChange={setReviewSentenceMode}
            onViewed={() => store.markVocabCardViewed(card.id)}
            onRemembered={() => store.markVocabCardRemembered(card.id)}
            onStruggled={() => store.markVocabCardStruggled(card.id)}
          />
        </div>
      </div>
    </div>
  );
}
