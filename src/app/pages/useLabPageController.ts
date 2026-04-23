import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  getAllCollocations,
  getIELTSContextForPhrase,
  searchCollocations,
  VERBS,
  type Collocation,
  type Verb,
} from '../data/verbData';
import { checkGrammar, checkChinglish, getStuckSuggestion, type GrammarError } from '../utils/grammarCheck';
import { aiGrammarTutor } from '../utils/api';
import { useStore } from '../store/StoreContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';

export type TestState = 'idle' | 'checking' | 'correct' | 'incorrect';
export type NativeSuggestionState = { sentence: string; thinking?: string; savedToCorpus: boolean } | null;

function pickDifficultyAssistExample(
  examples: Array<{ scenario: 'daily' | 'zju' | 'design'; content: string; chinese?: string }>,
  fallbackZh: string
) {
  const dailyWithZh = examples.find(ex => ex.scenario === 'daily' && ex.chinese?.trim());
  const anyWithZh = examples.find(ex => ex.chinese?.trim());
  const dailyAny = examples.find(ex => ex.scenario === 'daily');
  const picked = dailyWithZh || anyWithZh || dailyAny || examples[0] || null;
  if (!picked) return null;
  return {
    ...picked,
    chinese: picked.chinese?.trim() || fallbackZh.trim(),
  };
}

function getRandomContext(phrase: string): string {
  return getIELTSContextForPhrase(phrase);
}
function getRandomCollocation() {
  const all = getAllCollocations();
  return all[Math.floor(Math.random() * all.length)];
}

