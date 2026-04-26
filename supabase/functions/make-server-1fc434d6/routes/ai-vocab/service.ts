import { callDeepSeek, isAiUsageBlockedError, parseJsonFromModel } from "../ai-shared.ts";
import { ALLOWED_VOCAB_TAGS, applyRegisterGuardrails, buildSenseFocusHint, choosePhraseForExample, guessIsCommonFromStyle, inferRecoveryAnalysisStyle, inferRegisterAnalysisStyle, uniqueStrings, validateRegisterGuideQuality, type RegisterGuide } from "./guardrails.ts";
import { mergeRegisterGuides, parseRegisterGuide } from "./parser.ts";
import { buildRegisterAnalysisExample } from "./prompts.ts";

export type DeepSeekCaller = typeof callDeepSeek;

async function enrichRegisterGuide(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
  spokenAlternatives: string[];
  isCommonInSpokenEnglish: boolean;
  writtenSupplement: string | null;
  model: string;
  retryReasons?: string[];
  currentNoteZh?: string;
  currentGuide?: RegisterGuide;
  attempt?: number;
  callDeepSeekFn?: DeepSeekCaller;
}): Promise<{
  noteZh: string;
  spokenAlternatives: string[];
  registerGuide?: RegisterGuide;
}> {
  const style = inferRegisterAnalysisStyle({
    headword: input.headword,
    sense: input.sense,
    phraseForExample: input.phraseForExample,
    isCommonInSpokenEnglish: input.isCommonInSpokenEnglish,
  });
  const example = buildRegisterAnalysisExample(style);
  const senseFocusHint = buildSenseFocusHint({
    headword: input.headword,
    sense: input.sense,
    phraseForExample: input.phraseForExample,
  });

  const systemPrompt =
    "你是给中国英语学习者做“语体判断卡”的教练。输出必须帮助用户回答：平时到底怎么说，什么时候保留原词。\n\n" +
    "你的目标不是写词典解释，而是写一张高密度的用法决策卡。必须保证语义严格对等，不能为了口语化而换成不同意思的词。\n\n" +
    "输出 ONLY valid JSON（不要 markdown、不要代码块）：\n" +
    "{\n" +
    '  "noteZh": "一句中文总结：原词是否适合口语、日常更常说什么",\n' +
    '  "spokenAlternatives": ["2-4 个 spoken/neutral 替换，最自然的排第一"],\n' +
    '  "registerGuide": {\n' +
    '    "anchorZh": "一句中文：原词核心义 + 褒贬色彩 + 语域",\n' +
    '    "alternatives": [\n' +
    '      {\n' +
    '        "phrase": "替换词",\n' +
    '        "labelZh": "日常口语 / 参考说法 / 中性通用 / 正式书面",\n' +
    '        "usageZh": "一句中文说明这个替换的场景与语气"\n' +
    "      }\n" +
    "    ],\n" +
    '    "compareExamples": {\n' +
    '      "original": "保留原词的句子，同一场景",\n' +
    '      "spoken": "更口语/通用替换的句子，同一场景同一含义"\n' +
    "    },\n" +
    '    "pitfalls": ["1-2 条中文避坑提示"],\n' +
    '    "coreCollocations": ["2-4 条原词高价值搭配"],\n' +
    '    "tagHints": ["2-4 个标签，且至少覆盖 2 个类别"]\n' +
    "  }\n" +
    "}\n\n" +
    "硬规则：\n" +
    "- alternatives 至少 2 条，而且每条都要带 usageZh。\n" +
    "- compareExamples.original 和 compareExamples.spoken 必须描述同一件事，只能换表达方式，不能改意思。\n" +
    "- pitfalls 必须至少 1 条；如果常见错替换很多，优先指出最容易误导学习者的那个。\n" +
    "- coreCollocations 至少 2 条，必须是原词高价值搭配，不要给空泛组合。\n" +
    "- tagHints 必须只从这个 allowlist 里选：" +
    ALLOWED_VOCAB_TAGS.join(", ") +
    "。\n" +
    "- tagHints 要覆盖至少 2 个类别，优先组合：词性 + 语域/风格 + 难度/场景。\n" +
    "- 如果原词本身已经常用于口语，也要给完整解析，不要偷懒写空白卡。\n\n" +
    "按这种风格学习输出：\n" +
    example.styleGuidance +
    "\n示例 JSON：\n" +
    example.exampleJson;

  const userPrompt =
    'Learner original wording: "' +
    input.headword +
    '"' +
    (input.sense ? "\nSense/context note: " + input.sense : "") +
    "\nCurrent spoken target: " +
    input.phraseForExample +
    "\nCurrent alternatives: " +
    JSON.stringify(input.spokenAlternatives) +
    "\nIs common in spoken English: " +
    String(input.isCommonInSpokenEnglish) +
    (input.writtenSupplement ? "\nWritten supplement: " + input.writtenSupplement : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
    (input.currentNoteZh ? "\nCurrent noteZh draft: " + input.currentNoteZh : "") +
    (input.currentGuide ? "\nCurrent registerGuide draft: " + JSON.stringify(input.currentGuide) : "") +
    (input.retryReasons?.length
      ? "\nCurrent draft problems that MUST be fixed: " + input.retryReasons.join("；")
      : "") +
    "\nAttempt: " +
    String(input.attempt || 1) +
    "\nReturn JSON only.";

  try {
    const runDeepSeek = input.callDeepSeekFn ?? callDeepSeek;
    const result = await runDeepSeek(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      0.2,
      1200,
      input.model,
    );
    const raw = parseJsonFromModel(result) as Record<string, unknown>;
    const noteZh = String(raw.noteZh || "").trim();
    const spokenAlternatives = Array.isArray(raw.spokenAlternatives)
      ? (raw.spokenAlternatives as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : input.spokenAlternatives;
    const registerGuide = parseRegisterGuide(raw.registerGuide);
    return {
      noteZh,
      spokenAlternatives: spokenAlternatives.length ? spokenAlternatives : input.spokenAlternatives,
      registerGuide,
    };
  } catch (e) {
    if (isAiUsageBlockedError(e)) throw e;
    console.log(`enrichRegisterGuide failed: ${e}`);
    return {
      noteZh: "",
      spokenAlternatives: input.spokenAlternatives,
      registerGuide: undefined,
    };
  }
}

async function recoverSpokenRegisterAfterParseFailure(input: {
  headword: string;
  sense: string;
  model: string;
  rawResult: string;
  callDeepSeekFn?: DeepSeekCaller;
}): Promise<{
  isCommonInSpokenEnglish: boolean;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
}> {
  const style = inferRecoveryAnalysisStyle({
    headword: input.headword,
    sense: input.sense,
    phraseForExample: input.headword,
  });
  const isCommon = guessIsCommonFromStyle(style);
  let finalAlternatives = [input.headword];
  let finalNoteZh = "";
  let finalRegisterGuide: RegisterGuide | undefined;
  let quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
    style,
    headword: input.headword,
  });

  for (let attempt = 1; attempt <= 3 && !quality.passed; attempt += 1) {
    const enriched = await enrichRegisterGuide({
      headword: input.headword,
      sense: input.sense,
      phraseForExample: input.headword,
      spokenAlternatives: finalAlternatives,
      isCommonInSpokenEnglish: isCommon,
      writtenSupplement: null,
      model: input.model,
      retryReasons: ["首轮语体判断响应无法解析成 JSON，请直接返回完整 JSON", ...quality.issues],
      currentNoteZh: finalNoteZh,
      currentGuide: finalRegisterGuide,
      attempt,
      callDeepSeekFn: input.callDeepSeekFn,
    });
    if (enriched.noteZh.trim()) finalNoteZh = enriched.noteZh.trim();
    if (enriched.spokenAlternatives.length) {
      finalAlternatives = uniqueStrings([...enriched.spokenAlternatives, ...finalAlternatives]);
    }
    finalRegisterGuide = mergeRegisterGuides(finalRegisterGuide, enriched.registerGuide);
    quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
      style,
      headword: input.headword,
    });
  }

  const phraseForExample = choosePhraseForExample({
    headword: input.headword,
    style,
    spokenAlternatives: finalAlternatives,
  });
  const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const writtenSupplement = !isCommon && norm(phraseForExample) !== norm(input.headword)
    ? input.headword
    : null;

  return {
    isCommonInSpokenEnglish: isCommon,
    phraseForExample,
    spokenAlternatives: finalAlternatives,
    writtenSupplement,
    noteZh: finalNoteZh,
    registerGuide: finalRegisterGuide,
  };
}

