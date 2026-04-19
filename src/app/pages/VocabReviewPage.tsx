import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpDown, BookMarked, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { VocabCard } from '../store/useStore';
import { isVocabCardDue } from '../utils/vocabCardReview';

function previewSentence(card: { items: { sentence: string }[] }): string {
  const s = card.items[0]?.sentence?.trim();
  if (!s) return '';
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

type DisplayMode = 'newest' | 'due' | 'alphabet' | 'initial' | 'pos';

const DISPLAY_MODE_OPTIONS: Array<{ value: DisplayMode; label: string; description: string }> = [
  { value: 'newest', label: '最新收录', description: '按加入时间倒序' },
  { value: 'due', label: '待复习优先', description: '先看现在该复习的卡' },
  { value: 'alphabet', label: 'A-Z', description: '按单词字母顺序' },
  { value: 'initial', label: '首字母', description: '按首字母分组浏览' },
  { value: 'pos', label: '词性', description: '按词性分组浏览' },
];

const POS_TAG_ORDER = ['#phrase', '#n.', '#v.', '#adj.', '#adv.', '#prep.'] as const;

const POS_LABELS: Record<(typeof POS_TAG_ORDER)[number], string> = {
  '#phrase': '短语',
  '#n.': '名词',
  '#v.': '动词',
  '#adj.': '形容词',
  '#adv.': '副词',
  '#prep.': '介词',
};

function normalizeHeadword(text: string): string {
  return text.trim().toLowerCase();
}

function compareHeadword(a: VocabCard, b: VocabCard): number {
  const byHeadword = normalizeHeadword(a.headword).localeCompare(normalizeHeadword(b.headword), 'en', {
    sensitivity: 'base',
  });
  if (byHeadword !== 0) return byHeadword;
  return b.timestamp.localeCompare(a.timestamp);
}

function getInitialGroup(card: VocabCard): string {
  const match = card.headword.trim().match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : '#';
}

function getPosGroup(card: VocabCard): string {
  const matched = POS_TAG_ORDER.find((tag) => card.tags.includes(tag));
  if (matched) return matched;
  if (/\s/.test(card.headword.trim())) return '#phrase';
  return '#n.';
}

function sortCards(cards: VocabCard[], mode: DisplayMode): VocabCard[] {
  const list = [...cards];
  if (mode === 'newest') {
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list;
  }

  if (mode === 'due') {
    list.sort((a, b) => {
      const aDue = isVocabCardDue(a.nextDueAt) ? 0 : 1;
      const bDue = isVocabCardDue(b.nextDueAt) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      if (a.nextDueAt && b.nextDueAt && a.nextDueAt !== b.nextDueAt) {
        return a.nextDueAt.localeCompare(b.nextDueAt);
      }
      return compareHeadword(a, b);
    });
    return list;
  }

  if (mode === 'alphabet' || mode === 'initial') {
    list.sort(compareHeadword);
    return list;
  }

  list.sort((a, b) => {
    const posDiff = POS_TAG_ORDER.indexOf(getPosGroup(a) as (typeof POS_TAG_ORDER)[number]) -
      POS_TAG_ORDER.indexOf(getPosGroup(b) as (typeof POS_TAG_ORDER)[number]);
    if (posDiff !== 0) return posDiff;
    return compareHeadword(a, b);
  });
  return list;
}

function buildSections(cards: VocabCard[], mode: DisplayMode): Array<{ id: string; label: string; cards: VocabCard[] }> {
  const sorted = sortCards(cards, mode);
  if (mode === 'initial') {
    const groups = new Map<string, VocabCard[]>();
    for (const card of sorted) {
      const key = getInitialGroup(card);
      groups.set(key, [...(groups.get(key) || []), card]);
    }
    return [...groups.entries()].map(([id, groupCards]) => ({ id, label: id, cards: groupCards }));
  }

  if (mode === 'pos') {
    const groups = new Map<string, VocabCard[]>();
    for (const posTag of POS_TAG_ORDER) {
      groups.set(posTag, []);
    }
    for (const card of sorted) {
      const key = getPosGroup(card);
      groups.set(key, [...(groups.get(key) || []), card]);
    }
    return POS_TAG_ORDER
      .map((posTag) => ({
        id: posTag,
        label: POS_LABELS[posTag],
        cards: groups.get(posTag) || [],
      }))
      .filter((section) => section.cards.length > 0);
  }

  return [{ id: mode, label: '', cards: sorted }];
}

export function VocabReviewPage() {
  const store = useStore();
  const [q, setQ] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('due');

  const cards = useMemo(() => {
    let list = [...store.vocabCards];
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(
        c =>
          c.headword.toLowerCase().includes(t) ||
          c.tags.some(tag => tag.toLowerCase().includes(t)) ||
          (c.sense && c.sense.toLowerCase().includes(t)) ||
          c.items.some(it => it.sentence.toLowerCase().includes(t))
      );
    }
    return list;
  }, [store.vocabCards, q]);

  const sections = useMemo(() => buildSections(cards, displayMode), [cards, displayMode]);
  const currentMode = DISPLAY_MODE_OPTIONS.find((option) => option.value === displayMode);

  const renderCard = (card: VocabCard) => {
    const due = isVocabCardDue(card.nextDueAt);
    const line = previewSentence(card);
    const posTag = POS_TAG_ORDER.find((tag) => card.tags.includes(tag));

    return (
      <Link
        key={card.id}
        to={`/vocab/${card.id}`}
        className="mb-4 break-inside-avoid block rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all text-left group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-semibold text-gray-900 text-sm leading-snug break-words">{card.headword}</span>
            {card.sense && (
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{card.sense}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            {due && (
              <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                待复习
              </span>
            )}
            {posTag && (
              <span className="text-[10px] font-medium bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded">
                {POS_LABELS[posTag]}
              </span>
            )}
          </div>
        </div>
        {line && (
          <p className="text-xs text-gray-600 leading-relaxed mt-2 line-clamp-4">{line}</p>
        )}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.slice(0, 4).map(t => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
              >
                {t}
              </span>
            ))}
            {card.tags.length > 4 && (
              <span className="text-[10px] text-gray-400">+{card.tags.length - 4}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span className="text-[10px] text-gray-400">
            {new Date(card.timestamp).toLocaleDateString('zh-CN')}
          </span>
          <ChevronRight
            size={14}
            className="text-gray-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <BookMarked size={20} className="text-violet-600 shrink-0" />
            <h1 className="font-bold text-gray-800 text-base sm:text-lg">单词卡片</h1>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            全部词卡瀑布流浏览；到期卡片带「待复习」标记，点进详情可完成复习。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[12rem] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="搜索单词、标签、例句…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <Link
              to="/word-lab"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 shrink-0"
            >
              <Sparkles size={16} />
              词卡工坊
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
              <ArrowUpDown size={12} />
              {currentMode?.label}
            </div>
            <div className="text-[11px] text-gray-400">
              {currentMode?.description}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISPLAY_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDisplayMode(option.value)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  displayMode === option.value
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-violet-100 hover:text-violet-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6">
          {cards.length === 0 ? (
            <div className="text-center py-16 px-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookMarked size={28} className="text-violet-600" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">
                {store.vocabCards.length === 0 ? '还没有单词卡片' : '没有匹配的词卡'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {store.vocabCards.length === 0
                  ? '在词卡工坊生成并保存后，将在此以瀑布流展示。'
                  : '换个关键词试试。'}
              </p>
              {store.vocabCards.length === 0 && (
                <Link
                  to="/word-lab"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                >
                  <Sparkles size={16} />
                  去词卡工坊
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <section key={section.id} className="space-y-3">
                  {section.label && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-8 rounded-full bg-violet-50 px-2.5 py-1 text-center text-xs font-semibold text-violet-700">
                          {section.label}
                        </div>
                        <p className="text-xs text-gray-400">
                          {section.cards.length} 张卡片
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
                    {section.cards.map(renderCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
