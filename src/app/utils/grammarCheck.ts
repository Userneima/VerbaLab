import { aiGrammarCheck, aiStuckSuggest, aiChinglishCheck } from './api';

export interface GrammarError {
  type: string;
  description: string;
  hint: string;
  grammarPoint: string;
}

export interface GrammarCheckResult {
  isCorrect: boolean;
  errors: GrammarError[];
  overallHint: string;
  /** AI 给出的整句改正范例（须含目标搭配）；无则省略 */
  correctedSentence?: string;
}

/** 中文全角标点等不作为语法错误（与后端提示一致；并过滤历史 AI 结果） */
export function isIgnorableGrammarError(e: GrammarError): boolean {
  const t = e.type.trim().toLowerCase().replace(/-/g, '_');
  if (t !== 'punctuation') return false;
  const blob = `${e.description}\n${e.hint}\n${e.grammarPoint}`;
  return /中文|全角|全形|中文标点/.test(blob);
}

function normalizeGrammarCheckResult(input: GrammarCheckResult): GrammarCheckResult {
  const errors = (input.errors || []).filter(e => !isIgnorableGrammarError(e));
  if (errors.length === 0) {
    return { isCorrect: true, errors: [], overallHint: '', correctedSentence: undefined };
  }
  const cs = input.correctedSentence?.trim();
  return {
    isCorrect: false,
    errors,
    overallHint: input.overallHint || '',
    correctedSentence: cs || undefined,
  };
}

export async function checkGrammar(sentence: string, collocation: string): Promise<GrammarCheckResult> {
  const trimmed = sentence.trim();

  if (!trimmed) {
    return {
      isCorrect: false,
      errors: [{ type: 'empty', description: '句子不能为空', hint: '请输入一个完整的英文句子', grammarPoint: '基本句子结构' }],
      overallHint: '请输入内容后再提交。'
    };
  }

  try {
    // Call DeepSeek AI via backend
    const result = await aiGrammarCheck(trimmed, collocation);
    return normalizeGrammarCheckResult({
      isCorrect: result.isCorrect,
      errors: result.errors || [],
      overallHint: result.overallHint || '',
      correctedSentence:
        typeof result.correctedSentence === 'string' ? result.correctedSentence : undefined,
    });
  } catch (err) {
    console.error('AI grammar check failed, falling back to local check:', err);
    // Fallback to local heuristic check
    return localGrammarCheck(trimmed, collocation);
  }
}

// Local fallback grammar check (simplified heuristic)
function localGrammarCheck(sentence: string, collocation: string): GrammarCheckResult {
  const errors: GrammarError[] = [];
  const trimmed = sentence.trim();

  // Check capitalization
  if (/^[a-z]/.test(trimmed)) {
    errors.push({
      type: 'capitalization',
      description: '句子首字母应当大写',
      hint: '英文句子的第一个单词首字母必须大写。',
      grammarPoint: '英文大小写规范'
    });
  }

  // Check ending punctuation
  if (!/[.!?]$/.test(trimmed)) {
    errors.push({
      type: 'punctuation',
      description: '句子末尾缺少标点符号',
      hint: '英文句子必须以 "."、"!" 或 "?" 结尾。',
      grammarPoint: '英文标点符号规范'
    });
  }

  // Check lowercase "i" as pronoun
  if (/(?:^|\s)i(?:\s|'|$)/.test(trimmed)) {
    errors.push({
      type: 'pronoun_capitalization',
      description: '第一人称代词 "i" 在英语中始终写为大写 "I"',
      hint: '请将所有作为代词的小写 "i" 改为大写 "I"。',
      grammarPoint: '第一人称代词大写规则'
    });
  }

  // Check sentence too short
  if (trimmed.split(' ').length < 4) {
    errors.push({
      type: 'completeness',
      description: '句子过短，可能不够完整',
      hint: `请写一个完整的句子，并使用搭配 "${collocation}"。`,
      grammarPoint: '英文句子基本结构'
    });
  }

  // Check double spaces
  if (/  +/.test(trimmed)) {
    errors.push({
      type: 'formatting',
      description: '句子中存在多余的空格',
      hint: '每两个单词之间只需一个空格。',
      grammarPoint: '英文格式规范'
    });
  }

  const isCorrect = errors.length === 0;
  const overallHint = isCorrect ? '' :
    errors.length === 1 ? `💡 提示：${errors[0].hint}` :
    `💡 共发现 ${errors.length} 个问题，请逐一修正后重新提交。（注意：当前为本地检查模式，AI 服务暂不可用）`;

  return normalizeGrammarCheckResult({ isCorrect, errors, overallHint, correctedSentence: undefined });
}

/** 语法正确时检测是否为中式英语，并返回母语者说法与思路 */
export async function checkChinglish(sentence: string, collocation: string): Promise<{
  isChinglish: boolean;
  nativeVersion?: string;
  nativeThinking?: string;
}> {
  try {
    return await aiChinglishCheck(sentence.trim(), collocation);
  } catch {
    return { isChinglish: false };
  }
}

export async function getStuckSuggestion(
  chineseThought: string,
  corpus: Array<{ userSentence: string; collocation: string; verb: string }>,
  verbData: Array<{ verb: string; collocations: Array<{ phrase: string; meaning: string }> }>
): Promise<{ suggestion: string; type: 'corpus' | 'verb' | 'paraphrase' }> {
  try {
    // Flatten verb collocations for the API
    const flatCollocations = verbData.flatMap(v =>
      v.collocations.map(c => ({ phrase: c.phrase, meaning: c.meaning }))
    );

    const result = await aiStuckSuggest(chineseThought, corpus, flatCollocations);
    return {
      type: result.type,
      suggestion: result.suggestion,
    };
  } catch (err) {
    console.error('AI stuck suggestion failed, falling back to local:', err);
    // Fallback
    return {
      type: 'paraphrase',
      suggestion: `💡 AI 服务暂时不可用，以下是通用建议：\n\n尝试用更简单的词来表达 "${chineseThought}"。\n\n核心技巧：用 GET / MAKE / KEEP / GO 等万能动词替换陌生词汇！\n例如：\n"坚持不懈" → "keep going / never stop trying"\n"灵光一闪" → "come up with an idea"\n"进退两难" → "feel stuck between two choices"`,
    };
  }
}
