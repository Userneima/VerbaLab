export type CorpusEntry = {
  id: string;
  timestamp: string;
  verbId: string;
  verb: string;
  collocationId: string;
  collocation: string;
  userSentence: string;
  isCorrect: boolean;
  mode: 'test' | 'field' | 'stuck';
  tags: string[];
  nativeVersion?: string;
  nativeThinking?: string;
  zhTranslation?: string;
};

export type StuckPointEntry = {
  id: string;
  timestamp: string;
  chineseThought: string;
  englishAttempt: string;
  aiSuggestion: string;
  recommendedExpression?: string;
  resolved: boolean;
  sourceMode?: 'test' | 'field' | 'free';
  contextCollocation?: string;
};

export type VocabCardItem = {
  id: string;
  questionId: string;
  part: number;
  topic: string;
  questionSnapshot: string;
  sentence: string;
  collocationsUsed: string[];
  chinese?: string;
};

export type VocabCardRegisterAlternative = {
  phrase: string;
  labelZh: string;
  usageZh?: string;
};

export type VocabCardRegisterGuide = {
  anchorZh: string;
  alternatives: VocabCardRegisterAlternative[];
  compareExamples?: {
    original: string;
    spoken: string;
  };
  pitfalls?: string[];
  coreCollocations?: string[];
  tagHints?: string[];
};

export type VocabCard = {
  id: string;
  timestamp: string;
  headword: string;
  sense?: string;
  spokenPracticePhrase?: string;
  writtenSupplement?: string;
  registerNoteZh?: string;
  registerGuide?: VocabCardRegisterGuide;
  spokenAlternatives?: string[];
  isCommonInSpokenEnglish?: boolean;
  tags: string[];
  items: VocabCardItem[];
  source: 'ai_word_lab';
  lastViewedAt: string | null;
  nextDueAt: string | null;
  reviewStage: number;
};

export type LearningState = {
  corpus: CorpusEntry[];
  stuckPoints: StuckPointEntry[];
  vocabCards: VocabCard[];
  lastSyncedAt?: string;
};
