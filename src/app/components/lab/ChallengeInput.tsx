import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Mic, MicOff, Send } from 'lucide-react';
import type { SpeechStatus } from '../../utils/useSpeechRecognition';
import {
  type SentenceTile,
  buildShuffledTilePool,
  tokenizeSentenceToTiles,
  verifyReconstructedSentence,
} from '../../utils/sentenceTileBank';

type DifficultyAssistExample = {
  content: string;
  chinese?: string;
};

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
  onLowerDifficulty: () => void;
  onSetDifficultyAssistLevel: (level: 0 | 1 | 2) => void;
  difficultyAssistLevel: 0 | 1 | 2;
  hasDifficultyAssist: boolean;
  difficultyAssistExample: DifficultyAssistExample | null;
  onUseDifficultyAssistSentence: (sentence: string) => void;
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
  const {
    phrase,
    meaning,
    verb,
    isLearned,
    contextStr,
    userInput,
    submissionCount,
    testState,
    onInputChange,
    onKeyDown,
    onSubmit,
    onOpenStuck,
    onLowerDifficulty,
    onSetDifficultyAssistLevel,
    difficultyAssistLevel,
    hasDifficultyAssist,
    difficultyAssistExample,
    onUseDifficultyAssistSentence,
    onToggleRecording,
    speech,
    inputRef,
  } = props;

  const referenceSentence = difficultyAssistExample?.content ?? '';
  const cueZh = difficultyAssistExample?.chinese?.trim() ?? '';
  const refTiles = useMemo(
    () => (referenceSentence ? tokenizeSentenceToTiles(referenceSentence) : []),
    [referenceSentence]
  );
  const distractorCount = useMemo(() => {
    const n = refTiles.length;
    return Math.min(6, Math.max(3, Math.floor(n / 2) + 2));
  }, [refTiles.length]);
  const sessionKey = `${referenceSentence}\0${difficultyAssistLevel}`;

  const [pool, setPool] = useState<SentenceTile[]>([]);
  const [selected, setSelected] = useState<SentenceTile[]>([]);
  const [tileError, setTileError] = useState<string | null>(null);
  const [tileDone, setTileDone] = useState(false);

  useEffect(() => {
    if (difficultyAssistLevel !== 2 || !referenceSentence) {
      setPool([]);
      setSelected([]);
      setTileError(null);
      setTileDone(false);
      return;
    }
    setPool(buildShuffledTilePool(referenceSentence, distractorCount));
    setSelected([]);
    setTileError(null);
    setTileDone(false);
  }, [sessionKey, difficultyAssistLevel, referenceSentence, distractorCount]);

  const moveToAnswer = (tile: SentenceTile) => {
    setTileError(null);
    setPool(prev => prev.filter(t => t.id !== tile.id));
    setSelected(prev => [...prev, tile]);
  };

  const moveToPool = (tile: SentenceTile) => {
    setTileError(null);
    setSelected(prev => prev.filter(t => t.id !== tile.id));
    setPool(prev => [...prev, tile]);
  };

  const handleCheckTiles = () => {
    setTileError(null);
    if (selected.length !== refTiles.length) {
      setTileError(`请先排满 ${refTiles.length} 个词块（当前 ${selected.length} 个）。`);
      return;
    }
    if (!verifyReconstructedSentence(selected, referenceSentence)) {
      setTileError('顺序还不对，点击已选词块可放回下方重排。');
      return;
    }
    setTileDone(true);
    onUseDifficultyAssistSentence(referenceSentence);
  };

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
          {difficultyAssistLevel >= 1 && cueZh && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold tracking-wide text-amber-800">中文提示</div>
                <button
                  type="button"
                  onClick={() => onSetDifficultyAssistLevel(0)}
                  className="text-[11px] font-medium text-amber-700 hover:text-amber-900"
                >
                  收起提示
                </button>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-amber-950">{cueZh}</p>
            </div>
          )}
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
        {difficultyAssistLevel === 2 && referenceSentence && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-amber-800">拆分词块</div>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">
                  还是太难的话，就先把这句英文拼出来。拼对后会自动放回上面的输入框，你可以直接提交，也可以先自己改一版。
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800">
                  {tileDone ? '已拼对' : `共 ${refTiles.length} 块`}
                </span>
                <button
                  type="button"
                  onClick={() => onSetDifficultyAssistLevel(1)}
                  className="text-[11px] font-medium text-amber-700 hover:text-amber-900"
                >
                  回到上一级
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold text-gray-600">你的英文</div>
              <div className="min-h-[3rem] rounded-xl border-2 border-dashed border-amber-200 bg-white px-2 py-2">
                <div className="flex flex-wrap gap-2">
                  {selected.length === 0 ? (
                    <span className="px-2 py-1 text-[11px] text-gray-400">
                      点击下方词块依次加入
                    </span>
                  ) : (
                    selected.map(tile => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => moveToPool(tile)}
                        className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-sm font-medium text-white shadow-sm transition-transform active:scale-[0.98] hover:bg-amber-600"
                      >
                        {tile.text}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold text-gray-600">词库</div>
              <div className="flex flex-wrap gap-2">
                {pool.map(tile => (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => moveToAnswer(tile)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 transition-transform active:scale-[0.98] hover:bg-slate-100"
                  >
                    {tile.text}
                  </button>
                ))}
              </div>
            </div>

            {tileError ? <p className="mt-2 text-[11px] text-red-600">{tileError}</p> : null}

            <button
              type="button"
              onClick={handleCheckTiles}
              disabled={tileDone || selected.length !== refTiles.length}
              className="mt-3 min-h-[42px] w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              检查顺序
            </button>
          </div>
        )}
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
            onClick={onLowerDifficulty}
            disabled={!hasDifficultyAssist || testState === 'checking' || difficultyAssistLevel === 2}
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <AlertTriangle size={15} />
            {difficultyAssistLevel === 0 ? '降低难度' : difficultyAssistLevel === 1 ? '再降一级' : '已降到最低'}
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
