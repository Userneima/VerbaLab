export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 错题再产出复习：stage 0/1/2 对应 24h / 3d / 7d */
export const ERROR_REVIEW_STAGE_HOURS = [24, 24 * 3, 24 * 7] as const;
export const ERROR_REVIEW_RESET_HOURS = 24;

/** 词卡复习：已浏览后按 stage 拉长间隔（天） */
export const VOCAB_REVIEW_INTERVAL_DAYS = [3, 7, 14] as const;
export const VOCAB_REVIEW_RESET_HOURS = 24;

