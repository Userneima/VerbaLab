import { useState, useCallback, useEffect, useRef } from 'react';
import { Zap, AlertTriangle, Send, RefreshCw, Loader2, HelpCircle, X, ChevronRight, CheckCircle2, MessageSquare, Mic, MicOff } from 'lucide-react';
import { IELTS_QUESTIONS } from '../data/verbData';
import { getStuckSuggestion } from '../utils/grammarCheck';
import { VERBS } from '../data/verbData';
import { useStore } from '../store/StoreContext';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { aiEvaluateAnswer } from '../utils/api';

type FieldState = 'answering' | 'stuck' | 'evaluating' | 'done';

function getRandomQuestion() {
  return IELTS_QUESTIONS[Math.floor(Math.random() * IELTS_QUESTIONS.length)];
}

interface EvaluationResult {
  score: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  feedback: string[];
  verbsUsed: string[];
}

// Local fallback evaluation
function localEvaluateAnswer(answer: string): EvaluationResult {
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
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [usedVoiceThisRound, setUsedVoiceThisRound] = useState(false);
  const [corpusPanelOpen, setCorpusPanelOpen] = useState(false);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  // Azure Speech recognition
  const speech = useSpeechRecognition();

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
    if (speech.isListening) speech.stopListening();
  }, [speech]);

  const appendFromCorpus = useCallback((userSentence: string) => {
    const tail = userSentence.trim();
    if (!tail) return;
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

    // Save stuck point
    store.addStuckPoint({
      chineseThought: stuckInput,
      englishAttempt: '',
      aiSuggestion: suggestion.suggestion,
    });
  }, [stuckInput, store]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!answer.trim()) return;
    setFieldState('evaluating');

    try {
      const result = await aiEvaluateAnswer(question.question, answer, question.part);
      setEvaluation(result);
      setFieldState('done');
    } catch (err) {
      console.error('AI evaluation failed, using local fallback:', err);
      const result = localEvaluateAnswer(answer);
      setEvaluation(result);
      setFieldState('done');
    }
  }, [answer, question]);

  const insertSpeechIntoAnswer = useCallback((text: string) => {
    const spoken = text?.trim();
    if (!spoken) return;
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

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-row items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 pr-2">
              <Zap size={20} className="text-amber-600 shrink-0" />
              <h1 className="font-bold text-gray-800 text-base sm:text-lg">实战仓 · 雅思口语模拟</h1>
              <span className="text-xs text-gray-400 hidden sm:inline">· 支持语音录入与评分</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative lg:hidden">
                <button
                  type="button"
                  onClick={() => setCorpusPanelOpen(v => !v)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors touch-manipulation ${
                    corpusPanelOpen
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-expanded={corpusPanelOpen}
                  aria-haspopup="dialog"
                >
                  <MessageSquare size={14} />
                  语料
                </button>
                {corpusPanelOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="关闭语料面板"
                      className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                      onClick={() => setCorpusPanelOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(calc(100vw-2rem),20rem)] max-h-[min(70vh,22rem)] flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden lg:hidden"
                      role="dialog"
                      aria-label="可用语料"
                    >
                      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
                        <div>
                          <span className="text-xs font-semibold text-gray-700">可用语料</span>
                          <p className="text-[11px] text-gray-400 mt-0.5">点击句子追加到回答</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCorpusPanelOpen(false)}
                          className="p-1 rounded-md text-gray-500 hover:bg-gray-200/80"
                          aria-label="关闭"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                        {store.corpus.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                            <p>语料库为空</p>
                            <p className="mt-1">先去实验室造句！</p>
                          </div>
                        ) : (
                          store.corpus.slice(0, 15).map(entry => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => appendFromCorpus(entry.userSentence)}
                              className="w-full text-left border border-gray-100 rounded-lg p-2.5 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            >
                              <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                {entry.collocation}
                              </span>
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-3">{entry.userSentence}</p>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center shrink-0">
                        <div className="text-xs text-gray-500">{store.corpus.length} 个语料库句子可用</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
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

          {/* IELTS Question Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${partColors[question.part]} bg-white/20 text-white`}>
                  Part {question.part}
                </span>
                <span className="text-amber-100 text-sm">{question.topic}</span>
              </div>
              <p className="text-white text-base font-medium leading-relaxed">{question.question}</p>
            </div>

            <div className="p-5">
              {/* 语音录入说明 */}
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
                  <Mic size={16} />
                  语音录入
                </div>
                <p className="text-amber-700/90 text-xs leading-relaxed">
                  点击下方「语音」开始说话，识别到的英文会实时追加到输入框；说完再点「停止」。可边说边改，最后提交进行流利度、语法、词汇评分。
                </p>
              </div>
              {/* Answer area */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-600">你的回答</label>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{answer.split(/\s+/).filter(Boolean).length} 词</span>
                    <span>·</span>
                    <span>目标: 50-150 词</span>
                  </div>
                </div>
                <textarea
                  ref={answerInputRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer here in English... Be natural and use core verbs like make, get, take, keep..."
                  rows={5}
                  disabled={fieldState === 'done' || fieldState === 'evaluating'}
                  className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors ${
                    fieldState === 'done' ? 'bg-gray-50 border-gray-200' : 'border-gray-200 focus:border-amber-400'
                  }`}
                />
              </div>

              {/* Action buttons */}
              {fieldState === 'answering' && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <Send size={15} />
                    提交评测
                  </button>
                  <button
                    onClick={() => setFieldState('stuck')}
                    className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <AlertTriangle size={15} />
                    卡壳了！
                  </button>
                  <button
                    onClick={handleToggleRecording}
                    disabled={speech.status === 'connecting' || speech.status === 'processing' || speech.status === 'unavailable'}
                    title={speech.micAvailable === false ? '麦克风不可用，请在新标签页中打开或检查浏览器权限' : undefined}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                      speech.status === 'unavailable'
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                        : speech.isListening
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : speech.status === 'connecting'
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                        : speech.status === 'error'
                        ? 'border-red-300 text-red-500'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {speech.status === 'unavailable' ? (
                      <><MicOff size={15} /> 麦克风不可用</>
                    ) : speech.status === 'connecting' ? (
                      <><Loader2 size={15} className="animate-spin" /> 连接中</>
                    ) : speech.isListening ? (
                      <><MicOff size={15} /> <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span> 停止</>
                    ) : (
                      <><Mic size={15} /> 语音</>
                    )}
                  </button>
                </div>
              )}

              {/* Speech status / interim text */}
              {speech.isListening && speech.interimText && (
                <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-700">
                  <span className="text-indigo-400 text-xs mr-2">正在识别:</span>
                  {speech.interimText}
                </div>
              )}

              {speech.micAvailable === false && !speech.error && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
                  🎤 麦克风不可用：当前环境不允许访问麦克风。你可以直接用键盘输入答案，或在新标签页中打开应用以使用语音功能。
                </div>
              )}

              {speech.error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
                  {speech.error}
                </div>
              )}

              {fieldState === 'evaluating' && (
                <div className="flex items-center justify-center gap-3 py-4 text-amber-600">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">AI 正在评测你的回答...</span>
                </div>
              )}
            </div>
          </div>

          {/* Stuck Helper Panel */}
          {fieldState === 'stuck' && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-red-500" />
                  <h3 className="font-semibold text-gray-800">卡壳智能助手</h3>
                </div>
                <button
                  onClick={() => { setFieldState('answering'); setStuckSuggestion(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                说说你想表达什么中文意思？AI 会从你的语料库或万能动词库帮你找到平替表达
              </p>
              <div className="flex gap-3 mb-4">
                <input
                  value={stuckInput}
                  onChange={e => setStuckInput(e.target.value)}
                  placeholder="例如：我想说「坚持不懈」「进退两难」..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
                  onKeyDown={e => e.key === 'Enter' && handleStuck()}
                />
                <button
                  onClick={handleStuck}
                  disabled={!stuckInput.trim() || stuckLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {stuckLoading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                  求助
                </button>
              </div>

              {stuckSuggestion && (
                <div className={`rounded-xl p-4 ${
                  stuckSuggestion.type === 'corpus' ? 'bg-emerald-50 border border-emerald-200' :
                  stuckSuggestion.type === 'verb' ? 'bg-indigo-50 border border-indigo-200' :
                  'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {stuckSuggestion.type === 'corpus' && <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">来自语料库</span>}
                    {stuckSuggestion.type === 'verb' && <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded">万能动词平替</span>}
                    {stuckSuggestion.type === 'paraphrase' && <span className="text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">换一种说法</span>}
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                    {stuckSuggestion.suggestion}
                  </p>
                  <button
                    onClick={() => setFieldState('answering')}
                    className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    明白了，继续作答 →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Evaluation Result */}
          {fieldState === 'done' && evaluation && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-5 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-300 text-xs uppercase tracking-wide">综合评分</span>
                      {usedVoiceThisRound && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200">
                          含语音录入
                        </span>
                      )}
                    </div>
                    <div className="text-4xl font-bold">{evaluation.score}</div>
                    <div className="text-slate-400 text-sm">/ 100</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center w-full sm:w-auto">
                    {[
                      { label: '流利度', value: evaluation.fluency, hint: '表达连贯、语速与停顿' },
                      { label: '语法', value: evaluation.grammar, hint: '时态与句式正确性' },
                      { label: '词汇', value: evaluation.vocabulary, hint: '用词与搭配' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="text-xl font-bold text-white">{m.value}</div>
                        <div className="text-slate-400 text-xs">{m.label}</div>
                        <div className="mt-1 w-full bg-slate-600 rounded-full h-1">
                          <div
                            className="bg-amber-400 h-1 rounded-full"
                            style={{ width: `${m.value}%` }}
                          />
                        </div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{m.hint}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs mt-1 sm:mt-0 w-full basis-full order-last">
                    以上由 AI 根据你的回答综合评定；若使用语音录入，流利度会结合口语表现。
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Verbs used */}
                {evaluation.verbsUsed.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">使用的万能动词</div>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.verbsUsed.map(v => (
                        <span key={v} className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI 点评</div>
                  <div className="space-y-1.5">
                    {evaluation.feedback.map((fb, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-gray-600 text-sm">{fb}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your answer reference */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">你的回答</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{answer}</p>
                </div>

                <button
                  onClick={handleNewQuestion}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  <RefreshCw size={15} />
                  下一道题
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Corpus sidebar — 仅大屏；小屏用语料按钮浮层，避免占用 flex 高度遮挡回答区 */}
      <div className="hidden lg:flex w-64 shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden min-h-0">
        <div className="p-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-700 text-sm">可用语料</h3>
          <p className="text-xs text-gray-400 mt-0.5">点击句子追加到回答</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {store.corpus.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              <p>语料库为空</p>
              <p className="mt-1">先去实验室造句！</p>
            </div>
          ) : (
            store.corpus.slice(0, 15).map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => appendFromCorpus(entry.userSentence)}
                className="w-full text-left border border-gray-100 rounded-lg p-2.5 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                  {entry.collocation}
                </span>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-3">{entry.userSentence}</p>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 text-center shrink-0">
          <div className="text-xs text-gray-500">{store.corpus.length} 个语料库句子可用</div>
        </div>
      </div>
    </div>
  );
}