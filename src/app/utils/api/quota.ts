import { z } from 'zod';
import { getAiJson } from './client';

const quotaLedgerEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  delta: z.number(),
  createdAt: z.string(),
});

export const quotaSummarySchema = z.object({
  todayFreeLimit: z.number().default(0),
  todayFreeRemaining: z.number().default(0),
  giftRemaining: z.number().default(0),
  packRemaining: z.number().default(0),
  extraRemaining: z.number().default(0),
  planType: z.enum(['free', 'monthly', 'yearly']).default('free'),
  planLabel: z.string().default('免费版'),
  planMonthlyLimit: z.number().default(0),
  planMonthlyRemaining: z.number().default(0),
  planExpiresAt: z.string().optional(),
  totalRemaining: z.number().default(0),
  ledger: z.array(quotaLedgerEventSchema).default([]),
});

const quotaSummaryResponseSchema = z.object({
  summary: quotaSummarySchema,
});

export type AiQuotaSummary = z.infer<typeof quotaSummarySchema>;
export type AiQuotaLedgerEvent = z.infer<typeof quotaLedgerEventSchema>;

export async function getQuotaSummary(): Promise<AiQuotaSummary> {
  const result = await getAiJson<unknown>('/quota/summary');
  return quotaSummaryResponseSchema.parse(result).summary;
}
