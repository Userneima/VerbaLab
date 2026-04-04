import { AlertTriangle, CheckCircle2, Loader2, Mic, MicOff, Send } from 'lucide-react';
import type { SpeechStatus } from '../../utils/useSpeechRecognition';

export function ChallengeInput(props: {
  phrase: string;
  meaning: string;
  verb: string;
  isLearned: boolean;
  contextStr: string;
  userInput: string;
  submissionCount: number;
  testState: 'idle' | 'checking' | 'correct' | 'incorrect';
  onInputChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  onOpenStuck: () => void;
  onToggleRecording: () => void;
  speech: {
    isListening: boolean;
    interimText: string;
    error: string | null;
    micAvailable: boolean | null;
    status: SpeechStatus;
  };
  inputRef: React.Ref<HTMLTextAreaElement>;
}) {
  const { phrase, meaning, verb, isLearned, contextStr, userInput, submissionCount, testState, onInputChange, onKeyDown, onSubmit, onOpenStuck, onToggleRecording, speech, inputRef } = props;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-violet-200/90 text-[10px] uppercase tracking-wide mb-0.5">目标搭配</div>
            <div className="text-xl font-bold leading-tight">{phrase}</div>
            <div className="text-violet-200 text-sm mt-0.5 line-clamp-2">{meaning}</div>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-lg px-3 py-1 text-sm font-medium">{verb}</div>
            {isLearned && <div className="mt-2 text-xs text-violet-200">✓ 已标记学习</div>}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-700 text-[10px] font-bold">题</span>
          </div>
          <div className="min-w-0">
            <p className="text-gray-700 text-sm font-medium leading-snug">{contextStr}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              用 <strong className="text-indigo-600">{phrase}</strong> 写完整英文句
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[11px] text-violet-700/90 mb-2 flex items-center gap-1.5">
          <Mic size={14} className="shrink-0" />
          可用「语音」追加到输入框，说完点「停止」
        </p>
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-2 gap-2">
            <label className="text-sm font-medium text-gray-600">你的造句</label>
            <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
              {userInput.length > 0 && <span>{userInput.length} 字符</span>}
              {userInput.length > 0 && submissionCount > 0 && <span>·</span>}
              {submissionCount > 0 && <span className="text-violet-500">第 {submissionCount} 次提交</span>}
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Write a sentence using "${phrase}"...`}
            rows={5}
            disabled={testState === 'checking' || testState === 'correct'}
            className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors ${
              testState === 'correct' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : testState === 'incorrect' ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-indigo-400 bg-white'
            }`}
          />
        </div>
        {speech.isListening && speech.interimText && (
          <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-700">
            <span className="text-indigo-400 text-xs mr-2">正在识别:</span>{speech.interimText}
          </div>
        )}
        {speech.micAvailable === false && !speech.error && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">麦克风不可用：可仅用键盘输入，或在新标签页打开本应用并允许麦克风权限。</div>
        )}
        {speech.error && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">{speech.error}</div>
        )}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!userInput.trim() || testState === 'checking' || testState === 'correct'}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              testState === 'correct' ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : testState === 'checking' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            }`}
          >
            {testState === 'checking' ? <><Loader2 size={15} className="animate-spin" /> AI 检查中...</> : testState === 'correct' ? <><CheckCircle2 size={15} /> 已通过</> : <><Send size={15} /> 提交检查</>}
          </button>
          <button type="button" onClick={onOpenStuck} disabled={testState === 'checking'} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:pointer-events-none">
            <AlertTriangle size={15} />
            卡壳了！
          </button>
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={testState === 'checking' || testState === 'correct' || speech.status === 'connecting' || speech.status === 'processing' || speech.status === 'unavailable'}
            title={speech.micAvailable === false ? '麦克风不可用，请在新标签页中打开或检查浏览器权限' : undefined}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
              speech.status === 'unavailable' ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : speech.isListening ? 'border-red-300 bg-red-50 text-red-600' : speech.status === 'connecting' ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : speech.status === 'error' ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {speech.status === 'unavailable' ? <><MicOff size={15} /> 麦克风不可用</> : speech.status === 'connecting' ? <><Loader2 size={15} className="animate-spin" /> 连接中</> : speech.isListening ? <><MicOff size={15} /> 停止</> : <><Mic size={15} /> 语音</>}
          </button>
        </div>
      </div>
    </div>
  );
}

