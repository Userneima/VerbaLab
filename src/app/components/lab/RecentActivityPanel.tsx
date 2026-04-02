import { AlertTriangle, CheckCircle2, FlaskConical } from 'lucide-react';

export function RecentActivityPanel(props: {
  corpus: Array<{ id: string; collocation: string; userSentence: string }>;
  errorBank: Array<{ id: string; collocation: string; originalSentence: string }>;
  stats: { corpusSize: number; errorCount: number };
  onOpenCorpus: (id: string) => void;
  onOpenError: (id: string) => void;
}) {
  const { corpus, errorBank, stats, onOpenCorpus, onOpenError } = props;
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 lg:min-h-0">
        {corpus.slice(0, 10).map(entry => (
          <button key={entry.id} type="button" onClick={() => onOpenCorpus(entry.id)} className="w-full text-left border border-gray-100 rounded-lg p-2.5 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="text-xs text-indigo-600 font-medium truncate">{entry.collocation}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{entry.userSentence}</p>
          </button>
        ))}
        {errorBank.slice(0, 5).map(entry => (
          <button key={entry.id} type="button" onClick={() => onOpenError(entry.id)} className="w-full text-left border border-red-100 rounded-lg p-2.5 bg-red-50 hover:border-red-200 hover:bg-red-50/90 transition-colors">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={12} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-600 font-medium truncate">{entry.collocation}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{entry.originalSentence}</p>
          </button>
        ))}
        {corpus.length === 0 && errorBank.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">
            <FlaskConical size={24} className="mx-auto mb-2 opacity-50" />
            开始造句，这里会显示你的活动记录
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-2 text-center shrink-0">
        <div><div className="text-base font-bold text-emerald-600">{stats.corpusSize}</div><div className="text-xs text-gray-500">语料库</div></div>
        <div><div className="text-base font-bold text-red-500">{stats.errorCount}</div><div className="text-xs text-gray-500">错题</div></div>
      </div>
    </>
  );
}

