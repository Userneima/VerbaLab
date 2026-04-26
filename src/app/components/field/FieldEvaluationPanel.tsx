import { CheckCircle2, RefreshCw } from 'lucide-react';
import type { FieldEvaluationResult } from './types';

type FieldEvaluationPanelProps = {
  evaluation: FieldEvaluationResult;
  answer: string;
  usedVoiceThisRound: boolean;
  onNewQuestion: () => void;
};

export function FieldEvaluationPanel({
  evaluation,
  answer,
  usedVoiceThisRound,
  onNewQuestion,
}: FieldEvaluationPanelProps) {
  return (
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

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">你的回答</div>
          <p className="text-gray-700 text-sm leading-relaxed">{answer}</p>
        </div>

        <button
          onClick={onNewQuestion}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <RefreshCw size={15} />
          下一道题
        </button>
      </div>
    </div>
  );
}
