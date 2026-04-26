import type { RefObject } from 'react';
import { AlertTriangle, Loader2, Mic, MicOff, Send } from 'lucide-react';
import { FieldDifficultyAssistPanel } from './FieldDifficultyAssistPanel';
import type { FieldQuestion, FieldSpeechState, FieldState } from './types';
import type { SentenceTile } from '../../utils/sentenceTileBank';

type FieldAnswerPanelProps = {
  question: FieldQuestion;
  answer: string;
  fieldState: FieldState;
  answerInputRef: RefObject<HTMLTextAreaElement>;
  partColors: Record<number, string>;
  lowerDifficultyLabel: string;
  difficultyAssistLevel: 0 | 1 | 2 | 3;
  difficultyAssist: {
    outlineZh: string[];
    sentenceStems: string[];
    keySentenceZh: string;
  };
  fieldTileDone: boolean;
  selectedChunkCount: number;
  totalChunkCount: number;
  remainingChunkCount: number;
  fieldTileSelected: SentenceTile[];
  fieldTilePool: SentenceTile[];
  fieldTileError: string | null;
  fieldAssistError: string | null;
  speech: FieldSpeechState;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onOpenStuck: () => void;
  onLowerDifficulty: () => void;
  onToggleRecording: () => void;
  onResetAssist: () => void;
  onBackToOutline: () => void;
  onBackToStems: () => void;
  onAppendStem: (stem: string) => void;
  onMoveTileToPool: (tile: SentenceTile) => void;
  onMoveTileToAnswer: (tile: SentenceTile) => void;
  onCheckTiles: () => void;
};

export function FieldAnswerPanel({
  question,
  answer,
  fieldState,
  answerInputRef,
  partColors,
  lowerDifficultyLabel,
  difficultyAssistLevel,
  difficultyAssist,
  fieldTileDone,
  selectedChunkCount,
  totalChunkCount,
  remainingChunkCount,
  fieldTileSelected,
  fieldTilePool,
  fieldTileError,
  fieldAssistError,
  speech,
  onAnswerChange,
  onSubmitAnswer,
  onOpenStuck,
  onLowerDifficulty,
  onToggleRecording,
  onResetAssist,
  onBackToOutline,
  onBackToStems,
  onAppendStem,
  onMoveTileToPool,
  onMoveTileToAnswer,
  onCheckTiles,
}: FieldAnswerPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${partColors[question.part]} bg-white/20 text-white`}>
            Part {question.part}
          </span>
          <span className="text-amber-100 text-sm">{question.topic}</span>
        </div>
        <p className="text-white text-base font-medium leading-relaxed">{question.question}</p>
      </div>

      <div className="p-5">
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
            <Mic size={16} />
            语音录入
          </div>
          <p className="text-amber-700/90 text-xs leading-relaxed">
            点击下方「语音」开始说话，识别到的英文会实时追加到输入框；说完再点「停止」。可边说边改，最后提交进行流利度、语法、词汇评分。
          </p>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-600">你的回答</label>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{answer.split(/\s+/).filter(Boolean).length} 词</span>
              <span>·</span>
              <span>目标: 50-150 词</span>
            </div>
          </div>
          <textarea
            ref={answerInputRef}
            value={answer}
            onChange={e => onAnswerChange(e.target.value)}
            placeholder="Type your answer here in English... Be natural and use core verbs like make, get, take, keep..."
            rows={5}
            disabled={fieldState === 'done' || fieldState === 'evaluating'}
            className={`w-full border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors ${
              fieldState === 'done' ? 'bg-gray-50 border-gray-200' : 'border-gray-200 focus:border-amber-400'
            }`}
          />
          <FieldDifficultyAssistPanel
            difficultyAssistLevel={difficultyAssistLevel}
            outlineZh={difficultyAssist.outlineZh}
            sentenceStems={difficultyAssist.sentenceStems}
            keySentenceZh={difficultyAssist.keySentenceZh}
            fieldTileDone={fieldTileDone}
            selectedChunkCount={selectedChunkCount}
            totalChunkCount={totalChunkCount}
            remainingChunkCount={remainingChunkCount}
            fieldTileSelected={fieldTileSelected}
            fieldTilePool={fieldTilePool}
            fieldTileError={fieldTileError}
            onResetAssist={onResetAssist}
            onBackToOutline={onBackToOutline}
            onBackToStems={onBackToStems}
            onAppendStem={onAppendStem}
            onMoveTileToPool={onMoveTileToPool}
            onMoveTileToAnswer={onMoveTileToAnswer}
            onCheckTiles={onCheckTiles}
          />
          {fieldAssistError ? (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {fieldAssistError}
            </div>
          ) : null}
        </div>

        {fieldState === 'answering' && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={onSubmitAnswer}
              disabled={!answer.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              提交评测
            </button>
            <button
              onClick={onOpenStuck}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <AlertTriangle size={15} />
              卡壳了！
            </button>
            <button
              onClick={onLowerDifficulty}
              disabled={difficultyAssistLevel === 3}
              className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <AlertTriangle size={15} />
              {lowerDifficultyLabel}
            </button>
            <button
              onClick={onToggleRecording}
              disabled={speech.status === 'connecting' || speech.status === 'processing' || speech.status === 'unavailable'}
              title={speech.micAvailable === false ? '麦克风不可用，请在新标签页中打开或检查浏览器权限' : undefined}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                speech.status === 'unavailable'
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                  : speech.isListening
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : speech.status === 'connecting'
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                  : speech.status === 'error'
                  ? 'border-red-300 text-red-500'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {speech.status === 'unavailable' ? (
                <><MicOff size={15} /> 麦克风不可用</>
              ) : speech.status === 'connecting' ? (
                <><Loader2 size={15} className="animate-spin" /> 连接中</>
              ) : speech.isListening ? (
                <><MicOff size={15} /> <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span> 停止</>
              ) : (
                <><Mic size={15} /> 语音</>
              )}
            </button>
          </div>
        )}

        {speech.isListening && speech.interimText && (
          <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-700">
            <span className="text-indigo-400 text-xs mr-2">正在识别:</span>
            {speech.interimText}
          </div>
        )}

        {speech.micAvailable === false && !speech.error && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
            麦克风不可用：当前环境不允许访问麦克风。你可以直接用键盘输入答案，或在新标签页中打开应用以使用语音功能。
          </div>
        )}

        {speech.error && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
            {speech.error}
          </div>
        )}

        {fieldState === 'evaluating' && (
          <div className="flex items-center justify-center gap-3 py-4 text-amber-600">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">AI 正在评测你的回答...</span>
          </div>
        )}
      </div>
    </div>
  );
}
