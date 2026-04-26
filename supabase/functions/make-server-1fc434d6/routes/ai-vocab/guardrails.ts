export const ALLOWED_VOCAB_TAGS = [
  "#职场",
  "#商务",
  "#面试",
  "#邮件",
  "#日常",
  "#口语",
  "#写作",
  "#学术",
  "#技术",
  "#入门",
  "#高频",
  "#进阶",
  "#四六级",
  "#考研",
  "#雅思",
  "#BEC",
  "#托福",
  "#外企常用",
  "#n.",
  "#v.",
  "#adj.",
  "#adv.",
  "#prep.",
  "#phrase",
  "#正式",
  "#非正式",
  "#书面",
  "#俚语",
  "#固定搭配",
  "#易错",
  "#易混",
  "#委婉",
  "#负面",
  "#形近",
  "#义近",
  "#词根",
  "#必背",
];

const TAG_CATEGORIES: Array<{ name: string; tags: Set<string> }> = [
  {
    name: "scene",
    tags: new Set([
      "#职场",
      "#商务",
      "#面试",
      "#邮件",
      "#日常",
      "#口语",
      "#写作",
      "#学术",
      "#技术",
    ]),
  },
  {
    name: "difficulty",
    tags: new Set([
      "#入门",
      "#高频",
      "#进阶",
      "#四六级",
      "#考研",
      "#雅思",
      "#BEC",
      "#托福",
      "#外企常用",
    ]),
  },
  { name: "pos", tags: new Set(["#n.", "#v.", "#adj.", "#adv.", "#prep.", "#phrase"]) },
  {
    name: "usage",
    tags: new Set([
      "#正式",
      "#非正式",
      "#书面",
      "#俚语",
      "#固定搭配",
      "#易错",
      "#易混",
      "#委婉",
      "#负面",
    ]),
  },
  { name: "memory", tags: new Set(["#形近", "#义近", "#词根", "#必背"]) },
];

export type RegisterGuide = {
  anchorZh: string;
  alternatives: Array<{
    phrase: string;
    labelZh: string;
    usageZh?: string;
  }>;
  compareExamples?: {
    original: string;
    spoken: string;
  };
  pitfalls?: string[];
  coreCollocations?: string[];
  tagHints?: string[];
};

export type RegisterGuideQuality = {
  passed: boolean;
  issues: string[];
};

export type RegisterAnalysisStyle =
  | "formal_abstract_shift"
  | "formal_plain_shift"
  | "already_spoken"
  | "professional_or_domain"
  | "polysemous_metaphor_noun"
  | "phrase";

const POLYSEMOUS_METAPHOR_NOUN_HEADWORDS = new Set([
  "mirage",
  "illusion",
  "fantasy",
  "myth",
  "utopia",
]);

const POLYSEMOUS_METAPHOR_HINT_RE =
  /(海市蜃楼|泡影|错觉|假象|幻觉|幻象|幻想|虚幻|虚假|比喻|字面|literal|figurative|metaphor|illusion|pipe dream|fantasy|false hope|wishful thinking|unreal|not real)/i;

const POLYSEMOUS_METAPHOR_BOUNDARY_RE =
  /(海市蜃楼|泡影|错觉|假象|幻觉|幻象|幻想|字面|比喻|不只|别只|不要只|literal|figurative|not just|more than)/i;

export function normalizeTagHint(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function countTagCategories(tags?: string[]): number {
  if (!tags?.length) return 0;
  const categories = new Set<string>();
  for (const rawTag of tags) {
    const tag = normalizeTagHint(rawTag);
    for (const group of TAG_CATEGORIES) {
      if (group.tags.has(tag)) categories.add(group.name);
    }
  }
  return categories.size;
}

export function isPolysemousMetaphorNoun(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
}): boolean {
  const headword = input.headword.trim().toLowerCase();
  if (!headword || /\s/.test(headword)) return false;
  if (POLYSEMOUS_METAPHOR_NOUN_HEADWORDS.has(headword)) return true;

  const combined = `${input.sense} ${input.phraseForExample}`.trim().toLowerCase();
  const looksNounLike =
    /(n\.|noun|名词|概念|抽象|idea|concept|image|vision|hope|goal|dream)/i.test(combined) ||
    /(age|ion|ity|ness|ment|ism|ure|hood|ship|ance|ence)$/.test(headword);

  return looksNounLike && POLYSEMOUS_METAPHOR_HINT_RE.test(combined);
}

