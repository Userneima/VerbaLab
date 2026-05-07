import { requestJson } from '../../platform/request';
import type { VocabCardItem, VocabCardRegisterGuide } from '../learning/types';

type VocabApiItem = {
  sentence?: string;
  collocationsUsed?: string[];
  chinese?: string;
  reviewChunks?: string[];
};

export type GeneratedVocabCard = {
  headword: string;
  sense?: string;
  spokenPracticePhrase: string;
  isCommonInSpokenEnglish: boolean;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  items: VocabApiItem[];
};

const COLLOCATION_POOL = [
  { phrase: 'feel pressure', meaning: '感到压力', verb: 'feel' },
  { phrase: 'make progress', meaning: '取得进步', verb: 'make' },
  { phrase: 'take action', meaning: '采取行动', verb: 'take' },
  { phrase: 'gain confidence', meaning: '获得信心', verb: 'gain' },
  { phrase: 'build a habit', meaning: '养成习惯', verb: 'build' },
  { phrase: 'deal with challenges', meaning: '应对挑战', verb: 'deal' },
  { phrase: 'come up with ideas', meaning: '想出主意', verb: 'come' },
  { phrase: 'make a difference', meaning: '产生影响', verb: 'make' },
  { phrase: 'keep things simple', meaning: '把事情简单化', verb: 'keep' },
  { phrase: 'get an opportunity', meaning: '得到机会', verb: 'get' },
  { phrase: 'improve efficiency', meaning: '提高效率', verb: 'improve' },
  { phrase: 'express my opinion', meaning: '表达我的观点', verb: 'express' },
];

function uniquePush(out: string[], value?: string) {
  const trimmed = value?.trim();
  if (!trimmed || out.includes(trimmed)) return;
  out.push(trimmed);
}

function inferPosTag(headword: string): string {
  const word = headword.trim().toLowerCase();
  if (!word) return '#高频';
  if (/\s/.test(word)) return '#phrase';
  if (/ly$/.test(word)) return '#adv.';
  if (/(tion|sion|ment|ness|ity|ism|ance|ence|ship|age)$/.test(word)) return '#n.';
  if (/(ous|ive|able|ible|al|ic|ful|less|ary|ent|ant)$/.test(word)) return '#adj.';
  if (/(ize|ise|ify|ate|en)$/.test(word) && word.length >= 5) return '#v.';
  return '#高频';
}

export function buildWeappVocabTags(input: {
  headword: string;
  isCommonInSpokenEnglish?: boolean;
  registerGuide?: VocabCardRegisterGuide;
}): string[] {
  const tags: string[] = [];
  for (const hint of input.registerGuide?.tagHints || []) {
    uniquePush(tags, hint.startsWith('#') ? hint : `#${hint}`);
    if (tags.length >= 4) return tags;
  }
  uniquePush(tags, inferPosTag(input.headword));
  uniquePush(tags, input.isCommonInSpokenEnglish ? '#口语' : '#书面');
  uniquePush(tags, '#高频');
  return tags.slice(0, 4);
}

function hasDetailedGuide(card: GeneratedVocabCard): boolean {
  const alternatives = card.registerGuide?.alternatives?.filter((item) => item.usageZh?.trim()) || [];
  return Boolean(
    card.registerNoteZh?.trim() &&
      card.registerGuide?.anchorZh?.trim() &&
      alternatives.length >= 2 &&
      card.registerGuide?.compareExamples?.original?.trim() &&
      card.registerGuide?.compareExamples?.spoken?.trim() &&
      (card.registerGuide?.pitfalls?.length ?? 0) >= 1 &&
      (card.registerGuide?.coreCollocations?.length ?? 0) >= 2
  );
}

export function mapGeneratedItems(items: VocabApiItem[]): Array<Omit<VocabCardItem, 'id'> & { id?: string }> {
  return items
    .filter((item) => item.sentence?.trim())
    .map((item, index) => ({
      questionId: 'weapp-word-lab',
      part: 0,
      topic: index === 0 ? '日常用语' : '原词日常',
      questionSnapshot: '',
      sentence: item.sentence?.trim() || '',
      collocationsUsed: Array.isArray(item.collocationsUsed)
        ? item.collocationsUsed.map((phrase) => phrase.trim()).filter(Boolean)
        : [],
      chinese: item.chinese?.trim() || undefined,
      reviewChunks: Array.isArray(item.reviewChunks)
        ? item.reviewChunks.map((chunk) => chunk.trim()).filter(Boolean)
        : undefined,
    }));
}

export async function generateVocabCard(headword: string, sense?: string): Promise<GeneratedVocabCard> {
  const base = await requestJson<GeneratedVocabCard>({
    method: 'POST',
    path: '/ai/vocab-card',
    data: {
      headword,
      sense,
      collocations: COLLOCATION_POOL,
    },
  });

  if (hasDetailedGuide(base)) return base;

  const guide = await requestJson<Partial<GeneratedVocabCard>>({
    method: 'POST',
    path: '/ai/vocab-card-register-guide',
    data: {
      headword,
      sense,
    },
  }).catch(() => null);

  if (!guide) return base;

  return {
    ...base,
    spokenPracticePhrase: guide.spokenPracticePhrase || base.spokenPracticePhrase,
    isCommonInSpokenEnglish:
      typeof guide.isCommonInSpokenEnglish === 'boolean'
        ? guide.isCommonInSpokenEnglish
        : base.isCommonInSpokenEnglish,
    spokenAlternatives: guide.spokenAlternatives?.length ? guide.spokenAlternatives : base.spokenAlternatives,
    writtenSupplement:
      guide.writtenSupplement !== undefined ? guide.writtenSupplement : base.writtenSupplement,
    registerNoteZh: guide.registerNoteZh || base.registerNoteZh,
    registerGuide: guide.registerGuide || base.registerGuide,
  };
}