export async function assessSpokenRegister(
  headword: string,
  sense: string,
  model: string,
  callDeepSeekFn: DeepSeekCaller = callDeepSeek,
): Promise<{
  isCommonInSpokenEnglish: boolean;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
}> {
  const systemPrompt =
    "You help Chinese ESL learners choose natural SPOKEN English. The learner will type an English word or short phrase they want to practice.\n\n" +
    "Judge whether their target is commonly used in everyday casual conversation (with friends, family, coworkers in informal talk), " +
    "or is mainly written, academic, literary, legal, medical jargon in print, or otherwise rare in speech.\n\n" +
    "Your output must be semantically precise. NEVER suggest a spoken replacement that changes the core meaning, subject type, sentiment, or argument structure.\n" +
    "If there is no truly equivalent casual replacement, keep the learner's wording as the spoken phrase.\n\n" +
    "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
    "{\n" +
    '  "isCommonInSpokenEnglish": true or false,\n' +
    '  "phraseForExample": "string — the ONE wording to use in a single spoken example sentence. If isCommonInSpokenEnglish is true, use the learner\'s wording (fix only capitalization). If false, pick the most natural thing natives say in speech (simple word, phrasal verb, or idiom like \\"runs in the family\\"); do NOT force the formal word into the example.",\n' +
    '  "spokenAlternatives": ["2 to 4 alternatives, most natural first"],\n' +
    '  "writtenSupplement": "string or null — if you chose phraseForExample different from the learner\'s input because theirs is formal/rare in speech, put THEIR original word/phrase here as the \\"written/academic\\" label; otherwise null.",\n' +
    '  "noteZh": "one short sentence in Chinese: why phraseForExample fits spoken English better when you switched, or confirm it is already colloquial.",\n' +
    '  "registerGuide": {\n' +
    '    "anchorZh": "一句中文，精确锚定原词义 + 语域，比如：perpetuate = 使有害的事长期持续存在，极度正式，仅书面/学术用",\n' +
    '    "alternatives": [\n' +
    '      {\n' +
    '        "phrase": "spoken or neutral wording",\n' +
    '        "labelZh": "日常口语 / 中性通用 / 正式书面",\n' +
    '        "usageZh": "一句中文说明这个替换的场景与语气"\n' +
    "      }\n" +
    "    ],\n" +
    '    "compareExamples": {\n' +
    '      "original": "one short sentence using the learner original wording",\n' +
    '      "spoken": "one short sentence using the spoken replacement, same situation and same meaning"\n' +
    "    },\n" +
    '    "pitfalls": ["1 to 2 条中文避坑提醒，指出不能乱换的表达"],\n' +
    '    "coreCollocations": ["2 to 4 core collocations of the learner original wording"],\n' +
    '    "tagHints": ["从允许标签中选 2 到 4 个，比如 #v. #正式 #学术 #书面"]\n' +
    "  }\n" +
    "}\n\n" +
    "Rules:\n" +
    "- phraseForExample must be a single chunk you can embed in one short sentence (not a list).\n" +
    "- spokenAlternatives must include phraseForExample first or mirror the same ideas.\n" +
    "- If the learner's term is already fine for speaking, set isCommonInSpokenEnglish true and phraseForExample to their term.\n" +
    "- compareExamples.original and compareExamples.spoken must describe the same event or claim; only wording/register changes.\n" +
    "- If the learner word has literal and figurative senses, lock the target sense in anchorZh/pitfalls and do not mix replacements from different senses.\n" +
    "- If phraseForExample differs from the learner target, pitfalls should explain common wrong replacements when relevant.\n" +
    "- tagHints must contain 2 to 4 tags from AT LEAST 2 different categories. Do not return only #正式 or only one category.\n" +
    "- Prefer this mix when possible: 1 词性 tag + 1 用法/语域 tag + 1 难度/场景 tag.\n" +
    "- tagHints must only use tags from this exact allowlist: " +
    ALLOWED_VOCAB_TAGS.join(", ") +
    ".";
  const senseFocusHint = buildSenseFocusHint({
    headword,
    sense,
    phraseForExample: headword,
  });

  const userContent =
    'Learner target: "' +
    headword +
    '"' +
    (sense ? "\nSense / context note: " + sense : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
    "\nReturn JSON only.";

  const result = await callDeepSeekFn(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
    0.2,
    768,
    model,
  );

  try {
    const raw = parseJsonFromModel(result) as Record<string, unknown>;
    const phraseForExample = String(raw.phraseForExample || "").trim() || headword;
    const noteZh = String(raw.noteZh || "").trim();
    const isCommon = Boolean(raw.isCommonInSpokenEnglish);
    const alts = Array.isArray(raw.spokenAlternatives)
      ? (raw.spokenAlternatives as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [];
    const registerGuide = parseRegisterGuide(raw.registerGuide);
    let writtenSupplement = raw.writtenSupplement != null && String(raw.writtenSupplement).trim()
      ? String(raw.writtenSupplement).trim()
      : null;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    if (!writtenSupplement && norm(phraseForExample) !== norm(headword)) {
      writtenSupplement = headword;
    }
    const guarded = applyRegisterGuardrails({
      headword,
      phraseForExample,
      spokenAlternatives: alts.length ? alts : [phraseForExample],
      writtenSupplement,
      noteZh,
      registerGuide,
    });
    let finalNoteZh = guarded.noteZh;
    let finalAlternatives = guarded.spokenAlternatives;
    let finalRegisterGuide = guarded.registerGuide;
    const analysisStyle = inferRegisterAnalysisStyle({
      headword,
      sense,
      phraseForExample: guarded.phraseForExample,
      isCommonInSpokenEnglish: isCommon,
    });
    let quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
      style: analysisStyle,
      headword,
    });

    for (let attempt = 1; attempt <= 2 && !quality.passed; attempt += 1) {
      const enriched = await enrichRegisterGuide({
        headword,
        sense,
        phraseForExample: guarded.phraseForExample,
        spokenAlternatives: finalAlternatives,
        isCommonInSpokenEnglish: isCommon,
        writtenSupplement: guarded.writtenSupplement,
        model,
        retryReasons: quality.issues,
        currentNoteZh: finalNoteZh,
        currentGuide: finalRegisterGuide,
        attempt,
        callDeepSeekFn,
      });
      if (enriched.noteZh.trim()) finalNoteZh = enriched.noteZh.trim();
      if (enriched.spokenAlternatives.length) {
        finalAlternatives = uniqueStrings([...enriched.spokenAlternatives, ...finalAlternatives]);
      }
      finalRegisterGuide = mergeRegisterGuides(finalRegisterGuide, enriched.registerGuide);
      quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
        style: analysisStyle,
        headword,
      });
    }
    return {
      isCommonInSpokenEnglish: isCommon,
      phraseForExample: guarded.phraseForExample,
      spokenAlternatives: finalAlternatives,
      writtenSupplement: guarded.writtenSupplement,
      noteZh: finalNoteZh,
      registerGuide: finalRegisterGuide,
    };
  } catch (e) {
    console.log(`assessSpokenRegister parse failed: ${e} raw=${result.slice(0, 300)}`);
    return recoverSpokenRegisterAfterParseFailure({
      headword,
      sense,
      model,
      rawResult: result,
      callDeepSeekFn,
    });
  }
}

