import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { IELTS_QUESTIONS, VERBS } from '../data/verbData';
import { getStuckSuggestion } from '../utils/grammarCheck';
import { aiEvaluateAnswer, trackProductEvent } from '../utils/api';
import { useStore } from '../store/StoreContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { buildFieldDifficultyAssist } from '../utils/fieldDifficultyAssist';
import {
  type SentenceTile,
  buildShuffledChunkTilePool,
  tokenizeSentenceToChunkedTiles,
  verifyReconstructedSentence,
} from '../utils/sentenceTileBank';
import { normalizeForMatch } from '../utils/reviewGate';
import { FieldAnswerPanel } from '../components/field/FieldAnswerPanel';
import { FieldCorpusSidebar, FieldMobileCorpusButton } from '../components/field/FieldCorpusPanel';
import { FieldEvaluationPanel } from '../components/field/FieldEvaluationPanel';
import { FieldStuckPanel } from '../components/field/FieldStuckPanel';
import type { FieldEvaluationResult, FieldQuestion, FieldState } from '../components/field/types';

function getRandomQuestion(): FieldQuestion {
  return IELTS_QUESTIONS[Math.floor(Math.random() * IELTS_QUESTIONS.length)];
}

function localEvaluateAnswer(answer: string): FieldEvaluationResult {
  const lower = answer.toLowerCase();
  const wordCount = answer.split(/\s+/).filter(Boolean).length;

  const coreVerbs = ['get', 'take', 'make', 'do', 'have', 'go', 'set', 'keep', 'give', 'put', 'come', 'see', 'know', 'think', 'find', 'tell', 'ask', 'work', 'feel', 'need'];
  const verbsUsed = coreVerbs.filter(v => lower.includes(v));

  const fluency = Math.min(100, Math.round(40 + wordCount * 1.5 + (answer.includes(',') ? 10 : 0) + (answer.includes('.') ? 5 : 0)));
  const grammar = answer[0] === answer[0].toUpperCase() && /[.!?]$/.test(answer.trim()) ? 80 : 60;
  const vocabulary = Math.min(100, 50 + verbsUsed.length * 8);
  const score = Math.round((fluency + grammar + vocabulary) / 3);

  const feedback: string[] = [];
  if (wordCount < 20) feedback.push('回答较短，可以展开细节，增加例子');
  if (verbsUsed.length === 0) feedback.push('尝试使用更多万能动词（如 make, get, keep）');
  if (verbsUsed.length > 2) feedback.push(`很好！使用了 ${verbsUsed.length} 个万能动词`);
  if (!answer.includes(',') && wordCount > 15) feedback.push('可以使用逗号连接从句，让句子更流畅');
  if (answer[0] !== answer[0].toUpperCase()) feedback.push('注意句子开头要大写');
  if (!/[.!?]$/.test(answer.trim())) feedback.push('记得在句子末尾加标点');
  if (wordCount >= 30) feedback.push('答题长度适当，内容丰富！');
  feedback.push('（注意：当前为本地评测模式，AI 服务暂不可用）');

  return { score, fluency, grammar, vocabulary, feedback, verbsUsed };
}

