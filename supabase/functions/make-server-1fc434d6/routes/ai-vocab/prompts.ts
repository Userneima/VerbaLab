import { ALLOWED_VOCAB_TAGS, buildSenseFocusHint, type RegisterAnalysisStyle } from "./guardrails.ts";

export function buildRegisterAnalysisExample(style: RegisterAnalysisStyle): {
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

export function buildVocabCardGenerationPrompt(input: {
  headword: string;
  sense: string;
  phraseForSentence: string;
  colLines: string;
  needOriginalDailySentence: boolean;
}): { systemPrompt: string; userContent: string } {
  const senseFocusHint = buildSenseFocusHint({
    headword: input.headword,
    sense: input.sense,
    phraseForExample: input.phraseForSentence,
  });
  const dualSentenceBlock = input.needOriginalDailySentence
    ? '\n\nDUAL OUTPUT REQUIRED:\n' +
      `The learner typed "${input.headword}" but the spoken practice target is "${input.phraseForSentence}" (more colloquial for speech).\n` +
      `You MUST return exactly TWO objects in "items", in this order:\n` +
      `- items[0]: One everyday spoken sentence built around the SPOKEN target "${input.phraseForSentence}" (same style rules as below).\n` +
      `- items[1]: One short sentence showing how the learner's ORIGINAL wording "${input.headword}" can still appear in everyday life (chatting, texting, explaining to a friend, casual work talk, commenting on something you read or watched — believable daily moments, not essay style). items[1] MUST naturally include "${input.headword}" (same surface form as learner input; inflections only if grammar requires).\n` +
      "BOTH items must each use AT LEAST ONE collocation from the whitelist (verbatim phrase appearing in that sentence).\n"
    : "";

  const itemCountRule = input.needOriginalDailySentence
    ? '- Return exactly TWO objects in "items", in the order above.\n'
    : '- Return exactly ONE object in "items".\n';

  const systemPrompt =
    "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
    "TASK: Write short, natural English sentence(s) for real life (work, home, friends, errands — NOT exam prompts).\n\n" +
    dualSentenceBlock +
    'Each sentence MUST:\n' +
    `1) For items[0] only: naturally include this spoken target (inflections OK): "${input.phraseForSentence}"` +
    (input.sense ? `\n   (Learner sense note: ${input.sense})` : "") +
    "\n" +
    "2) Use AT LEAST ONE collocation from the whitelist below in EACH sentence you output (verbatim phrase as written).\n\n" +
    `Learner originally typed: "${input.headword}".\n\n` +
    (senseFocusHint ? `Resolved sense focus: ${senseFocusHint}\n\n` : "") +
    "COLLOCATION WHITELIST (only use phrases from this list):\n" +
    input.colLines +
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
    `Spoken practice target: "${input.phraseForSentence}"\nOriginal learner input: "${input.headword}"` +
    (input.sense ? `\nSense note: ${input.sense}` : "") +
    (senseFocusHint ? `\nSense focus guidance: ${senseFocusHint}` : "") +
    (input.needOriginalDailySentence ? "\nReturn two items: [0] spoken target sentence, [1] original wording in daily use." : "") +
    "\nGenerate JSON as specified.";

  return { systemPrompt, userContent };
}
