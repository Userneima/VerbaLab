import type { VocabCardItem, VocabCardRegisterGuide } from '../store/useStore';

export type VocabTagOptionGroup = {
  label: string;
  tags: string[];
};

export const VOCAB_TAG_OPTION_GROUPS: VocabTagOptionGroup[] = [
  {
    label: '场景',
    tags: ['#职场', '#商务', '#面试', '#邮件', '#日常', '#口语', '#写作', '#学术', '#技术'],
  },
  {
    label: '难度',
    tags: ['#入门', '#高频', '#进阶', '#四六级', '#考研', '#雅思', '#BEC', '#托福', '#外企常用'],
  },
  {
    label: '词性',
    tags: ['#n.', '#v.', '#adj.', '#adv.', '#prep.', '#phrase'],
  },
  {
    label: '用法',
    tags: ['#正式', '#非正式', '#书面', '#俚语', '#固定搭配', '#易错', '#易混', '#委婉', '#负面'],
  },
  {
    label: '记忆',
    tags: ['#形近', '#义近', '#词根', '#必背'],
  },
];

type TagGroupLabel = VocabTagOptionGroup['label'];

const TOPIC_TO_SCENARIO_TAGS: Record<string, string[]> = {
  日常用语: ['#口语', '#日常'],
  原词日常: ['#口语', '#日常'],
  'Daily Routine': ['#雅思', '#口语'],
  Hobbies: ['#雅思', '#口语'],
  Study: ['#雅思', '#口语'],
  'A Person You Admire': ['#雅思', '#口语'],
  'A Challenge You Overcame': ['#雅思', '#口语'],
  'A Skill You Want to Learn': ['#雅思', '#口语'],
  Technology: ['#雅思', '#口语'],
  Education: ['#雅思', '#口语'],
  Travel: ['#雅思', '#口语'],
  'An Interesting Place': ['#雅思', '#口语'],
};

const PART_SCENARIO_FALLBACK: Record<number, string[]> = {
  0: ['#口语', '#日常'],
  1: ['#雅思', '#口语'],
  2: ['#雅思', '#口语'],
  3: ['#雅思', '#口语'],
};

function normalizeTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

const STANDARD_TAGS = new Set(
  VOCAB_TAG_OPTION_GROUPS.flatMap((group) => group.tags).map((tag) => normalizeTag(tag))
);

const TAG_GROUP_BY_TAG = new Map<string, TagGroupLabel>(
  VOCAB_TAG_OPTION_GROUPS.flatMap((group) =>
    group.tags.map((tag) => [normalizeTag(tag), group.label] as const)
  )
);

function pushUnique(out: string[], seen: Set<string>, tag: string) {
  const normalized = normalizeTag(tag);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  out.push(normalized);
}

function inferPosTag(headword: string): string | null {
  const trimmed = headword.trim();
  if (!trimmed) return null;
  if (/\s/.test(trimmed)) return '#phrase';
  const lower = trimmed.toLowerCase();
  if (/ly$/.test(lower)) return '#adv.';
  if (/(tion|sion|ment|ness|ity|ism|ance|ence|ship|age)$/.test(lower)) return '#n.';
  if (/(ous|ive|able|ible|al|ic|ful|less|ary|ent|ant)$/.test(lower)) return '#adj.';
  if (/(ize|ise|ify|ate|en)$/.test(lower) && lower.length >= 5) return '#v.';
  return null;
}

function tagGroupOf(tag: string): TagGroupLabel | undefined {
  return TAG_GROUP_BY_TAG.get(normalizeTag(tag));
}

function hasGroup(tags: string[], group: TagGroupLabel): boolean {
  return tags.some((tag) => tagGroupOf(tag) === group);
}

