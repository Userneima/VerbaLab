import { ChevronRight, HelpCircle, Loader2, X } from 'lucide-react';

type StuckSuggestion = {
  suggestion: string;
  type: 'corpus' | 'verb' | 'paraphrase';
};

type FieldStuckPanelProps = {
  stuckInput: string;
  stuckLoading: boolean;
  stuckSuggestion: StuckSuggestion | null;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function FieldStuckPanel({
  stuckInput,
  stuckLoading,
  stuckSuggestion,
  onInputChange,
  onSubmit,
  onClose,
}: FieldStuckPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-red-500" />
          <h3 className="font-semibold text-gray-800">卡壳智能助手</h3>
        </div>
        <button
          onClick={onClose}
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
          onChange={e => onInputChange(e.target.value)}
          placeholder="例如：我想说「坚持不懈」「进退两难」..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400"
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
        />
        <button
          onClick={onSubmit}
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
            onClick={onClose}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            明白了，继续作答 →
          </button>
        </div>
      )}
    </div>
  );
}
