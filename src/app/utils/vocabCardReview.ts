/** 与「已浏览」对应的间隔（天），随 reviewStage 拉长 */
export const REVIEW_INTERVAL_DAYS = [3, 7, 14] as const;

function daysForStage(stage: number): number {
  const s = Math.min(Math.max(stage, 0), REVIEW_INTERVAL_DAYS.length - 1);
  return REVIEW_INTERVAL_DAYS[s];
}

export function computeNextDueAfterView(stage: number): string {
  const days = daysForStage(stage);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** 新卡片首次进入复习队列：默认 3 天后提醒 */
export function initialNextDueAt(): string {
  return computeNextDueAfterView(0);
}

/** 「记住了」：阶段 +1（上限 2），按新阶段给间隔 */
export function computeAfterRemembered(stage: number): { reviewStage: number; nextDueAt: string } {
  const reviewStage = Math.min(stage + 1, 2);
  const days = daysForStage(reviewStage);
  return {
    reviewStage,
    nextDueAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** 「还不太熟」：回到阶段 0，1 天后再见 */
export function computeAfterStruggled(): { reviewStage: number; nextDueAt: string } {
  return {
    reviewStage: 0,
    nextDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function isVocabCardDue(nextDueAt: string | null): boolean {
  if (!nextDueAt) return false;
  return nextDueAt <= new Date().toISOString();
}