export function buildSenseFocusHint(input: {
  headword: string;
  sense: string;
  phraseForExample?: string;
}): string {
  const explicitSense = input.sense.trim();
  if (explicitSense) return `严格锁定用户指定义项：${explicitSense}`;
  if (
    isPolysemousMetaphorNoun({
      headword: input.headword,
      sense: input.sense,
      phraseForExample: input.phraseForExample || input.headword,
    })
  ) {
    return `${input.headword} 同时有字面义和比喻义；若用户未额外说明，优先分析更常用于抽象表达的比喻义，不要默认写成沙漠/光学现象。`;
  }
  return "";
}

export function inferRecoveryAnalysisStyle(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
}): RegisterAnalysisStyle {
  const headword = input.headword.trim().toLowerCase();
  const combined = `${input.sense} ${input.phraseForExample}`.toLowerCase();

  if (/\s/.test(headword)) return "phrase";
  if (isPolysemousMetaphorNoun(input)) return "polysemous_metaphor_noun";
  if (/(职场|商务|邮件|面试|技术|学术|office|business|email|interview|technical|academic)/.test(combined)) {
    return "professional_or_domain";
  }
  if (/(正式|书面|学术|少口语|rare in speech|formal|written|academic)/.test(combined)) {
    return /(ate|ify|ize|ise)$/.test(headword) ? "formal_abstract_shift" : "formal_plain_shift";
  }
  if (/(ly|ous|ive|ful|less|able|ible|al|ic|ary|ent|ant|y)$/.test(headword)) return "already_spoken";
  if (/(ate|ify|ize|ise)$/.test(headword)) return "formal_abstract_shift";
  return "formal_plain_shift";
}

export function guessIsCommonFromStyle(style: RegisterAnalysisStyle): boolean {
  return style !== "formal_abstract_shift" && style !== "formal_plain_shift";
}

export function choosePhraseForExample(input: {
  headword: string;
  style: RegisterAnalysisStyle;
  spokenAlternatives: string[];
}): string {
  const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const firstAlt = input.spokenAlternatives.find((phrase) => phrase.trim()) || input.headword;
  if (input.style === "formal_abstract_shift" || input.style === "formal_plain_shift") {
    return firstAlt;
  }
  if (input.style === "professional_or_domain" && norm(firstAlt) !== norm(input.headword)) {
    return firstAlt;
  }
  return input.headword;
}