function collectGuideText(registerGuide?: VocabCardRegisterGuide): string {
  if (!registerGuide) return '';
  return [
    registerGuide.anchorZh,
    ...registerGuide.alternatives.flatMap((alt) => [alt.labelZh, alt.usageZh]),
    registerGuide.compareExamples?.original,
    registerGuide.compareExamples?.spoken,
    ...(registerGuide.pitfalls || []),
    ...(registerGuide.coreCollocations || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function inferSceneTag(text: string, isCommonInSpokenEnglish: boolean): string | null {
  if (/面试|求职|interview/.test(text)) return '#面试';
  if (/邮件|email|mail/.test(text)) return '#邮件';
  if (/商务|商业|客户|谈判|汇报|销售|bec|business/.test(text)) return '#商务';
  if (/职场|工作|同事|会议|office|coworker|workplace/.test(text)) return '#职场';
  if (/学术|论文|研究|academic|paper|journal/.test(text)) return '#学术';
  if (/技术|编程|开发|工程|technical|software|code/.test(text)) return '#技术';
  if (isCommonInSpokenEnglish) return '#口语';
  return null;
}

function inferUsageFallbackTags(text: string, isCommonInSpokenEnglish: boolean): string[] {
  const tags: string[] = [];
  if (/固定搭配|固定说法|collocation/.test(text)) tags.push('#固定搭配');
  if (/负面|贬义|批评|harm|inequality|violence|stereotype/.test(text)) tags.push('#负面');
  if (/易错|别用|不要|混淆|误用/.test(text)) tags.push('#易错');
  if (/书面|学术|正式写作|written|academic/.test(text)) tags.push('#书面');
  if (/非正式|随口|聊天|朋友|casual|informal/.test(text)) tags.push('#非正式');
  if (!isCommonInSpokenEnglish) tags.unshift('#正式');
  return tags;
}

function inferDifficultyTag(isCommonInSpokenEnglish: boolean, text: string): string {
  if (/高频|常用|常见|frequent|common/.test(text)) return '#高频';
  return isCommonInSpokenEnglish ? '#高频' : '#进阶';
}

export function buildWordLabTags(input: {
  headword: string;
  items: VocabCardItem[];
  isCommonInSpokenEnglish: boolean;
  registerGuide?: VocabCardRegisterGuide;
  maxTags?: number;
}): string[] {
  const { headword, items, isCommonInSpokenEnglish, registerGuide, maxTags = 4 } = input;
  const seen = new Set<string>();
  const out: string[] = [];
  const guideText = collectGuideText(registerGuide);

  const hintedTags = registerGuide?.tagHints?.length
    ? registerGuide.tagHints
        .map((tag) => normalizeTag(tag))
        .filter((tag) => STANDARD_TAGS.has(tag))
    : [];

  for (const tag of hintedTags) {
    pushUnique(out, seen, tag);
    if (out.length >= maxTags) return out;
  }

  if (!hasGroup(out, '词性')) {
    const posTag = inferPosTag(headword);
    if (posTag) pushUnique(out, seen, posTag);
  }

  if (!hasGroup(out, '用法')) {
    for (const tag of inferUsageFallbackTags(guideText, isCommonInSpokenEnglish)) {
      pushUnique(out, seen, tag);
      if (out.length >= maxTags) return out;
      if (hasGroup(out, '用法') && tag !== '#易错') break;
    }
  }

  if (!hasGroup(out, '场景')) {
    const sceneTag = inferSceneTag(guideText, isCommonInSpokenEnglish);
    if (sceneTag) pushUnique(out, seen, sceneTag);
  }

  if (!hasGroup(out, '难度')) {
    pushUnique(out, seen, inferDifficultyTag(isCommonInSpokenEnglish, guideText));
  }

  if (!hasGroup(out, '记忆') && /易错|别用|不要|混淆|误用/.test(guideText)) {
    pushUnique(out, seen, '#易错');
  }

  for (const item of items) {
    if (item.topic === '日常用语' || item.topic === '原词日常') {
      continue;
    }
    const topicTags =
      (item.topic && TOPIC_TO_SCENARIO_TAGS[item.topic]) ||
      PART_SCENARIO_FALLBACK[item.part] ||
      ['#口语'];
    for (const tag of topicTags) {
      pushUnique(out, seen, tag);
      if (out.length >= maxTags) return out;
    }
  }

  if (out.length < maxTags && !hasGroup(out, '难度')) {
    pushUnique(out, seen, inferDifficultyTag(isCommonInSpokenEnglish, guideText));
  }
  if (out.length < maxTags && !hasGroup(out, '用法') && !isCommonInSpokenEnglish) {
    pushUnique(out, seen, '#正式');
  }
  return out.slice(0, maxTags);
}

export function mergeStandardizedTags(
  autoTags: string[],
  manualTags: string[],
  maxTags = 4
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...autoTags, ...manualTags]) {
    pushUnique(out, seen, tag);
    if (out.length >= maxTags) break;
  }
  return out;
}
