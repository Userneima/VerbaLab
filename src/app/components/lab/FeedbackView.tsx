import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import type { GrammarError } from '../../utils/grammarCheck';
import { TutorPanel } from './TutorPanel';

export function FeedbackView(props: {
  testState: 'idle' | 'checking' | 'correct' | 'incorrect';
  userInput: string;
  showExamples: boolean;
  onToggleExamples: () => void;
  onLoadNew: () => void;
  onOpenStuck: () => void;
  nativeSuggestion: { sentence: string; thinking?: string; savedToCorpus: boolean } | null;
  onSaveNative: () => void;
  errors: GrammarError[];
  overallHint: string;
  expandedError: number | null;
  onToggleError: (i: number) => void;
  tutor: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    input: string;
    loading: boolean;
    error: string | null;
    onInputChange: (v: string) => void;
    onSend: () => void;
  };
}) {
  const { testState, userInput, showExamples, onToggleExamples, onLoadNew, onOpenStuck, nativeSuggestion, onSaveNative, errors, overallHint, expandedError, onToggleError, tutor } = props;
  if (testState === 'correct') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <span className="text-emerald-800 font-semibold">语法正确！已存入个人语料库 ✨</span>
        </div>
        <div className="bg-white border border-emerald-100 rounded-xl p-4 mb-4">
          <p className="text-gray-700 text-sm">"{userInput}"</p>
        </div>
        {nativeSuggestion && (nativeSuggestion.sentence || nativeSuggestion.thinking) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
              <AlertTriangle size={16} className="text-amber-600" />
              更地道表达建议（非错误）
            </div>
            {nativeSuggestion.sentence && <p className="text-sm text-amber-900">母语者常说：{nativeSuggestion.sentence}</p>}
            {nativeSuggestion.thinking && <p className="text-xs text-amber-800/90 leading-relaxed">思路：{nativeSuggestion.thinking}</p>}
            {nativeSuggestion.sentence && (
              <button
                type="button"
                onClick={onSaveNative}
                disabled={nativeSuggestion.savedToCorpus}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-300 text-amber-800 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {nativeSuggestion.savedToCorpus ? '已收录母语者表述' : '也收录母语者表述'}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={onLoadNew} className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            <ArrowRight size={15} /> 下一题
          </button>
          <button onClick={onToggleExamples} className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl text-sm hover:bg-emerald-100 transition-colors">
            <BookOpen size={15} />{showExamples ? '隐藏' : '查看'}参考例句
          </button>
          <button type="button" onClick={onOpenStuck} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
            <AlertTriangle size={15} /> 卡壳了！
          </button>
        </div>
      </div>
    );
  }

  if (testState === 'incorrect' && (errors.length > 0 || overallHint)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <XCircle size={20} className="text-red-500" />
          <span className="text-red-800 font-semibold">{errors.length > 0 ? `发现 ${errors.length} 个语法问题` : '需要调整表达'}</span>
        </div>
        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((err, i) => (
              <div key={i} className="bg-white border border-red-100 rounded-xl overflow-hidden">
                <button className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-red-50 transition-colors" onClick={() => onToggleError(i)}>
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5"><span className="text-red-600 text-xs font-bold">{i + 1}</span></div>
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{err.description}</p>
                      <p className="text-gray-500 text-xs mt-0.5">语法点：{err.grammarPoint}</p>
                    </div>
                  </div>
                  {expandedError === i ? <ChevronUp size={16} className="text-gray-400 mt-0.5 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                </button>
                {expandedError === i && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-amber-800 text-sm">{err.hint}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {overallHint && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-amber-800 text-sm">{overallHint}</p></div>}
        <div className="pt-1">
          <p className="text-red-700 text-sm font-medium mb-2">❌ 严禁直接给你答案——请根据提示自己修改！</p>
          <p className="text-gray-500 text-xs">修改句子后重新提交，正确后将存入你的语料库</p>
        </div>
        <TutorPanel
          messages={tutor.messages}
          loading={tutor.loading}
          error={tutor.error}
          input={tutor.input}
          onInputChange={tutor.onInputChange}
          onSend={tutor.onSend}
        />
      </div>
    );
  }

  return null;
}