export function validateRegisterGuideQuality(
  noteZh: string,
  guide?: RegisterGuide,
  context?: { style?: RegisterAnalysisStyle; headword?: string },
): RegisterGuideQuality {
  const issues: string[] = [];
  const alternativesWithUsage = guide?.alternatives.filter((alt) => alt.phrase && alt.usageZh) || [];
  if (noteZh.trim().length < 10) issues.push("补一条更明确的中文总结 noteZh");
  if (!guide?.anchorZh || guide.anchorZh.trim().length < 12) issues.push("原词定位不够清楚");
  if (alternativesWithUsage.length < 2) issues.push("分档替换至少给 2 条且每条带 usageZh");
  if (!guide?.compareExamples?.original || !guide.compareExamples?.spoken) issues.push("缺少正式/口语对比例句");
  if ((guide?.pitfalls?.length ?? 0) < 1) issues.push("缺少至少 1 条避坑提示");
  if ((guide?.coreCollocations?.length ?? 0) < 2) issues.push("目标搭配至少给 2 条");
  if ((guide?.tagHints?.length ?? 0) < 2) issues.push("标签至少给 2 个");
  if (countTagCategories(guide?.tagHints) < 2) issues.push("标签需要覆盖至少 2 个类别");
  if (context?.style === "polysemous_metaphor_noun") {
    const boundaryText = [
      noteZh,
      guide?.anchorZh || "",
      ...(guide?.pitfalls || []),
      ...alternativesWithUsage.map((alt) => alt.usageZh || ""),
    ].join(" ");
    if (!POLYSEMOUS_METAPHOR_BOUNDARY_RE.test(boundaryText)) {
      issues.push("多义/比喻义名词需要点明字面义和比喻义的边界");
    }
    if (!(guide?.alternatives || []).some((alt) => /口语/.test(alt.labelZh))) {
      issues.push("多义/比喻义名词至少要给 1 条口语替换");
    }
    const originalSentence = guide?.compareExamples?.original?.toLowerCase() || "";
    const normalizedHeadword = context.headword?.trim().toLowerCase();
    if (normalizedHeadword && !originalSentence.includes(normalizedHeadword)) {
      issues.push("例句对比里的 original 句要保留原词，方便看到义项差异");
    }
  }
  return { passed: issues.length === 0, issues };
}


export function inferRegisterAnalysisStyle(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
  isCommonInSpokenEnglish: boolean;
}): RegisterAnalysisStyle {
  const headword = input.headword.trim().toLowerCase();
  const sense = input.sense.trim().toLowerCase();
  const phrase = input.phraseForExample.trim().toLowerCase();
  const combined = `${sense} ${phrase}`;

  if (/\s/.test(headword)) return "phrase";
  if (isPolysemousMetaphorNoun(input)) return "polysemous_metaphor_noun";
  if (/(职场|商务|邮件|面试|技术|学术|office|business|email|interview|technical|academic)/.test(combined)) {
    return "professional_or_domain";
  }
  if (input.isCommonInSpokenEnglish) return "already_spoken";
  if (/(ate|ify|ize|ise)$/.test(headword)) return "formal_abstract_shift";
  return "formal_plain_shift";
}


export function applyRegisterGuardrails(input: {
  headword: string;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
}): {
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
} {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const headword = norm(input.headword);
  const phrase = norm(input.phraseForExample);
  const badContinuationPhrases = new Set(["keep going", "carry on", "keep it up", "continue"]);

  if (headword === "perpetuate" && badContinuationPhrases.has(phrase)) {
    return {
      phraseForExample: "keep alive",
      spokenAlternatives: ["keep alive", "prop up", "maintain"],
      writtenSupplement: input.writtenSupplement || input.headword,
      noteZh: "perpetuate 指让有害的事长期延续；口语里更接近 keep alive，不是 keep going。",
      registerGuide: {
        anchorZh: "perpetuate = 使有害的事、观念或不公长期持续存在，极度正式，偏书面/学术语境。",
        alternatives: [
          { phrase: "keep alive", labelZh: "日常口语", usageZh: "口语里表达“让坏东西一直存在”时更自然。" },
          { phrase: "prop up", labelZh: "参考说法", usageZh: "更偏批评语气，强调硬撑着不好的东西。" },
          { phrase: "maintain", labelZh: "参考说法", usageZh: "更中性，也可用于正式说明。" },
        ],
        compareExamples: {
          original: "Stereotypes perpetuate harm.",
          spoken: "Stereotypes keep harmful attitudes alive.",
        },
        pitfalls: ["别用 keep going 或 carry on，它们更像“人继续做某事”，和 perpetuate 不是一回事。"],
        coreCollocations: ["perpetuate stereotypes", "perpetuate harm", "perpetuate inequality"],
        tagHints: ["#v.", "#正式", "#书面", "#负面"],
      },
    };
  }

  return {
    phraseForExample: input.phraseForExample,
    spokenAlternatives: input.spokenAlternatives,
    writtenSupplement: input.writtenSupplement,
    noteZh: input.noteZh,
    registerGuide: input.registerGuide,
  };
}

