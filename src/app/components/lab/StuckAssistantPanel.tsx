import { ChevronRight, HelpCircle, Loader2, X } from 'lucide-react';

export function StuckAssistantPanel(props: {
  phrase: string;
  stuckInput: string;
  stuckLoading: boolean;
  suggestion: { suggestion: string; type: 'corpus' | 'verb' | 'paraphrase' } | null;
  onClose: () => void;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onClearSuggestion: () => void;
}) {
  const { phrase, stuckInput, stuckLoading, suggestion, onClose, onInputChange, onSubmit, onClearSuggestion } = props;
  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-violet-600" />
          <h3 className="font-semibold text-gray-800">卡壳智能助手</h3>
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100" aria-label="关闭">
          <X size={18} />
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-1">用中文说说你想表达的意思？AI 会结合你的语料库与万能动词搭配库给平替说法。</p>
      <p className="text-violet-600/90 text-xs mb-4">本题搭配：<span className="font-medium">{phrase}</span></p>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={stuckInput}
          onChange={e => onInputChange(e.target.value)}
          placeholder="例如：我想说「进退两难」「顺便提一下」..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
        />
        <button type="button" onClick={onSubmit} disabled={!stuckInput.trim() || stuckLoading} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0">
          {stuckLoading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />} 求助
        </button>
      </div>
      {suggestion && (
        <div className={`rounded-xl p-4 ${suggestion.type === 'corpus' ? 'bg-emerald-50 border border-emerald-200' : suggestion.type === 'verb' ? 'bg-indigo-50 border border-indigo-200' : 'bg-amber-50 border border-amber-200'}`}>
          <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{suggestion.suggestion}</p>
          <button type="button" onClick={onClearSuggestion} className="mt-3 text-sm font-medium text-violet-600 hover:underline">继续编辑英文句子 →</button>
        </div>
      )}
    </div>
  );
}