export function useLabPageController() {
  const navigate = useNavigate();
  const store = useStore();
  const speech = useSpeechRecognition();
  const [mobileRecentOpen, setMobileRecentOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(() => getRandomCollocation());
  const [chineseContext] = useState(() => getRandomContext(currentItem.collocation.phrase));
  const [contextStr, setContextStr] = useState(chineseContext);
  const [userInput, setUserInput] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [overallHint, setOverallHint] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [clickedLabExampleKey, setClickedLabExampleKey] = useState<string | null>(null);
  const [showLabTranslationGlobal, setShowLabTranslationGlobal] = useState(false);
  const [labStuckOpen, setLabStuckOpen] = useState(false);
  const [stuckInput, setStuckInput] = useState('');
  const [stuckLoading, setStuckLoading] = useState(false);
  const [stuckSuggestion, setStuckSuggestion] = useState<{ suggestion: string; type: 'corpus' | 'verb' | 'paraphrase' } | null>(null);
  const [nativeSuggestion, setNativeSuggestion] = useState<NativeSuggestionState>(null);
  const [difficultyAssistLevel, setDifficultyAssistLevel] = useState<0 | 1 | 2>(0);
  const [collocationPickerOpen, setCollocationPickerOpen] = useState(false);
  const [collocationSearch, setCollocationSearch] = useState('');
  const userInputRef = useRef<HTMLTextAreaElement>(null);

  const difficultyAssistExample = useMemo(
    () => pickDifficultyAssistExample(currentItem.collocation.examples, contextStr),
    [currentItem.collocation.examples, contextStr]
  );

  const collocationSearchMatches = useMemo(
    () => searchCollocations(collocationSearch, 10),
    [collocationSearch]
  );

  const loadNew = useCallback(() => {
    if (speech.isListening) speech.stopListening();
    const next = getRandomCollocation();
    setCurrentItem(next);
    setContextStr(getRandomContext(next.collocation.phrase));
    setCollocationSearch('');
    setUserInput('');
    setTestState('idle');
    setErrors([]);
    setOverallHint('');
    setShowExamples(false);
    setSubmissionCount(0);
    setTutorMessages([]);
    setTutorInput('');
    setTutorError(null);
    setClickedLabExampleKey(null);
    setShowLabTranslationGlobal(false);
    setLabStuckOpen(false);
    setStuckInput('');
    setStuckSuggestion(null);
    setNativeSuggestion(null);
    setDifficultyAssistLevel(0);
    setMobileRecentOpen(false);
  }, [speech]);

  const applyCollocationFromSearch = useCallback(
    (next: { verb: Verb; collocation: Collocation }) => {
      if (speech.isListening) speech.stopListening();
      setCurrentItem(next);
      setContextStr(getRandomContext(next.collocation.phrase));
      setUserInput('');
      setTestState('idle');
      setErrors([]);
      setOverallHint('');
      setShowExamples(false);
      setSubmissionCount(0);
      setTutorMessages([]);
      setTutorInput('');
      setTutorError(null);
      setClickedLabExampleKey(null);
      setShowLabTranslationGlobal(false);
      setLabStuckOpen(false);
      setStuckInput('');
      setStuckSuggestion(null);
      setNativeSuggestion(null);
      setDifficultyAssistLevel(0);
      setCollocationSearch('');
      setCollocationPickerOpen(false);
    },
    [speech]
  );

  const handleLowerDifficulty = useCallback(() => {
    if (!difficultyAssistExample) return;
    setDifficultyAssistLevel(level => (level === 0 ? 1 : 2));
  }, [difficultyAssistExample]);

  const handleUseDifficultyAssistSentence = useCallback((sentence: string) => {
    setUserInput(sentence);
    window.requestAnimationFrame(() => {
      const node = userInputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(sentence.length, sentence.length);
    });
  }, []);

  const insertSpeechIntoUserInput = useCallback((text: string) => {
    const spoken = text?.trim();
    if (!spoken) return;
    const el = userInputRef.current;
    const active = typeof document !== 'undefined' && el && document.activeElement === el;
    if (!active || !el) {
      setUserInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + spoken);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    setUserInput(prev => {
      const s = Math.max(0, Math.min(start, prev.length));
      const e = Math.max(s, Math.min(end, prev.length));
      const before = prev.slice(0, s);
      const after = prev.slice(e);
      const inserted = `${before && !/\s$/.test(before) ? ' ' : ''}${spoken}${after && !/^\s/.test(after) ? ' ' : ''}`;
      const next = `${before}${inserted}${after}`;
      const caret = before.length + inserted.length;
      window.requestAnimationFrame(() => {
        const node = userInputRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(caret, caret);
      });
      return next;
    });
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (speech.isListening) speech.stopListening();
    else speech.startListening(insertSpeechIntoUserInput, 'en-US');
  }, [speech, insertSpeechIntoUserInput]);

  const handleLabStuck = useCallback(async () => {
    const thought = stuckInput.trim();
    if (!thought) return;
    setStuckLoading(true);
    const suggestion = await getStuckSuggestion(
      thought,
      store.corpus.map(e => ({ userSentence: e.userSentence, collocation: e.collocation, verb: e.verb })),
      VERBS.map(v => ({ verb: v.verb, collocations: v.collocations.map(c => ({ phrase: c.phrase, meaning: c.meaning })) }))
    );
    setStuckSuggestion(suggestion);
    setStuckLoading(false);
    store.addStuckPoint({
      chineseThought: thought,
      englishAttempt: userInput.trim(),
      aiSuggestion: suggestion.guidanceZh?.trim() || suggestion.suggestion,
      recommendedExpression: suggestion.recommendedExpression,
      sourceMode: 'test',
      contextCollocation: currentItem.collocation.phrase,
    });
  }, [stuckInput, store, currentItem.collocation.phrase, userInput]);

  const handleSubmit = useCallback(async () => {
    if (!userInput.trim()) return;
    if (speech.isListening) speech.stopListening();
    setLabStuckOpen(false);
    setStuckSuggestion(null);
    setNativeSuggestion(null);
    setTestState('checking');
    setShowExamples(false);
    const result = await checkGrammar(userInput, currentItem.collocation.phrase);
    setSubmissionCount(s => s + 1);
    if (result.isCorrect) {
      setErrors([]);
      const trimmed = userInput.trim();
      const chinglish = await checkChinglish(trimmed, currentItem.collocation.phrase);
      if (chinglish.isChinglish && (chinglish.nativeVersion || chinglish.nativeThinking)) {
        store.addToCorpus({ verbId: currentItem.verb.id, verb: currentItem.verb.verb, collocationId: currentItem.collocation.id, collocation: currentItem.collocation.phrase, userSentence: trimmed, isCorrect: true, mode: 'test', tags: [currentItem.verb.verb.toLowerCase(), currentItem.collocation.phrase.toLowerCase()], nativeVersion: chinglish.nativeVersion, nativeThinking: chinglish.nativeThinking, isChinglish: true });
        store.markAsLearned(currentItem.collocation.id);
        setOverallHint('');
        setNativeSuggestion({ sentence: (chinglish.nativeVersion || '').trim(), thinking: chinglish.nativeThinking?.trim() || undefined, savedToCorpus: false });
        setTestState('correct');
      } else {
        setTestState('correct');
        store.addToCorpus({ verbId: currentItem.verb.id, verb: currentItem.verb.verb, collocationId: currentItem.collocation.id, collocation: currentItem.collocation.phrase, userSentence: trimmed, isCorrect: true, mode: 'test', tags: [currentItem.verb.verb.toLowerCase(), currentItem.collocation.phrase.toLowerCase()] });
        store.markAsLearned(currentItem.collocation.id);
      }
    } else {
      setTutorMessages([]);
      setTutorError(null);
      setTestState('incorrect');
      setErrors(result.errors);
      setOverallHint(result.overallHint);
      store.addToErrorBank({
        verbId: currentItem.verb.id,
        verb: currentItem.verb.verb,
        collocationId: currentItem.collocation.id,
        collocation: currentItem.collocation.phrase,
        originalSentence: userInput.trim(),
        correctedSentence: result.correctedSentence?.trim() || undefined,
        errorTypes: result.errors.map(e => e.type),
        errorCategory: 'grammar',
        diagnosis: result.errors.map((e, i) => `${i + 1}. ${e.description}`).join('\n'),
        hint: '',
        grammarPoints: result.errors.map(e => e.grammarPoint),
        reviewCueZh: contextStr.trim() || undefined,
      });
    }
  }, [userInput, currentItem, store, speech, contextStr]);

  const saveNativeSuggestionToCorpus = useCallback(() => {
    if (!nativeSuggestion?.sentence.trim() || nativeSuggestion.savedToCorpus) return;
    store.addToCorpus({ verbId: currentItem.verb.id, verb: currentItem.verb.verb, collocationId: currentItem.collocation.id, collocation: currentItem.collocation.phrase, userSentence: nativeSuggestion.sentence.trim(), isCorrect: true, mode: 'test', tags: [currentItem.verb.verb.toLowerCase(), currentItem.collocation.phrase.toLowerCase(), 'native-suggestion'] });
    setNativeSuggestion(prev => (prev ? { ...prev, savedToCorpus: true } : prev));
  }, [nativeSuggestion, store, currentItem]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  }, [handleSubmit]);

  const sendTutorMessage = useCallback(async () => {
    const q = tutorInput.trim();
    if (!q || tutorLoading) return;
    setTutorError(null);
    const nextMsgs = [...tutorMessages, { role: 'user' as const, content: q }];
    setTutorMessages(nextMsgs);
    setTutorInput('');
    setTutorLoading(true);
    try {
      const { reply } = await aiGrammarTutor({
        sentence: userInput.trim(),
        collocation: currentItem.collocation.phrase,
        chineseContext: contextStr,
        errors: errors.map(e => ({ description: e.description, hint: e.hint, grammarPoint: e.grammarPoint })),
        overallHint: overallHint || '',
        messages: nextMsgs,
      });
      setTutorMessages([...nextMsgs, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setTutorError(err?.message || '请求失败，请稍后重试');
      setTutorMessages(prev => prev.slice(0, -1));
      setTutorInput(q);
    } finally {
      setTutorLoading(false);
    }
  }, [tutorInput, tutorLoading, tutorMessages, userInput, currentItem, contextStr, errors, overallHint]);

  const goCorpusSentence = useCallback((id: string) => {
    navigate(`/corpus?sentence=${encodeURIComponent(id)}`);
    setMobileRecentOpen(false);
  }, [navigate]);
  const goErrorEntry = useCallback((id: string) => {
    navigate(`/errors?highlight=${encodeURIComponent(id)}`);
    setMobileRecentOpen(false);
  }, [navigate]);

  useEffect(() => {
    if (!mobileRecentOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileRecentOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileRecentOpen]);

  return {
    store,
    speech,
    userInputRef,
    currentItem,
    contextStr, setContextStr,
    userInput, setUserInput,
    testState, errors, overallHint, expandedError, setExpandedError,
    showExamples, setShowExamples,
    submissionCount,
    tutorMessages, tutorInput, setTutorInput, tutorLoading, tutorError,
    clickedLabExampleKey, setClickedLabExampleKey,
    showLabTranslationGlobal, setShowLabTranslationGlobal,
    labStuckOpen, setLabStuckOpen,
    stuckInput, setStuckInput, stuckLoading, stuckSuggestion, setStuckSuggestion,
    nativeSuggestion,
    difficultyAssistLevel,
    setDifficultyAssistLevel,
    difficultyAssistExample,
    collocationPickerOpen,
    setCollocationPickerOpen,
    mobileRecentOpen, setMobileRecentOpen,
    isLearned: store.learnedCollocations.has(currentItem.collocation.id),
    loadNew, handleSubmit, handleKeyDown, handleToggleRecording, handleLabStuck, saveNativeSuggestionToCorpus, sendTutorMessage,
    handleLowerDifficulty,
    handleUseDifficultyAssistSentence,
    goCorpusSentence, goErrorEntry,
    collocationSearch,
    setCollocationSearch,
    collocationSearchMatches,
    applyCollocationFromSearch,
  };
}
