import type { VocabCardRegisterGuide } from '../../store/useStore';
import { postAiJson, getAiJson } from './client';
import { trackProductEvent } from './admin';
import { z } from 'zod';

const stuckSuggestExampleSchema = z.object({
  sentence: z.string().trim().min(1),
  chinese: z.string().trim().optional(),
  noteZh: z.string().trim().optional(),
});

const stuckSuggestSchema = z.object({
  type: z.enum(['corpus', 'verb', 'paraphrase']).default('paraphrase'),
  suggestion: z.string().default(''),
  recommendedExpression: z.string().trim().optional(),
  guidanceZh: z.string().trim().optional(),
  examples: z.array(stuckSuggestExampleSchema).default([]),
});

export type StuckSuggestResult = z.infer<typeof stuckSuggestSchema>;

export function parseStuckSuggestResult(raw: unknown): StuckSuggestResult {
  const parsed = stuckSuggestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      type: 'paraphrase',
      suggestion: '',
      guidanceZh: undefined,
      examples: [],
    };
  }
  const value = parsed.data;
  return {
    type: value.type,
    suggestion: value.suggestion.trim(),
    recommendedExpression: value.recommendedExpression?.trim() || undefined,
    guidanceZh: value.guidanceZh?.trim() || undefined,
    examples: value.examples.map((example) => ({
      sentence: example.sentence.trim(),
      chinese: example.chinese?.trim() || undefined,
      noteZh: example.noteZh?.trim() || undefined,
    })),
  };
}

export async function getSpeechToken(): Promise<{ token: string; region: string }> {
  try {
    return await getAiJson<{ token: string; region: string }>('/speech/token');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to get speech token';
    console.error('Speech token error:', msg);
    throw new Error(msg);
  }
}

export async function aiGrammarCheck(sentence: string, collocation: string): Promise<{
  isCorrect: boolean;
  correctedSentence?: string;
  errors: Array<{
    type: string;
    description: string;
    hint: string;
    grammarPoint: string;
  }>;
  overallHint: string;
}> {
  try {
    return await postAiJson('/ai/grammar-check', { sentence, collocation });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Grammar check failed';
    console.error('AI grammar check error:', msg);
    throw new Error(msg);
  }
}

export async function aiGrammarTutor(payload: {
  sentence: string;
  collocation: string;
  chineseContext: string;
  errors: Array<{ description: string; hint: string; grammarPoint: string }>;
  overallHint: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string }> {
  try {
    return await postAiJson('/ai/grammar-tutor', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Grammar tutor failed';
    console.error('AI grammar tutor error:', msg);
    throw new Error(msg);
  }
}

export async function aiTranslateSentence(text: string): Promise<{ translation: string }> {
  try {
    return await postAiJson('/ai/translate-sentence', { text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Translation failed';
    console.error('AI translate-sentence error:', msg);
    throw new Error(msg);
  }
}

export async function aiChinglishCheck(sentence: string, collocation: string): Promise<{
  isChinglish: boolean;
  nativeVersion?: string;
  nativeThinking?: string;
}> {
  try {
    return await postAiJson('/ai/chinglish-check', { sentence, collocation });
  } catch {
    return { isChinglish: false };
  }
}

export async function aiStuckSuggest(
  chineseThought: string,
  corpusSentences: Array<{ userSentence: string; collocation: string; verb: string }>,
  verbCollocations: Array<{ phrase: string; meaning: string }>
): Promise<StuckSuggestResult> {
  try {
    const raw = await postAiJson<unknown>('/ai/stuck-suggest', {
      chineseThought,
      corpusSentences,
      verbCollocations,
    });
    return parseStuckSuggestResult(raw);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Stuck suggestion failed';
    console.error('AI stuck suggest error:', msg);
    throw new Error(msg);
  }
}

export async function aiEvaluateAnswer(
  question: string,
  answer: string,
  part: number
): Promise<{
  score: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  verbsUsed: string[];
  feedback: string[];
}> {
  try {
    return await postAiJson('/ai/evaluate-answer', { question, answer, part });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Evaluation failed';
    console.error('AI evaluate error:', msg);
    throw new Error(msg);
  }
}

export async function aiGenerateVocabCard(payload: {
  headword: string;
  sense?: string;
  collocations: Array<{ phrase: string; meaning: string; verb: string }>;
}): Promise<{
  headword: string;
  sense?: string;
  spokenPracticePhrase: string;
  isCommonInSpokenEnglish: boolean;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  items: Array<{
    sentence: string;
    collocationsUsed: string[];
    chinese?: string;
  }>;
}> {
  try {
    const result = await postAiJson<{
      headword: string;
      sense?: string;
      spokenPracticePhrase: string;
      isCommonInSpokenEnglish: boolean;
      spokenAlternatives: string[];
      writtenSupplement: string | null;
      registerNoteZh?: string;
      registerGuide?: VocabCardRegisterGuide;
      items: Array<{
        sentence: string;
        collocationsUsed: string[];
        chinese?: string;
      }>;
    }>('/ai/vocab-card', payload);
    trackProductEvent({
      eventName: 'vocab_card_generated',
      surface: 'word_lab',
      objectType: 'vocab_card_preview',
      metadata: {
        itemCount: result.items.length,
        isCommonInSpokenEnglish: result.isCommonInSpokenEnglish,
      },
    });
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Vocab card generation failed';
    console.error('AI vocab-card error:', { detail: msg?.slice?.(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '词卡接口 404：云端尚未部署最新 Edge 函数。请在项目根目录执行：npx supabase login && npx supabase functions deploy make-server-1fc434d6 --project-ref 你的项目 ref'
      );
    }
    if (/questions array is required/i.test(msg)) {
      throw new Error(
        '词卡云端仍是旧版接口（要求 questions）。请重新部署 Edge 函数：npx supabase functions deploy make-server-1fc434d6 --project-ref <Project ID>，与仓库中 supabase/functions/make-server-1fc434d6 代码保持一致。'
      );
    }
    throw new Error(msg);
  }
}

export async function aiGenerateVocabCardRegisterGuide(payload: {
  headword: string;
  sense?: string;
}): Promise<{
  headword: string;
  sense?: string;
  spokenPracticePhrase: string;
  isCommonInSpokenEnglish: boolean;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
}> {
  try {
    return await postAiJson('/ai/vocab-card-register-guide', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Register guide generation failed';
    console.error('AI vocab-card-register-guide error:', { detail: String(msg).slice(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '语体解析接口 404：云端尚未部署该路由。请重新部署 Edge 函数 make-server-1fc434d6。'
      );
    }
    throw new Error(msg);
  }
}

export async function aiGenerateVocabCardOriginalDaily(payload: {
  headword: string;
  sense?: string;
  collocations: Array<{ phrase: string; meaning: string; verb: string }>;
}): Promise<{
  item: {
    sentence: string;
    collocationsUsed: string[];
    chinese?: string;
  };
}> {
  try {
    return await postAiJson('/ai/vocab-card-original-daily', payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Original-daily sentence failed';
    console.error('AI vocab-card-original-daily error:', { detail: String(msg).slice(0, 200) });
    if (/404|not found/i.test(msg)) {
      throw new Error(
        '原词例句接口 404：云端尚未部署该路由。请在项目根目录执行：npx supabase functions deploy make-server-1fc434d6 --project-ref <Project ref>，确保 supabase/functions/make-server-1fc434d6 含 /ai/vocab-card-original-daily。'
      );
    }
    throw new Error(msg);
  }
}
