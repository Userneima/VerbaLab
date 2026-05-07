import { requestJson } from '../../platform/request';
import { getAuthToken, getStorageJson, setStorageJson } from '../../platform/storage';

export type AiQuotaFeature = 'expression_guide' | 'expression_inspiration' | 'vocab_card';
export type AiQuotaPlanType = 'free' | 'monthly' | 'yearly';

export type AiQuotaLedgerEvent = {
  id: string;
  label: string;
  delta: number;
  createdAt: string;
};

export type AiQuotaState = {
  version: 1;
  dailyDate: string;
  dailyFreeLimit: number;
  dailyFreeUsed: number;
  giftRemaining: number;
  packRemaining: number;
  planType: AiQuotaPlanType;
  planMonthlyLimit: number;
  planMonthlyUsed: number;
  planPeriod: string;
  planExpiresAt?: string;
  ledger: AiQuotaLedgerEvent[];
};

export type AiQuotaSummary = {
  todayFreeLimit: number;
  todayFreeRemaining: number;
  giftRemaining: number;
  packRemaining: number;
  extraRemaining: number;
  planType: AiQuotaPlanType;
  planLabel: string;
  planMonthlyLimit: number;
  planMonthlyRemaining: number;
  planExpiresAt?: string;
  totalRemaining: number;
  ledger: AiQuotaLedgerEvent[];
};

export const AI_QUOTA_COST = {
  expression_guide: 1,
  expression_inspiration: 1,
  vocab_card: 3,
} satisfies Record<AiQuotaFeature, number>;