export async function generateOriginalDailyFallbackItem(
  headword: string,
  sense: string,
  colLines: string,
  model: string,
  callDeepSeekFn: DeepSeekCaller = callDeepSeek,
): Promise<{
  sentence: string;
  collocationsUsed: string[];
  chinese?: string;
} | null> {
  const senseFocusHint = buildSenseFocusHint({
    headword,
    sense,
    phraseForExample: headword,
  });
  const systemPrompt =
    "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
    "TASK: Write ONE short natural English sentence for real life.\n\n" +
    "The learner wants their ORIGINAL word or phrase used in a believable everyday moment " +
    "(chatting, texting, explaining to a friend, casual work talk, commenting on something they read or watched — " +
    "NOT essay or exam style).\n\n" +
    'The sentence MUST naturally include this learner wording (same surface form; inflections only if grammar requires): "' +
    headword +
    '"' +
    (sense ? "\nSense note: " + sense : "") +
    "\n\n" +
    (senseFocusHint ? "Sense focus: " + senseFocusHint + "\n\n" : "") +
    "Use AT LEAST ONE collocation from the whitelist below (verbatim phrase appearing in the sentence).\n\n" +
    "COLLOCATION WHITELIST:\n" +
    colLines +
    "\n\n" +
    "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
    "{\n" +
    '  "sentence": "English sentence",\n' +
    '  "collocationsUsed": ["phrase from whitelist used in sentence"],\n' +
    '  "chinese": "该句中文释义"\n' +
    "}\n\n" +
    "Rules: usually 8-16 words; conversational; contractions OK when natural; one clear main clause preferred.";

  const userContent =
    'Learner original wording: "' +
    headword +
    '"' +
    (sense ? "\nSense: " + sense : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
    "\nReturn JSON only.";

  try {
    const result = await callDeepSeekFn(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      0.35,
      1024,
      model,
    );
    const parsed = parseJsonFromModel(result) as {
      sentence?: string;
      collocationsUsed?: unknown;
      chinese?: string;
    };
    const sentence = String(parsed?.sentence || "").trim();
    if (!sentence) return null;
    const collocationsUsed = Array.isArray(parsed?.collocationsUsed)
      ? (parsed.collocationsUsed as unknown[]).map((x) => String(x))
      : [];
    return {
      sentence,
      collocationsUsed,
      chinese: String(parsed?.chinese || "").trim() || undefined,
    };
  } catch (e) {
    if (isAiUsageBlockedError(e)) throw e;
    console.log(`generateOriginalDailyFallbackItem failed: ${e}`);
    return null;
  }
}
