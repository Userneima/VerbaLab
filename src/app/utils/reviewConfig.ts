export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 错题再产出复习：stage 0/1/2 对应 24h / 3d / 7d */
export const ERROR_REVIEW_STAGE_HOURS = [24, 24 * 3, 24 * 7] as const;
export const ERROR_REVIEW_RESET_HOURS = 24;

/** 词卡复习：参考墨墨/间隔重复思路，先短间隔稳住记忆，再逐步拉长 */
export const VOCAB_REVIEW_INTERVAL_DAYS = [1, 2, 4, 7, 15, 30] as const;
export const VOCAB_REVIEW_RESET_HOURS = 24;
