import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';
import { aiGrammarCheck } from '../utils/api';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import type { ErrorBankEntry } from '../store/useStore';
import { useStore } from '../store/StoreContext';
import {
  readErrorReviewProduceDraft,
  writeErrorReviewProduceDraft,
} from '../utils/errorReviewDraftStorage';
import {
  buildClozeParts,
  verifyClozeBlank,
  sentenceContainsCollocation,
  isTooSimilarToReference,
} from '../utils/reviewGate';

function isEntryDue(entry: ErrorBankEntry): boolean {
  return !!(entry.nextReviewAt && entry.nextReviewAt <= new Date().toISOString());
}

type Props = {
  entry: ErrorBankEntry;
  onSchedulePass: () => void;
  onResetDefer: () => void;
  onRecordAttempt: () => void;
};

export function ErrorReviewReproducePanel({
  entry,
  onSchedulePass,
  onResetDefer,
  onRecordAttempt,
}: Props) {
  const store = useStore();
  const { startListening, stopListening, isListening, interimText, error: speechErr, status: speechStatus } =
    useSpeechRecognition();
  const [clozePassed, setClozePassed] = useState(() => !!entry.reviewReproClozeDone);
  const [clozeInput, setClozeInput] = useState('');
  const [produceInput, setProduceInput] = useState(() => readErrorReviewProduceDraft(entry.id));
  const skipNextDraftWrite = useRef(false);
  const produceInputRef = useRef<HTMLTextAreaElement>(null);
  const [clozeError, setClozeError] = useState<string | null>(null);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [failStreak, setFailStreak] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    skipNextDraftWrite.current = true;
    setClozePassed(!!entry.reviewReproClozeDone);
    setClozeInput('');
    setProduceInput(readErrorReviewProduceDraft(entry.id));
    setClozeError(null);
    setProduceError(null);
    setAiHints([]);
    setShowOriginal(false);
    setFailStreak(0);
    setDone(false);
    return () => stopListening();
  }, [entry.id, entry.reviewReproClozeDone, stopListening]);

  useEffect(() => {
    if (!clozePassed) return;
    if (skipNextDraftWrite.current) {
      skipNextDraftWrite.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      writeErrorReviewProduceDraft(entry.id, produceInput);
    }, 400);
    return () => window.clearTimeout(t);
  }, [produceInput, clozePassed, entry.id]);

  const clozeParts = buildClozeParts(entry.originalSentence, entry.collocation);

  const submitCloze = () => {
    setClozeError(null);
    if (!verifyClozeBlank(clozeInput, entry.collocation)) {
      setClozeError(
        clozeParts
          ? '请准确填写句中挖空处的搭配（可与原句大小写不同）。'
          : `请键入目标搭配：${entry.collocation}`
      );
      return;
    }
    setClozePassed(true);
    store.setErrorReviewReproClozeDone(entry.id, true);
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
    if (isTooSimilarToReference(t, entry.originalSentence, 0.88)) {
      setProduceError('与原错句过于相似，请换种说法重新造句（须保留目标搭配）。');
      onRecordAttempt();
      setFailStreak(fs => fs + 1);
      return;
    }
    if (!sentenceContainsCollocation(t, entry.collocation)) {
      setProduceError(`句中须包含目标搭配：${entry.collocation}`);
      onRecordAttempt();
      setFailStreak(fs => fs + 1);
      return;
    }
    setChecking(true);
    try {
      const result = await aiGrammarCheck(t, entry.collocation);
      if (!result.isCorrect) {
        setAiHints(result.errors.map(e => e.hint || e.description));
        onRecordAttempt();
        setFailStreak(fs => fs + 1);
        return;
      }
      store.addToCorpus({
        verbId: entry.verbId,
        verb: entry.verb,
        collocationId: entry.collocationId,
        collocation: entry.collocation,
        userSentence: t,
        isCorrect: true,
        mode: 'field',
        tags: [
          entry.verb.toLowerCase(),
          entry.collocation.toLowerCase(),
          'error-review',
        ],
      });
      setDone(true);
      onSchedulePass();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '网络错误，请稍后重试';
      setProduceError(msg);
      onRecordAttempt();
    } finally {
      setChecking(false);
    }
  };

  const cueZh =
    entry.reviewCueZh?.trim() ||
    entry.hint?.trim() ||
    entry.diagnosis?.split('\n')[0]?.trim() ||
    '结合语境，用目标搭配写一句新的英文（勿照搬原错句）。';

  if (!isEntryDue(entry)) {
    return (
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        下次重测：{entry.nextReviewAt ? new Date(entry.nextReviewAt).toLocaleString('zh-CN') : '未设置'}
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        <CheckCircle2 size={18} className="shrink-0" />
        <span>
          已通过再产出，复习间隔已推进；该句已加入语料库（来源：错题重测）。
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-amber-200 rounded-xl p-4 bg-amber-50/50">
      <p className="text-xs text-amber-900 font-medium leading-relaxed">
        再产出过关后自动「重测通过」：先填空提取搭配，再造新句并通过语法检查。
        {clozePassed && (
          <span className="block mt-1 text-amber-800/90 font-normal">
            进度已保存：离开页面后仍可从第 2 步继续；造句草稿仅保存在本机浏览器。
          </span>
        )}
      </p>

      {!clozePassed ? (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-600">第 1 步 · 填空</div>
          {clozeParts ? (
            <div className="text-sm text-gray-800 leading-relaxed break-words">
              <span className="whitespace-pre-wrap">{clozeParts.before}</span>
              <input
                type="text"
                value={clozeInput}
                onChange={e => setClozeInput(e.target.value)}
                placeholder="____"
                className="inline-block align-baseline mx-1 my-1 min-w-[7rem] max-w-[min(100%,14rem)] border-b-2 border-amber-400 focus:outline-none focus:border-amber-600 bg-white px-1 py-0.5 rounded-t"
                autoComplete="off"
              />
              <span className="whitespace-pre-wrap">{clozeParts.after}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">原句中未能自动定位搭配，请直接输入目标搭配（英文）：</p>
              <input
                type="text"
                value={clozeInput}
                onChange={e => setClozeInput(e.target.value)}
                placeholder={entry.collocation}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
                autoComplete="off"
              />
            </div>
          )}
          {clozeError && <p className="text-xs text-red-600">{clozeError}</p>}
          <button
            type="button"
            onClick={submitCloze}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
          >
            检查填空
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-600">第 2 步 · 造句（须含「{entry.collocation}」）</div>
          <p className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-amber-100 leading-relaxed">{cueZh}</p>
          <textarea
            ref={produceInputRef}
            value={produceInput}
            onChange={e => setProduceInput(e.target.value)}
            placeholder="Write a new English sentence here…"
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 bg-white font-sans"
          />
          {(interimText || speechErr) && (
            <p className="text-xs text-indigo-600">{interimText || speechErr}</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={toggleSpeech}
              disabled={speechStatus === 'connecting' || speechStatus === 'unavailable'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                isListening
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={14} /> 停止语音
                </>
              ) : (
                <>
                  <Mic size={14} /> 语音输入
                </>
              )}
            </button>
            <button
              type="button"
              onClick={submitProduce}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {checking ? <Loader2 size={14} className="animate-spin" /> : null}
              提交批改
            </button>
            <button
              type="button"
              onClick={onResetDefer}
              className="text-xs text-amber-800 underline-offset-2 hover:underline"
            >
              仍不熟 · 推迟 24h 再测
            </button>
          </div>
          {produceError && <p className="text-xs text-red-600">{produceError}</p>}
          {aiHints.length > 0 && (
            <ul className="text-xs text-red-700 list-disc pl-5 space-y-1">
              {aiHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
          {failStreak >= 2 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowOriginal(o => !o)}
                className="text-xs text-violet-600 hover:text-violet-800"
              >
                {showOriginal ? '隐藏' : '查看'}原错句（参考后请仍自己造句）
              </button>
              {showOriginal && (
                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded p-2">{entry.originalSentence}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { isEntryDue };
