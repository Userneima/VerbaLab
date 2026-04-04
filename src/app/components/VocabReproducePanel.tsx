import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { checkGrammar } from '../utils/grammarCheck';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import {
  buildClozeParts,
  verifyClozeBlank,
  sentenceContainsCollocation,
  isTooSimilarToReference,
} from '../utils/reviewGate';

type Props = {
  /** 卡片上的参考例句（防照抄对比） */
  referenceSentence: string;
  /** 本项要挖空/必须包含的搭配 */
  targetCollocation: string;
  /** 中文提示（如题目翻译） */
  cueZh?: string;
  onComplete: () => void;
  /** 外部传入：本条已完成 */
  alreadyPassed: boolean;
};

export function VocabReproducePanel({
  referenceSentence,
  targetCollocation,
  cueZh,
  onComplete,
  alreadyPassed,
}: Props) {
  const { startListening, stopListening, isListening, interimText, error: speechErr, status: speechStatus } =
    useSpeechRecognition();
  const [clozePassed, setClozePassed] = useState(false);
  const [clozeInput, setClozeInput] = useState('');
  const [produceInput, setProduceInput] = useState('');
  const produceInputRef = useRef<HTMLTextAreaElement>(null);
  const [clozeError, setClozeError] = useState<string | null>(null);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [failStreak, setFailStreak] = useState(0);
  const [done, setDone] = useState(false);
  const [usedForgotOption, setUsedForgotOption] = useState(false);
  const [showCollocationRuleTip, setShowCollocationRuleTip] = useState(false);

  const sessionKey = `${referenceSentence}\0${targetCollocation}`;

  useEffect(() => {
    if (alreadyPassed) return;
    setClozePassed(false);
    setClozeInput('');
    setProduceInput('');
    setClozeError(null);
    setProduceError(null);
    setAiHints([]);
    setShowOriginal(false);
    setFailStreak(0);
    setDone(false);
    setUsedForgotOption(false);
    setShowCollocationRuleTip(false);
    return () => stopListening();
  }, [sessionKey, alreadyPassed, stopListening]);

  const clozeParts = buildClozeParts(referenceSentence, targetCollocation);

  const submitCloze = () => {
    setClozeError(null);
    if (!verifyClozeBlank(clozeInput, targetCollocation)) {
      setClozeError(
        clozeParts
          ? '请准确填写句中挖空处的搭配。'
          : `请键入目标搭配：${targetCollocation}`
      );
      return;
    }
    setClozePassed(true);
  };

  const revealAndContinue = () => {
    setClozeError(null);
    setClozeInput(targetCollocation);
    setUsedForgotOption(true);
    setClozePassed(true);
  };

  const appendSpeechToProduce = (text: string) => {
    const spoken = text?.trim();
    if (!spoken) return;
    const el = produceInputRef.current;
    const active = typeof document !== 'undefined' && el && document.activeElement === el;
    if (!active || !el) {
      setProduceInput(prev => (prev ? `${prev.trim()} ${spoken}` : spoken));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    setProduceInput(prev => {
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
        const node = produceInputRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(caret, caret);
      });
      return next;
    });
  };

  const toggleSpeech = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening(appendSpeechToProduce, 'en-US');
  };

  const submitProduce = async () => {
    setProduceError(null);
    setAiHints([]);
    const t = produceInput.trim();
    if (!t) {
      setProduceError('请先写一句完整英文。');
      return;
    }
    if (isTooSimilarToReference(t, referenceSentence, 0.88)) {
      setProduceError('与卡片例句过于相似，请换种说法（须保留目标搭配）。');
      setFailStreak(fs => fs + 1);
      return;
    }
    if (!sentenceContainsCollocation(t, targetCollocation)) {
      setProduceError(`句中须包含：${targetCollocation}`);
      setFailStreak(fs => fs + 1);
      return;
    }
    setChecking(true);
    try {
      const result = await checkGrammar(t, targetCollocation);
      if (!result.isCorrect) {
        setAiHints(result.errors.map(e => e.hint || e.description));
        setFailStreak(fs => fs + 1);
        return;
      }
      setDone(true);
      onComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '网络错误，请稍后重试';
      setProduceError(msg);
    } finally {
      setChecking(false);
    }
  };

  if (alreadyPassed || done) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        <CheckCircle2 size={16} className="shrink-0" />
        本条再产出已完成，可标记复习结果。
      </div>
    );
  }

  const hintZh =
    cueZh?.trim() ||
    '结合题目，用目标搭配写一句新的英文（勿照搬卡片例句）。';

  return (
    <div className="space-y-3 border border-violet-200 rounded-xl p-3 bg-violet-50/40">
      <p className="text-[11px] text-violet-900 font-medium leading-relaxed">
        到期复习：先填空再造句，通过后即可点下方「已浏览 / 记住了 / 还不太熟」。
      </p>

      {!clozePassed ? (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-gray-600">第 1 步 · 填空</div>
          {clozeParts ? (
            <div className="text-sm text-gray-800 leading-relaxed break-words">
              <span className="whitespace-pre-wrap">{clozeParts.before}</span>
              <input
                type="text"
                value={clozeInput}
                onChange={e => setClozeInput(e.target.value)}
                placeholder="____"
                className="inline-block align-baseline mx-1 my-1 min-w-[6rem] max-w-[min(100%,12rem)] border-b-2 border-violet-400 focus:outline-none focus:border-violet-600 bg-white px-1 py-0.5 rounded-t text-sm"
                autoComplete="off"
              />
              <span className="whitespace-pre-wrap">{clozeParts.after}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-600">请直接输入目标搭配：</p>
              <input
                type="text"
                value={clozeInput}
                onChange={e => setClozeInput(e.target.value)}
                placeholder={targetCollocation}
                className="w-full border border-violet-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                autoComplete="off"
              />
            </div>
          )}
          {clozeError && <p className="text-[11px] text-red-600">{clozeError}</p>}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={submitCloze}
              className="px-2.5 py-1 bg-violet-600 text-white rounded-lg text-[11px] font-medium hover:bg-violet-700"
            >
              检查填空
            </button>
            <button
              type="button"
              onClick={revealAndContinue}
              className="px-2.5 py-1 border border-amber-200 text-amber-700 bg-amber-50 rounded-lg text-[11px] font-medium hover:bg-amber-100"
            >
              我忘记了（显示答案）
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-600">
            <span>第 2 步 · 造句（须含「{targetCollocation}」）</span>
            <button
              type="button"
              onClick={() => setShowCollocationRuleTip(v => !v)}
              className="inline-flex items-center text-violet-600 hover:text-violet-700"
              aria-label="为什么必须包含这个搭配"
              title="为什么必须包含这个搭配"
            >
              <HelpCircle size={11} />
            </button>
          </div>
          {showCollocationRuleTip && (
            <p className="text-[11px] text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5 leading-relaxed">
              这是本卡绑定的目标搭配。复习时强制保留它，是为了确认你在同一语言块上完成再产出，而不是换同义表达绕过训练。
            </p>
          )}
          {usedForgotOption && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
              已显示目标搭配：{targetCollocation}。请继续完成造句巩固记忆。
            </p>
          )}
          <p className="text-[11px] text-gray-700 bg-white rounded-lg p-2 border border-violet-100 leading-relaxed">{hintZh}</p>
          <textarea
            ref={produceInputRef}
            value={produceInput}
            onChange={e => setProduceInput(e.target.value)}
            placeholder="Write a new English sentence…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400 bg-white"
          />
          {(interimText || speechErr) && (
            <p className="text-[11px] text-indigo-600">{interimText || speechErr}</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={toggleSpeech}
              disabled={speechStatus === 'connecting' || speechStatus === 'unavailable'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                isListening
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={12} /> 停止
                </>
              ) : (
                <>
                  <Mic size={12} /> 语音
                </>
              )}
            </button>
            <button
              type="button"
              onClick={submitProduce}
              disabled={checking}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {checking ? <Loader2 size={12} className="animate-spin" /> : null}
              提交批改
            </button>
          </div>
          {produceError && <p className="text-[11px] text-red-600">{produceError}</p>}
          {aiHints.length > 0 && (
            <ul className="text-[11px] text-red-700 list-disc pl-4 space-y-0.5">
              {aiHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
          {failStreak >= 2 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowOriginal(o => !o)}
                className="text-[11px] text-violet-600 hover:text-violet-800"
              >
                {showOriginal ? '隐藏' : '查看'}卡片例句参考
              </button>
              {showOriginal && (
                <p className="text-[11px] text-gray-600 bg-white border border-gray-100 rounded p-2">{referenceSentence}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