export function FieldPage() {
  const store = useStore();
  const [question, setQuestion] = useState(() => getRandomQuestion());
  const [answer, setAnswer] = useState('');
  const [fieldState, setFieldState] = useState<FieldState>('answering');
  const [stuckInput, setStuckInput] = useState('');
  const [stuckLoading, setStuckLoading] = useState(false);
  const [stuckSuggestion, setStuckSuggestion] = useState<{ suggestion: string; type: 'corpus' | 'verb' | 'paraphrase' } | null>(null);
  const [evaluation, setEvaluation] = useState<FieldEvaluationResult | null>(null);
  const [usedVoiceThisRound, setUsedVoiceThisRound] = useState(false);
  const [corpusPanelOpen, setCorpusPanelOpen] = useState(false);
  const [difficultyAssistLevel, setDifficultyAssistLevel] = useState<0 | 1 | 2 | 3>(0);
  const [fieldTilePool, setFieldTilePool] = useState<SentenceTile[]>([]);
  const [fieldTileSelected, setFieldTileSelected] = useState<SentenceTile[]>([]);
  const [fieldTileError, setFieldTileError] = useState<string | null>(null);
  const [fieldTileDone, setFieldTileDone] = useState(false);
  const [fieldAssistError, setFieldAssistError] = useState<string | null>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechRecognition();

  const difficultyAssist = useMemo(() => buildFieldDifficultyAssist(question), [question]);
  const difficultyRefTiles = useMemo(
    () => tokenizeSentenceToChunkedTiles(difficultyAssist.keySentence),
    [difficultyAssist.keySentence]
  );

  useEffect(() => {
    if (difficultyAssistLevel !== 3 || !difficultyAssist.keySentence) {
      setFieldTilePool([]);
      setFieldTileSelected([]);
      setFieldTileError(null);
      setFieldTileDone(false);
      return;
    }
    setFieldTilePool(buildShuffledChunkTilePool(difficultyAssist.keySentence));
    setFieldTileSelected([]);
    setFieldTileError(null);
    setFieldTileDone(false);
  }, [difficultyAssist.keySentence, difficultyAssistLevel]);

  useEffect(() => {
    if (!corpusPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCorpusPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [corpusPanelOpen]);

  const handleNewQuestion = useCallback(() => {
    setQuestion(getRandomQuestion());
    setAnswer('');
    setFieldState('answering');
    setStuckInput('');
    setStuckSuggestion(null);
    setEvaluation(null);
    setUsedVoiceThisRound(false);
    setCorpusPanelOpen(false);
    setDifficultyAssistLevel(0);
    setFieldTilePool([]);
    setFieldTileSelected([]);
    setFieldTileError(null);
    setFieldTileDone(false);
    setFieldAssistError(null);
    if (speech.isListening) speech.stopListening();
  }, [speech]);

  const handleLowerDifficulty = useCallback(() => {
    setFieldAssistError(null);
    setDifficultyAssistLevel(prev =>
      prev === 0 ? 1 : prev === 1 ? 2 : prev === 2 ? 3 : 3
    );
  }, []);

  const handleResetDifficultyAssist = useCallback(() => {
    setDifficultyAssistLevel(0);
    setFieldTilePool([]);
    setFieldTileSelected([]);
    setFieldTileError(null);
    setFieldTileDone(false);
    setFieldAssistError(null);
  }, []);

  const handleMoveTileToAnswer = useCallback((tile: SentenceTile) => {
    setFieldTileError(null);
    setFieldTilePool(prev => prev.filter(t => t.id !== tile.id));
    setFieldTileSelected(prev => [...prev, tile]);
  }, []);

  const handleMoveTileToPool = useCallback((tile: SentenceTile) => {
    setFieldTileError(null);
    setFieldTileSelected(prev => prev.filter(t => t.id !== tile.id));
    setFieldTilePool(prev => [...prev, tile]);
  }, []);

  const handleCheckFieldTiles = useCallback(() => {
    setFieldTileError(null);
    if (fieldTileSelected.length !== difficultyRefTiles.length) {
      setFieldTileError(`请先排满 ${difficultyRefTiles.length} 个词块（当前 ${fieldTileSelected.length} 个）。`);
      return;
    }
    if (!verifyReconstructedSentence(fieldTileSelected, difficultyAssist.keySentence)) {
      setFieldTileError('顺序还不对，点击已选词块可放回下方重排。');
      return;
    }
    setFieldTileDone(true);
    setFieldAssistError(null);
    setAnswer(prev => {
      const current = prev.trim();
      if (!current) return difficultyAssist.keySentence;
      if (normalizeForMatch(current).includes(normalizeForMatch(difficultyAssist.keySentence))) {
        return prev;
      }
      return `${current} ${difficultyAssist.keySentence}`;
    });
  }, [difficultyAssist.keySentence, difficultyRefTiles.length, fieldTileSelected]);

  const appendFromCorpus = useCallback((userSentence: string) => {
    const tail = userSentence.trim();
    if (!tail) return;
    setFieldAssistError(null);
    setAnswer(prev => {
      const p = prev.trimEnd();
      if (!p) return tail;
      return `${p} ${tail}`;
    });
    setCorpusPanelOpen(false);
  }, []);

  const handleStuck = useCallback(async () => {
    if (!stuckInput.trim()) return;
    setStuckLoading(true);

    const corpusForSearch = store.corpus.map(e => ({
      userSentence: e.userSentence,
      collocation: e.collocation,
      verb: e.verb,
    }));

    const suggestion = await getStuckSuggestion(
      stuckInput,
      corpusForSearch,
      VERBS.map(v => ({ verb: v.verb, collocations: v.collocations.map(c => ({ phrase: c.phrase, meaning: c.meaning })) }))
    );

    setStuckSuggestion(suggestion);
    setStuckLoading(false);

    store.addStuckPoint({
      chineseThought: stuckInput,
      englishAttempt: '',
      aiSuggestion: suggestion.guidanceZh?.trim() || suggestion.suggestion,
      recommendedExpression: suggestion.recommendedExpression,
      sourceMode: 'field',
    });
  }, [stuckInput, store]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim()) return;
    if (difficultyAssistLevel === 3 && fieldTileDone) {
      const normalizedAnswer = normalizeForMatch(answer);
      const normalizedKeySentence = normalizeForMatch(difficultyAssist.keySentence);
      if (normalizedAnswer === normalizedKeySentence) {
        setFieldAssistError('先在关键句基础上再补一句你自己的展开，再提交评测。');
        answerInputRef.current?.focus();
        return;
      }
    }
    setFieldAssistError(null);
    setFieldState('evaluating');
    trackProductEvent({
      eventName: 'field_answer_submitted',
      surface: 'field',
      objectType: 'field_question',
      objectId: question.id,
      metadata: { part: question.part, assistLevel: difficultyAssistLevel },
    });

    try {
      const result = await aiEvaluateAnswer(question.question, answer, question.part);
      setEvaluation(result);
      trackProductEvent({
        eventName: 'field_answer_evaluated',
        surface: 'field',
        objectType: 'field_question',
        objectId: question.id,
        metadata: { part: question.part, score: result.score },
      });
      setFieldState('done');
    } catch (err) {
      console.error('AI evaluation failed, using local fallback:', err);
      const result = localEvaluateAnswer(answer);
      setEvaluation(result);
      trackProductEvent({
        eventName: 'field_answer_evaluated',
        surface: 'field',
        objectType: 'field_question',
        objectId: question.id,
        metadata: { part: question.part, score: result.score, fallback: true },
      });
      setFieldState('done');
    }
  }, [answer, difficultyAssist.keySentence, difficultyAssistLevel, fieldTileDone, question]);

  const insertSpeechIntoAnswer = useCallback((text: string) => {
    const spoken = text?.trim();
    if (!spoken) return;
    setFieldAssistError(null);
    const el = answerInputRef.current;
    const active = typeof document !== 'undefined' && el && document.activeElement === el;
    if (!active || !el) {
      setAnswer(prev => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + separator + spoken;
      });
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    setAnswer(prev => {
      const s = Math.max(0, Math.min(start, prev.length));
      const e = Math.max(s, Math.min(end, prev.length));
      const before = prev.slice(0, s);
      const after = prev.slice(e);
      const leftSpace = before && !/\s$/.test(before) ? ' ' : '';
      const rightSpace = after && !/^\s/.test(after) ? ' ' : '';
      const inserted = `${leftSpace}${spoken}${rightSpace}`;
      const next = `${before}${inserted}${after}`;
      const caret = before.length + inserted.length;
      window.requestAnimationFrame(() => {
        const node = answerInputRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(caret, caret);
      });
      return next;
    });
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (speech.isListening) {
      speech.stopListening();
    } else {
      setUsedVoiceThisRound(true);
      speech.startListening((text) => {
        if (text?.trim()) setUsedVoiceThisRound(true);
        insertSpeechIntoAnswer(text);
      }, 'en-US');
    }
  }, [speech, insertSpeechIntoAnswer]);

  const partColors: Record<number, string> = {
    1: 'bg-green-100 text-green-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-purple-100 text-purple-700',
  };

  const lowerDifficultyLabel =
    difficultyAssistLevel === 0
      ? '降低难度'
      : difficultyAssistLevel === 1 || difficultyAssistLevel === 2
      ? '再降一级'
      : '已降到最低';
  const selectedChunkCount = fieldTileSelected.length;
  const totalChunkCount = difficultyRefTiles.length;
  const remainingChunkCount = Math.max(0, totalChunkCount - selectedChunkCount);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex flex-row items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 pr-2">
              <Zap size={20} className="text-amber-600 shrink-0" />
              <h1 className="font-bold text-gray-800 text-base sm:text-lg">实战仓 · 雅思口语模拟</h1>
              <span className="text-xs text-gray-400 hidden sm:inline">· 支持语音录入与评分</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <FieldMobileCorpusButton
                corpus={store.corpus}
                isMobileOpen={corpusPanelOpen}
                onToggleMobile={() => setCorpusPanelOpen(v => !v)}
                onCloseMobile={() => setCorpusPanelOpen(false)}
                onAppendSentence={appendFromCorpus}
              />
              <button
                type="button"
                onClick={handleNewQuestion}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100 touch-manipulation"
              >
                <RefreshCw size={14} />
                换一题
              </button>
            </div>
          </div>

          <FieldAnswerPanel
            question={question}
            answer={answer}
            fieldState={fieldState}
            answerInputRef={answerInputRef}
            partColors={partColors}
            lowerDifficultyLabel={lowerDifficultyLabel}
            difficultyAssistLevel={difficultyAssistLevel}
            difficultyAssist={difficultyAssist}
            fieldTileDone={fieldTileDone}
            selectedChunkCount={selectedChunkCount}
            totalChunkCount={totalChunkCount}
            remainingChunkCount={remainingChunkCount}
            fieldTileSelected={fieldTileSelected}
            fieldTilePool={fieldTilePool}
            fieldTileError={fieldTileError}
            fieldAssistError={fieldAssistError}
            speech={speech}
            onAnswerChange={(value) => {
              setFieldAssistError(null);
              setAnswer(value);
            }}
            onSubmitAnswer={handleSubmitAnswer}
            onOpenStuck={() => setFieldState('stuck')}
            onLowerDifficulty={handleLowerDifficulty}
            onToggleRecording={handleToggleRecording}
            onResetAssist={handleResetDifficultyAssist}
            onBackToOutline={() => {
              setFieldAssistError(null);
              setDifficultyAssistLevel(1);
            }}
            onBackToStems={() => {
              setFieldAssistError(null);
              setDifficultyAssistLevel(2);
            }}
            onAppendStem={(stem) => {
              setFieldAssistError(null);
              setAnswer(prev => {
                const base = prev.trim();
                if (!base) return stem;
                return `${base} ${stem}`;
              });
              answerInputRef.current?.focus();
            }}
            onMoveTileToPool={handleMoveTileToPool}
            onMoveTileToAnswer={handleMoveTileToAnswer}
            onCheckTiles={handleCheckFieldTiles}
          />

          {fieldState === 'stuck' && (
            <FieldStuckPanel
              stuckInput={stuckInput}
              stuckLoading={stuckLoading}
              stuckSuggestion={stuckSuggestion}
              onInputChange={setStuckInput}
              onSubmit={handleStuck}
              onClose={() => {
                setFieldState('answering');
                setStuckSuggestion(null);
              }}
            />
          )}

          {fieldState === 'done' && evaluation && (
            <FieldEvaluationPanel
              evaluation={evaluation}
              answer={answer}
              usedVoiceThisRound={usedVoiceThisRound}
              onNewQuestion={handleNewQuestion}
            />
          )}
        </div>
      </div>

      <FieldCorpusSidebar corpus={store.corpus} onAppendSentence={appendFromCorpus} />
    </div>
  );
}
