import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BookMarked, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { isVocabCardDue } from '../utils/vocabCardReview';

function previewSentence(card: { items: { sentence: string }[] }): string {
  const s = card.items[0]?.sentence?.trim();
  if (!s) return '';
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

export function VocabReviewPage() {
  const store = useStore();
  const [q, setQ] = useState('');

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
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return list;
  }, [store.vocabCards, q]);

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
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
              {cards.map(card => {
                const due = isVocabCardDue(card.nextDueAt);
                const line = previewSentence(card);
                return (
                  <Link
                    key={card.id}
                    to={`/vocab/${card.id}`}
                    className="mb-4 break-inside-avoid block rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm leading-snug">{card.headword}</span>
                      {due && (
                        <span className="shrink-0 text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          待复习
                        </span>
                      )}
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
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