const QUOTA_KEY = 'verbalab_weapp_ai_quota';
const DAILY_FREE_LIMIT = 0;
const NEW_USER_GIFT = 100;
const LEGACY_GIFT_UPGRADE_EVENT_ID = 'gift-upgrade-100';

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function createDefaultState(): AiQuotaState {
  return {
    version: 1,
    dailyDate: todayKey(),
    dailyFreeLimit: DAILY_FREE_LIMIT,
    dailyFreeUsed: 0,
    giftRemaining: NEW_USER_GIFT,
    packRemaining: 0,
    planType: 'free',
    planMonthlyLimit: 0,
    planMonthlyUsed: 0,
    planPeriod: monthKey(),
    ledger: [
      {
        id: `gift-${Date.now()}`,
        label: '新人赠送',
        delta: NEW_USER_GIFT,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function normalizeState(state: AiQuotaState): AiQuotaState {
  const currentDay = todayKey();
  const currentMonth = monthKey();
  let next = state;

  if (next.dailyDate !== currentDay) {
    next = {
      ...next,
      dailyDate: currentDay,
      dailyFreeLimit: DAILY_FREE_LIMIT,
      dailyFreeUsed: 0,
    };
  }

  if (next.planPeriod !== currentMonth) {
    next = {
      ...next,
      planPeriod: currentMonth,
      planMonthlyUsed: 0,
    };
  }

  if (next.dailyFreeLimit !== DAILY_FREE_LIMIT) {
    next = {
      ...next,
      dailyFreeLimit: DAILY_FREE_LIMIT,
    };
  }

  const legacyGiftEvent = next.ledger.find(
    (event) =>
      event.id.startsWith('gift-') &&
      event.label === '新人赠送' &&
      event.delta > 0 &&
      event.delta < NEW_USER_GIFT,
  );
  const hasUpgradeEvent = next.ledger.some((event) => event.id === LEGACY_GIFT_UPGRADE_EVENT_ID);
  if (legacyGiftEvent && !hasUpgradeEvent) {
    const delta = NEW_USER_GIFT - legacyGiftEvent.delta;
    next = {
      ...next,
      giftRemaining: Math.max(0, next.giftRemaining + delta),
      ledger: [
        {
          id: LEGACY_GIFT_UPGRADE_EVENT_ID,
          label: '额度升级',
          delta,
          createdAt: new Date().toISOString(),
        },
        ...next.ledger,
      ].slice(0, 20),
    };
  }

  return next;
}

export function getAiQuotaState(): AiQuotaState {
  const state = getStorageJson<AiQuotaState | null>(QUOTA_KEY, null);
  const normalized = normalizeState(state || createDefaultState());
  if (state !== normalized) setStorageJson(QUOTA_KEY, normalized);
  return normalized;
}

function saveAiQuotaState(state: AiQuotaState) {
  setStorageJson(QUOTA_KEY, normalizeState(state));
}

export function getAiQuotaSummary(): AiQuotaSummary {
  const state = getAiQuotaState();
  const todayFreeRemaining = 0;
  const planMonthlyRemaining = Math.max(0, state.planMonthlyLimit - state.planMonthlyUsed);
  const extraRemaining = Math.max(0, state.giftRemaining + state.packRemaining);
  const planLabel =
    state.planType === 'monthly' ? '月卡 Pro' : state.planType === 'yearly' ? '年卡 Pro' : '免费版';

  return {
    todayFreeLimit: state.dailyFreeLimit,
    todayFreeRemaining,
    giftRemaining: state.giftRemaining,
    packRemaining: state.packRemaining,
    extraRemaining,
    planType: state.planType,
    planLabel,
    planMonthlyLimit: state.planMonthlyLimit,
    planMonthlyRemaining,
    planExpiresAt: state.planExpiresAt,
    totalRemaining: planMonthlyRemaining + extraRemaining,
    ledger: state.ledger,
  };
}

function saveRemoteAiQuotaSummary(summary: AiQuotaSummary) {
  const planMonthlyUsed = Math.max(0, summary.planMonthlyLimit - summary.planMonthlyRemaining);
  saveAiQuotaState({
    version: 1,
    dailyDate: todayKey(),
    dailyFreeLimit: summary.todayFreeLimit,
    dailyFreeUsed: Math.max(0, summary.todayFreeLimit - summary.todayFreeRemaining),
    giftRemaining: summary.giftRemaining,
    packRemaining: summary.packRemaining,
    planType: summary.planType,
    planMonthlyLimit: summary.planMonthlyLimit,
    planMonthlyUsed,
    planPeriod: monthKey(),
    planExpiresAt: summary.planExpiresAt,
    ledger: summary.ledger || [],
  });
}

export async function fetchRemoteAiQuotaSummary(): Promise<AiQuotaSummary | null> {
  if (!getAuthToken()) return null;
  const result = await requestJson<{ summary: AiQuotaSummary }>({
    method: 'GET',
    path: '/quota/summary',
  });
  saveRemoteAiQuotaSummary(result.summary);
  return result.summary;
}

export async function getLatestAiQuotaSummary(): Promise<AiQuotaSummary> {
  return (await fetchRemoteAiQuotaSummary().catch(() => null)) || getAiQuotaSummary();
}

export function hasEnoughAiQuota(cost: number): boolean {
  return getAiQuotaSummary().totalRemaining >= cost;
}

export function hasEnoughAiQuotaInSummary(summary: AiQuotaSummary, cost: number): boolean {
  return summary.totalRemaining >= cost;
}

function featureLabel(feature: AiQuotaFeature) {
  if (feature === 'expression_guide') return '表达指导';
  if (feature === 'expression_inspiration') return '不知道说什么';
  return '词卡生成';
}

function appendLedger(state: AiQuotaState, event: AiQuotaLedgerEvent): AiQuotaState {
  return {
    ...state,
    ledger: [event, ...state.ledger].slice(0, 20),
  };
}

export function consumeAiQuota(feature: AiQuotaFeature, cost: number): AiQuotaSummary {
  let state = getAiQuotaState();
  let remainingCost = cost;

  const planRemaining = Math.max(0, state.planMonthlyLimit - state.planMonthlyUsed);
  const planUsed = Math.min(planRemaining, remainingCost);
  state = {
    ...state,
    planMonthlyUsed: state.planMonthlyUsed + planUsed,
  };
  remainingCost -= planUsed;

  const packUsed = Math.min(Math.max(0, state.packRemaining), remainingCost);
  state = {
    ...state,
    packRemaining: state.packRemaining - packUsed,
  };
  remainingCost -= packUsed;

  const giftUsed = Math.min(Math.max(0, state.giftRemaining), remainingCost);
  state = {
    ...state,
    giftRemaining: state.giftRemaining - giftUsed,
  };
  remainingCost -= giftUsed;

  if (remainingCost > 0) return getAiQuotaSummary();

  state = appendLedger(state, {
    id: `${feature}-${Date.now()}`,
    label: featureLabel(feature),
    delta: -cost,
    createdAt: new Date().toISOString(),
  });
  saveAiQuotaState(state);
  return getAiQuotaSummary();
}

export function getQuotaHint(cost: number): string {
  const summary = getAiQuotaSummary();
  return getQuotaHintFromSummary(summary, cost);
}

export function getQuotaHintFromSummary(summary: AiQuotaSummary, cost: number): string {
  if (summary.totalRemaining < cost) {
    return cost > 1
      ? `本次需要 ${cost} 次，当前 AI 生成次数不足`
      : 'AI 生成次数已用完';
  }
  if (summary.totalRemaining <= 3) {
    return '今天快用完了，保存好有用的表达';
  }
  if (summary.planType !== 'free') {
    return `本月 Pro 还剩 ${summary.planMonthlyRemaining} 次`;
  }
  return `额外可用 ${summary.extraRemaining} 次`;
}

export function isQuotaExhaustedError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err || '');
  return /AI_QUOTA_EXHAUSTED|AI 生成次数已用完|生成次数不足/.test(message);
}
