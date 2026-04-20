import { BookMarked, Trash2, ArrowLeft } from 'lucide-react';
import type { VocabCard } from '../../store/useStore';

type VocabCardDetailHeaderProps = {
  card: VocabCard;
  isDue: boolean;
  onBack: () => void;
  onDelete: () => void;
};

export function VocabCardDetailHeader({
  card,
  isDue,
  onBack,
  onDelete,
}: VocabCardDetailHeaderProps) {
  const hasRegisterShift =
    !!card.spokenPracticePhrase &&
    card.spokenPracticePhrase.trim().toLowerCase() !== card.headword.trim().toLowerCase();

  return (
    <div className="shrink-0 px-4 pt-3 pb-3 border-b border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={14} />
          返回
        </button>
        <button
          type="button"
          onClick={onDelete}
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
                      日常里更常说{' '}
                      <span className="text-gray-800 font-medium">{card.spokenPracticePhrase}</span>
                    </>
                  ) : (
                    <>这个词本身就能直接用于日常口语</>
                  )}
                </p>
              </div>
              <p className="text-gray-400 shrink-0 text-right tabular-nums leading-snug">
                阶段 {card.reviewStage}
                {card.nextDueAt
                  ? ` · 提醒 ${new Date(card.nextDueAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
            </div>
            {card.sense ? <p className="text-[11px] text-gray-500">{card.sense}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
