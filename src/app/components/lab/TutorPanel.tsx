import { Loader2, MessageCircle, Send } from 'lucide-react';

export function TutorPanel(props: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  loading: boolean;
  error: string | null;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
}) {
  const { messages, loading, error, input, onInputChange, onSend } = props;
  return (
    <div className="bg-white border border-red-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-gray-800 font-medium text-sm">
        <MessageCircle size={16} className="text-violet-600 shrink-0" />
        语法小助教
        <span className="text-gray-400 font-normal text-xs">可追问规则与用法；不会替你写出整句正确答案</span>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
        {messages.length === 0 && !loading && (
          <p className="text-gray-400 text-xs">例如：「主谓一致这里具体怎么判断？」「为什么不能用过去完成时？」</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 ${
              m.role === 'user' ? 'bg-indigo-100 text-indigo-900 ml-4' : 'bg-white border border-gray-100 text-gray-800 mr-4'
            }`}
          >
            <p className="text-xs font-medium text-gray-500 mb-0.5">{m.role === 'user' ? '你' : '助教'}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
            <Loader2 size={14} className="animate-spin" />
            正在思考…
          </div>
        )}
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="输入关于语法点的问题…"
          rows={2}
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-400 bg-white"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="self-end shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Send size={14} />
          发送
        </button>
      </div>
    </div>
  );
}

