import {
  MS_PER_DAY,
  VOCAB_REVIEW_INTERVAL_DAYS,
  VOCAB_REVIEW_RESET_HOURS,
  MS_PER_HOUR,
} from './reviewConfig';

function daysForStage(stage: number): number {
  const s = Math.min(Math.max(stage, 0), VOCAB_REVIEW_INTERVAL_DAYS.length - 1);
  return VOCAB_REVIEW_INTERVAL_DAYS[s];
}

export function computeNextDueAfterView(stage: number): string {
  const days = daysForStage(stage);
  return new Date(Date.now() + days * MS_PER_DAY).toISOString();
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
    nextDueAt: new Date(Date.now() + days * MS_PER_DAY).toISOString(),
  };
}

/** 「还不太熟」：回到阶段 0，1 天后再见 */
export function computeAfterStruggled(): { reviewStage: number; nextDueAt: string } {
  return {
    reviewStage: 0,
    nextDueAt: new Date(Date.now() + VOCAB_REVIEW_RESET_HOURS * MS_PER_HOUR).toISOString(),
  };
}

export function isVocabCardDue(nextDueAt: string | null): boolean {
  if (!nextDueAt) return false;
  return nextDueAt <= new Date().toISOString();
}
