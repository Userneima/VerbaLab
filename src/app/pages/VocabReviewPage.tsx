import { useMemo } from 'react';
import { Link } from 'react-router';
import { BookMarked, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { isVocabCardDue } from '../utils/vocabCardReview';

export function VocabReviewPage() {
  const store = useStore();

  const dueCards = useMemo(() => {
    return store.vocabCards
      .filter(c => isVocabCardDue(c.nextDueAt))
      .sort((a, b) => (a.nextDueAt || '').localeCompare(b.nextDueAt || ''));
  }, [store.vocabCards]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <BookMarked size={20} className="text-amber-600 shrink-0" />
            <h1 className="font-bold text-gray-800 text-base sm:text-lg">卡片复习</h1>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            到期的单词卡片会出现在这里。打开卡片后可点「已浏览」推迟提醒，或用「记住了 / 还不太熟」调整复习间隔。
          </p>
        </div>

        <div className="p-4 sm:p-6 pb-safe sm:pb-6 space-y-4 max-w-lg">
          {dueCards.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookMarked size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-gray-700 font-semibold mb-2">暂无到期卡片</h3>
              <p className="text-gray-400 text-sm mb-6">
                在词卡工坊生成并保存卡片后，系统会在数天后提醒你复习。
              </p>
              <Link
                to="/word-lab"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
              >
                <Sparkles size={16} />
                去词卡工坊
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {dueCards.map(card => (
                <li key={card.id}>
                  <Link
                    to={`/vocab/${card.id}?review=1`}
                    className="flex items-center justify-between gap-3 w-full p-4 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors text-left group"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{card.headword}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {card.items.length} 条例句 · 阶段 {card.reviewStage}
                        {card.nextDueAt && (
                          <span className="ml-2">
                            原定 {new Date(card.nextDueAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
