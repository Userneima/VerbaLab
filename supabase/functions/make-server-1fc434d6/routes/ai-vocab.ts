import type { Hono } from "npm:hono";
import {
  aiUsageBlockedResponse,
  callDeepSeek,
  callTrackedDeepSeek,
  isAiUsageBlockedError,
  parseJsonFromModel,
} from "./ai-shared.ts";

type DeepSeekCaller = typeof callDeepSeek;

const ALLOWED_VOCAB_TAGS = [
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

type RegisterGuide = {
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

type RegisterGuideQuality = {
  passed: boolean;
  issues: string[];
};

type RegisterAnalysisStyle =
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

function normalizeTagHint(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
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

function countTagCategories(tags?: string[]): number {
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

function isPolysemousMetaphorNoun(input: {
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

function buildSenseFocusHint(input: {
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

function inferRecoveryAnalysisStyle(input: {
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

function guessIsCommonFromStyle(style: RegisterAnalysisStyle): boolean {
  return style !== "formal_abstract_shift" && style !== "formal_plain_shift";
}

function choosePhraseForExample(input: {
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

function parseRegisterGuide(raw: unknown): RegisterGuide | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const guide = raw as Record<string, unknown>;
  const anchorZh = String(guide.anchorZh || "").trim();
  const alternatives = Array.isArray(guide.alternatives)
    ? (guide.alternatives as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const alt = item as Record<string, unknown>;
          const phrase = String(alt.phrase || "").trim();
          const labelZh = String(alt.labelZh || "").trim();
          if (!phrase || !labelZh) return null;
          const usageZh = String(alt.usageZh || "").trim();
          return {
            phrase,
            labelZh,
            usageZh: usageZh || undefined,
          };
        })
        .filter(Boolean) as RegisterGuide["alternatives"]
    : [];
  const compareExamples =
    guide.compareExamples && typeof guide.compareExamples === "object" && !Array.isArray(guide.compareExamples)
      ? (() => {
          const example = guide.compareExamples as Record<string, unknown>;
          const original = String(example.original || "").trim();
          const spoken = String(example.spoken || "").trim();
          return original && spoken ? { original, spoken } : undefined;
        })()
      : undefined;
  const pitfalls = Array.isArray(guide.pitfalls)
    ? (guide.pitfalls as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const coreCollocations = Array.isArray(guide.coreCollocations)
    ? (guide.coreCollocations as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const tagHints = Array.isArray(guide.tagHints)
    ? (guide.tagHints as unknown[])
        .map((x) => normalizeTagHint(String(x)))
        .filter((tag, index, arr) => tag && arr.indexOf(tag) === index && ALLOWED_VOCAB_TAGS.includes(tag))
    : undefined;

  if (!anchorZh && alternatives.length === 0 && !compareExamples && !pitfalls?.length && !coreCollocations?.length) {
    return undefined;
  }

  return {
    anchorZh,
    alternatives,
    compareExamples,
    pitfalls: pitfalls?.length ? pitfalls : undefined,
    coreCollocations: coreCollocations?.length ? coreCollocations : undefined,
    tagHints: tagHints?.length ? tagHints : undefined,
  };
}

function mergeRegisterGuides(base?: RegisterGuide, patch?: RegisterGuide): RegisterGuide | undefined {
  if (!base && !patch) return undefined;
  const mergedAlternatives = patch?.alternatives?.length ? patch.alternatives : base?.alternatives || [];
  const mergedTagHints = uniqueStrings([...(base?.tagHints || []), ...(patch?.tagHints || [])]);
  const mergedPitfalls = uniqueStrings([...(patch?.pitfalls || []), ...(base?.pitfalls || [])]);
  const mergedCollocations = uniqueStrings([...(patch?.coreCollocations || []), ...(base?.coreCollocations || [])]);
  return {
    anchorZh: String(patch?.anchorZh || base?.anchorZh || "").trim(),
    alternatives: mergedAlternatives,
    compareExamples: patch?.compareExamples || base?.compareExamples,
    pitfalls: mergedPitfalls.length ? mergedPitfalls : undefined,
    coreCollocations: mergedCollocations.length ? mergedCollocations : undefined,
    tagHints: mergedTagHints.length ? mergedTagHints : undefined,
  };
}

function validateRegisterGuideQuality(
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

function inferRegisterAnalysisStyle(input: {
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

function buildRegisterAnalysisExample(style: RegisterAnalysisStyle): {
  styleGuidance: string;
  exampleJson: string;
} {
  switch (style) {
    case "polysemous_metaphor_noun":
      return {
        styleGuidance:
          "适合既有字面义又有比喻义的抽象名词。先锁定这张卡要讲的义项，再写口语/通用替换，明确不同替换各自强调的语义，不要把字面义和比喻义混在一起。",
        exampleJson: JSON.stringify({
          noteZh:
            "mirage 不只指海市蜃楼，更常用来比喻看似很近、其实不存在的希望；日常改写常会说 illusion 或 pipe dream。",
          spokenAlternatives: ["mirage", "illusion", "pipe dream", "fantasy"],
          registerGuide: {
            anchorZh: "mirage = 海市蜃楼；也可比喻虚幻的希望、泡影，中性偏贬义，通用（口语 + 书面都常用）。",
            alternatives: [
              { phrase: "mirage", labelZh: "日常口语", usageZh: "本词本身就能直接说，尤其适合“看似有希望、实际不存在”的比喻义。" },
              { phrase: "illusion", labelZh: "口语替代", usageZh: "最通用，强调“错觉、假象、不真实的东西”。" },
              { phrase: "pipe dream", labelZh: "参考说法", usageZh: "更地道、更口语，强调“不太可能实现的幻想”。" },
              { phrase: "fantasy", labelZh: "参考说法", usageZh: "更偏想象或幻想，弱化“看似真实却会破灭”的意味。" },
            ],
            compareExamples: {
              original: "Success proved to be a mirage.",
              spoken: "Success turned out to be just an illusion.",
            },
            pitfalls: [
              "mirage 不只指“海市蜃楼”；在比喻义里，它更常指看似很近、其实不存在的希望或目标，别和单纯的 imagination 混在一起。",
              "如果你想强调“白日梦、太不现实的幻想”，pipe dream 往往比 mirage 更口语。",
            ],
            coreCollocations: ["a mirage of success", "the mirage of prosperity", "a political mirage"],
            tagHints: ["#n.", "#进阶", "#书面", "#易混"],
          },
        }),
      };
    case "formal_abstract_shift":
      return {
        styleGuidance: "适合抽象、偏书面、容易被错误口语替换的词。重点写清楚语义核心、感情色彩和错误替换为什么错。",
        exampleJson: JSON.stringify({
          noteZh: "perpetuate 指让有害的事长期延续；口语里更接近 keep alive，不是 keep going。",
          spokenAlternatives: ["keep alive", "prop up", "maintain"],
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
        }),
      };
    case "professional_or_domain":
      return {
        styleGuidance: "适合职场、商务、邮件、技术等专业语境。重点写清楚什么时候保留原词，什么时候换成更随口的说法。",
        exampleJson: JSON.stringify({
          noteZh: "deadline 本身就能直接用于职场口语和邮件；更随口时也常说 due date。",
          spokenAlternatives: ["deadline", "due date", "cutoff"],
          registerGuide: {
            anchorZh: "deadline = 截止时间，职场/邮件高频词，本身就常用于口语和书面沟通。",
            alternatives: [
              { phrase: "deadline", labelZh: "日常口语", usageZh: "工作、会议、项目跟进里直接说最自然。" },
              { phrase: "due date", labelZh: "参考说法", usageZh: "更中性，适合解释时间要求。" },
              { phrase: "cutoff", labelZh: "参考说法", usageZh: "更像规则或系统里的截止点。" },
            ],
            compareExamples: {
              original: "The deadline is Friday.",
              spoken: "The due date is Friday.",
            },
            pitfalls: ["别把 deadline 一律改成 end time；很多场景里反而更不地道。"],
            coreCollocations: ["meet a deadline", "deadline is Friday", "tight deadline"],
            tagHints: ["#n.", "#职场", "#邮件", "#高频"],
          },
        }),
      };
    case "phrase":
      return {
        styleGuidance: "适合短语或 phrasal verb。重点写清楚短语本身是否已经口语高频，以及近义短语的语气区别。",
        exampleJson: JSON.stringify({
          noteZh: "follow up 本身就是高频职场口语短语；不同替换说法主要是语气轻重不同。",
          spokenAlternatives: ["follow up", "check back", "get back to"],
          registerGuide: {
            anchorZh: "follow up = 跟进、继续处理，职场沟通和邮件里都很常见，本身就适合口语。",
            alternatives: [
              { phrase: "follow up", labelZh: "日常口语", usageZh: "工作沟通里最通用、最自然。" },
              { phrase: "check back", labelZh: "参考说法", usageZh: "更像稍后再确认一次。" },
              { phrase: "get back to", labelZh: "参考说法", usageZh: "更像回复对方或回到某个问题上。" },
            ],
            compareExamples: {
              original: "I'll follow up on this tomorrow.",
              spoken: "I'll get back to you on this tomorrow.",
            },
            pitfalls: ["别把 follow up 机械换成 continue；后者缺少“跟进某件事”的语义。"],
            coreCollocations: ["follow up on this", "follow up with someone", "quick follow-up"],
            tagHints: ["#phrase", "#职场", "#邮件", "#高频"],
          },
        }),
      };
    case "already_spoken":
      return {
        styleGuidance: "适合本身就能直接说的常用词。不要硬制造正式/口语对立，要写成“本身可直接说 + 更自然的变体/重说法”。",
        exampleJson: JSON.stringify({
          noteZh: "helpful 本身就能直接用于口语；想更自然也常说 really useful 或 a big help。",
          spokenAlternatives: ["helpful", "really useful", "a big help"],
          registerGuide: {
            anchorZh: "helpful = 有帮助的，本身就是高频口语词，中性通用。",
            alternatives: [
              { phrase: "helpful", labelZh: "日常口语", usageZh: "本身就很自然，直接说即可。" },
              { phrase: "really useful", labelZh: "参考说法", usageZh: "更像随口评价工具、建议或信息。" },
              { phrase: "a big help", labelZh: "参考说法", usageZh: "更像口语里总结帮助或表达感谢。" },
            ],
            compareExamples: {
              original: "Your feedback was helpful.",
              spoken: "Your feedback was a big help.",
            },
            pitfalls: ["别为了显得高级硬换成 assistive 或 beneficial，日常交流里反而更别扭。"],
            coreCollocations: ["helpful advice", "helpful feedback", "be helpful"],
            tagHints: ["#adj.", "#高频", "#口语"],
          },
        }),
      };
    case "formal_plain_shift":
    default:
      return {
        styleGuidance: "适合正式但不算特别抽象的单词。重点写清楚口语里更常换成哪个更朴素的词。",
        exampleJson: JSON.stringify({
          noteZh: "utilize 在口语里通常直接换成 use；保留原词时会显得更正式、更书面。",
          spokenAlternatives: ["use", "make use of", "employ"],
          registerGuide: {
            anchorZh: "utilize = 使用，语义不复杂，但语体偏正式，常见于书面、商务或学术表达。",
            alternatives: [
              { phrase: "use", labelZh: "日常口语", usageZh: "日常交流里最自然、最不费力。" },
              { phrase: "make use of", labelZh: "参考说法", usageZh: "比 use 稍正式一点，但仍常见。" },
              { phrase: "employ", labelZh: "参考说法", usageZh: "更偏正式说明，常见于商务或学术。" },
            ],
            compareExamples: {
              original: "We utilize AI to improve the workflow.",
              spoken: "We use AI to improve the workflow.",
            },
            pitfalls: ["口语里别为了显得高级硬用 utilize，大多数场景直接说 use 更自然。"],
            coreCollocations: ["utilize resources", "utilize data", "utilize AI"],
            tagHints: ["#v.", "#正式", "#书面", "#进阶"],
          },
        }),
      };
  }
}

function applyRegisterGuardrails(input: {
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

async function assessSpokenRegister(
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

async function generateOriginalDailyFallbackItem(
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

export function registerVocabAiRoutes(app: Hono) {
  const makeTrackedCaller = (c: any, feature: string): DeepSeekCaller =>
    (messages, temperature, maxTokens, model) =>
      callTrackedDeepSeek(c, feature, messages, temperature, maxTokens, model);

  const vocabCardHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();
      const collocations = Array.isArray(body.collocations) ? body.collocations : [];

      if (!headword) return c.json({ error: "headword is required" }, 400);
      if (collocations.length < 1) return c.json({ error: "collocations array is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const reg = await assessSpokenRegister(
        headword,
        sense,
        vocabModel,
        makeTrackedCaller(c, "vocab_register_assess"),
      );
      const phraseForSentence = reg.phraseForExample;
      const senseFocusHint = buildSenseFocusHint({
        headword,
        sense,
        phraseForExample: phraseForSentence,
      });

      const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const needOriginalDailySentence = norm(headword) !== norm(phraseForSentence);

      const colLines = collocations
        .slice(0, 35)
        .map((x: any) => (typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`))
        .join("\n");

      const dualSentenceBlock = needOriginalDailySentence
        ? '\n\nDUAL OUTPUT REQUIRED:\n' +
          `The learner typed "${headword}" but the spoken practice target is "${phraseForSentence}" (more colloquial for speech).\n` +
          `You MUST return exactly TWO objects in "items", in this order:\n` +
          `- items[0]: One everyday spoken sentence built around the SPOKEN target "${phraseForSentence}" (same style rules as below).\n` +
          `- items[1]: One short sentence showing how the learner's ORIGINAL wording "${headword}" can still appear in everyday life (chatting, texting, explaining to a friend, casual work talk, commenting on something you read or watched — believable daily moments, not essay style). items[1] MUST naturally include "${headword}" (same surface form as learner input; inflections only if grammar requires).\n` +
          "BOTH items must each use AT LEAST ONE collocation from the whitelist (verbatim phrase appearing in that sentence).\n"
        : "";

      const itemCountRule = needOriginalDailySentence
        ? '- Return exactly TWO objects in "items", in the order above.\n'
        : '- Return exactly ONE object in "items".\n';

      const systemPrompt =
        "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
        "TASK: Write short, natural English sentence(s) for real life (work, home, friends, errands — NOT exam prompts).\n\n" +
        dualSentenceBlock +
        'Each sentence MUST:\n' +
        `1) For items[0] only: naturally include this spoken target (inflections OK): "${phraseForSentence}"` +
        (sense ? `\n   (Learner sense note: ${sense})` : "") +
        "\n" +
        "2) Use AT LEAST ONE collocation from the whitelist below in EACH sentence you output (verbatim phrase as written).\n\n" +
        `Learner originally typed: "${headword}".\n\n` +
        (senseFocusHint ? `Resolved sense focus: ${senseFocusHint}\n\n` : "") +
        "COLLOCATION WHITELIST (only use phrases from this list):\n" +
        colLines +
        "\n\n" +
        "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
        "{\n" +
        '  "items": [\n' +
        "    {\n" +
        '      "sentence": "English sentence",\n' +
        '      "collocationsUsed": ["phrase from whitelist used in sentence"],\n' +
        '      "chinese": "该句中文释义"\n' +
        "    }\n" +
        "  ]\n" +
        "}\n\n" +
        "Strict style rules:\n" +
        itemCountRule +
        "- Sentence length should usually be 8-16 words each; avoid very long or multi-clause sentences.\n" +
        "- Prefer one clear main clause; at most one simple subordinate clause per sentence.\n" +
        "- Prefer conversational wording and contractions when natural (I'm, it's, don't, can't).\n" +
        "- Do NOT frame as an answer to a test question; standalone real-life lines.\n" +
        "- collocationsUsed must be non-empty for each item; phrases must appear in the sentence naturally.\n" +
        "- Avoid awkward literal translation style.\n" +
        "- Do NOT include questionId or tags.";

      const userContent =
        `Spoken practice target: "${phraseForSentence}"\nOriginal learner input: "${headword}"` +
        (sense ? `\nSense note: ${sense}` : "") +
        (senseFocusHint ? `\nSense focus guidance: ${senseFocusHint}` : "") +
        (needOriginalDailySentence ? "\nReturn two items: [0] spoken target sentence, [1] original wording in daily use." : "") +
        "\nGenerate JSON as specified.";

      const result = await callTrackedDeepSeek(
        c,
        "vocab_card",
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        0.35,
        2048,
        vocabModel,
      );

      let parsed: { items?: any[] };
      try {
        parsed = parseJsonFromModel(result) as { items?: any[] };
      } catch {
        console.log(`Failed to parse vocab-card response: ${result.slice(0, 500)}`);
        return c.json({ error: "Failed to parse AI response" }, 500);
      }

      const rawItems = parsed.items || [];

      const mapItem = (it: any) => ({
        sentence: String(it?.sentence || "").trim(),
        collocationsUsed: Array.isArray(it?.collocationsUsed)
          ? it.collocationsUsed.map((x: any) => String(x))
          : [],
        chinese: String(it?.chinese || "").trim() || undefined,
      });

      const first = rawItems.find((it: any) => it && String(it.sentence || "").trim());
      if (!first) return c.json({ error: "AI returned no valid items" }, 500);

      const itemsOut = [mapItem(first)];

      if (needOriginalDailySentence && rawItems.length > 1) {
        const second = rawItems[1];
        if (second && String(second.sentence || "").trim()) itemsOut.push(mapItem(second));
      }

      if (needOriginalDailySentence && itemsOut.length < 2) {
        const fb = await generateOriginalDailyFallbackItem(
          headword,
          sense,
          colLines,
          vocabModel,
          makeTrackedCaller(c, "vocab_original_daily"),
        );
        if (fb) itemsOut.push(fb);
      }

      return c.json({
        headword,
        sense: sense || undefined,
        spokenPracticePhrase: phraseForSentence,
        isCommonInSpokenEnglish: reg.isCommonInSpokenEnglish,
        spokenAlternatives: reg.spokenAlternatives,
        writtenSupplement: reg.writtenSupplement,
        registerNoteZh: reg.noteZh || undefined,
        registerGuide: reg.registerGuide,
        items: itemsOut,
      });
    } catch (err) {
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card: ${err}`);
      return c.json({ error: `Vocab card generation failed: ${err}` }, 500);
    }
  };

  const vocabCardOriginalDailyHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();
      const collocations = Array.isArray(body.collocations) ? body.collocations : [];

      if (!headword) return c.json({ error: "headword is required" }, 400);
      if (collocations.length < 1) return c.json({ error: "collocations array is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const colLines = collocations
        .slice(0, 35)
        .map((x: any) => (typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`))
        .join("\n");

      const item = await generateOriginalDailyFallbackItem(
        headword,
        sense,
        colLines,
        vocabModel,
        makeTrackedCaller(c, "vocab_original_daily"),
      );
      if (!item) return c.json({ error: "Failed to generate original-daily sentence" }, 500);
      return c.json({ item });
    } catch (err) {
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card-original-daily: ${err}`);
      return c.json({ error: `Vocab card original-daily failed: ${err}` }, 500);
    }
  };

  const vocabCardRegisterGuideHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();

      if (!headword) return c.json({ error: "headword is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const reg = await assessSpokenRegister(
        headword,
        sense,
        vocabModel,
        makeTrackedCaller(c, "vocab_register_guide"),
      );

      return c.json({
        headword,
        sense: sense || undefined,
        spokenPracticePhrase: reg.phraseForExample,
        isCommonInSpokenEnglish: reg.isCommonInSpokenEnglish,
        spokenAlternatives: reg.spokenAlternatives,
        writtenSupplement: reg.writtenSupplement,
        registerNoteZh: reg.noteZh || undefined,
        registerGuide: reg.registerGuide,
      });
    } catch (err) {
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card-register-guide: ${err}`);
      return c.json({ error: `Vocab card register-guide failed: ${err}` }, 500);
    }
  };

  app.post("/make-server-1fc434d6/ai/vocab-card", vocabCardHandler);
  app.post("/ai/vocab-card", vocabCardHandler);
  app.post("/make-server-1fc434d6/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
  app.post("/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
  app.post("/make-server-1fc434d6/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);
  app.post("/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);
}
