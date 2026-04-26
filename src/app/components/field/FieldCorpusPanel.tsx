import { MessageSquare, X } from 'lucide-react';

type CorpusEntryPreview = {
  id: string;
  collocation: string;
  userSentence: string;
};

type FieldCorpusPanelProps = {
  corpus: CorpusEntryPreview[];
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
  onAppendSentence: (sentence: string) => void;
};

function CorpusList({
  corpus,
  onAppendSentence,
}: {
  corpus: CorpusEntryPreview[];
  onAppendSentence: (sentence: string) => void;
}) {
  if (corpus.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-xs">
        <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
        <p>语料库为空</p>
        <p className="mt-1">先去实验室造句！</p>
      </div>
    );
  }

  return (
    <>
      {corpus.slice(0, 15).map(entry => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onAppendSentence(entry.userSentence)}
          className="w-full text-left border border-gray-100 rounded-lg p-2.5 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
            {entry.collocation}
          </span>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-3">{entry.userSentence}</p>
        </button>
      ))}
    </>
  );
}

export function FieldMobileCorpusButton({
  corpus,
  isMobileOpen,
  onToggleMobile,
  onCloseMobile,
  onAppendSentence,
}: FieldCorpusPanelProps) {
  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={onToggleMobile}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors touch-manipulation ${
          isMobileOpen
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
        aria-expanded={isMobileOpen}
        aria-haspopup="dialog"
      >
        <MessageSquare size={14} />
        语料
      </button>
      {isMobileOpen && (
        <>
          <button
            type="button"
            aria-label="关闭语料面板"
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={onCloseMobile}
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
                onClick={onCloseMobile}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200/80"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              <CorpusList corpus={corpus} onAppendSentence={onAppendSentence} />
            </div>
            <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center shrink-0">
              <div className="text-xs text-gray-500">{corpus.length} 个语料库句子可用</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FieldCorpusSidebar({ corpus, onAppendSentence }: Pick<FieldCorpusPanelProps, 'corpus' | 'onAppendSentence'>) {
  return (
    <div className="hidden lg:flex w-64 shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden min-h-0">
      <div className="p-4 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-gray-700 text-sm">可用语料</h3>
        <p className="text-xs text-gray-400 mt-0.5">点击句子追加到回答</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        <CorpusList corpus={corpus} onAppendSentence={onAppendSentence} />
      </div>
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-center shrink-0">
        <div className="text-xs text-gray-500">{corpus.length} 个语料库句子可用</div>
      </div>
    </div>
  );
}
