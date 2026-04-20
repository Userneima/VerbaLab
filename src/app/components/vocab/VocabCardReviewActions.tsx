type VocabCardReviewActionsProps = {
  isDue: boolean;
  reviewActionsUnlocked: boolean;
  canSwitchReviewSentence: boolean;
  hasOriginalReviewOption: boolean;
  hasSpokenReviewOption: boolean;
  reviewSentenceMode: 'auto' | 'original' | 'spoken';
  onReviewSentenceModeChange: (mode: 'original' | 'spoken') => void;
  onViewed: () => void;
  onRemembered: () => void;
  onStruggled: () => void;
};

export function VocabCardReviewActions({
  isDue,
  reviewActionsUnlocked,
  canSwitchReviewSentence,
  hasOriginalReviewOption,
  hasSpokenReviewOption,
  reviewSentenceMode,
  onReviewSentenceModeChange,
  onViewed,
  onRemembered,
  onStruggled,
}: VocabCardReviewActionsProps) {
  if (!isDue) return null;

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
      <div className="space-y-2">
        {(canSwitchReviewSentence || hasOriginalReviewOption) ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-500">复习句子</span>
            {canSwitchReviewSentence ? (
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => onReviewSentenceModeChange('original')}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    reviewSentenceMode === 'original' ||
                    (reviewSentenceMode === 'auto' && hasOriginalReviewOption)
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  原词句子
                </button>
                {hasSpokenReviewOption ? (
                  <button
                    type="button"
                    onClick={() => onReviewSentenceModeChange('spoken')}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      reviewSentenceMode === 'spoken'
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    口语句子
                  </button>
                ) : null}
              </div>
            ) : (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                原词句子优先
              </span>
            )}
          </div>
        ) : null}
        {!reviewActionsUnlocked ? (
          <p className="text-[11px] text-violet-600 leading-relaxed">
            先完成当前复习句子的句子复原，再选择这次复习结果。
          </p>
        ) : (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            选择这次复习结果后，会更新这张卡片的下次提醒时间。
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onViewed}
            disabled={!reviewActionsUnlocked}
            className="min-h-[46px] rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            已浏览
          </button>
          <button
            type="button"
            onClick={onRemembered}
            disabled={!reviewActionsUnlocked}
            className="min-h-[46px] rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            记住了
          </button>
          <button
            type="button"
            onClick={onStruggled}
            disabled={!reviewActionsUnlocked}
            className="min-h-[46px] rounded-xl bg-amber-100 px-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            还不太熟
          </button>
        </div>
      </div>
    </div>
  );
}
