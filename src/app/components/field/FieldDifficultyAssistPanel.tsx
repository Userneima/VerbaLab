import type { SentenceTile } from '../../utils/sentenceTileBank';

type FieldDifficultyAssistPanelProps = {
  difficultyAssistLevel: 0 | 1 | 2 | 3;
  outlineZh: string[];
  sentenceStems: string[];
  keySentenceZh: string;
  fieldTileDone: boolean;
  selectedChunkCount: number;
  totalChunkCount: number;
  remainingChunkCount: number;
  fieldTileSelected: SentenceTile[];
  fieldTilePool: SentenceTile[];
  fieldTileError: string | null;
  onResetAssist: () => void;
  onBackToOutline: () => void;
  onBackToStems: () => void;
  onAppendStem: (stem: string) => void;
  onMoveTileToPool: (tile: SentenceTile) => void;
  onMoveTileToAnswer: (tile: SentenceTile) => void;
  onCheckTiles: () => void;
};

export function FieldDifficultyAssistPanel({
  difficultyAssistLevel,
  outlineZh,
  sentenceStems,
  keySentenceZh,
  fieldTileDone,
  selectedChunkCount,
  totalChunkCount,
  remainingChunkCount,
  fieldTileSelected,
  fieldTilePool,
  fieldTileError,
  onResetAssist,
  onBackToOutline,
  onBackToStems,
  onAppendStem,
  onMoveTileToPool,
  onMoveTileToAnswer,
  onCheckTiles,
}: FieldDifficultyAssistPanelProps) {
  if (difficultyAssistLevel < 1) return null;

  return (
    <>
      <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-wide text-amber-800">中文答题骨架</div>
          <button
            type="button"
            onClick={onResetAssist}
            className="text-[11px] font-medium text-amber-700 hover:text-amber-900"
          >
            收起辅助
          </button>
        </div>
        <div className="mt-1.5 space-y-1.5">
          {outlineZh.map((line, index) => (
            <p key={`${line}-${index}`} className="text-sm leading-relaxed text-amber-950">
              {index + 1}. {line}
            </p>
          ))}
        </div>
      </div>

      {difficultyAssistLevel >= 2 && (
        <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold tracking-wide text-indigo-800">英文句首模板</div>
            <button
              type="button"
              onClick={onBackToOutline}
              className="text-[11px] font-medium text-indigo-700 hover:text-indigo-900"
            >
              回到上一级
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sentenceStems.map((stem, index) => (
              <button
                key={`${stem}-${index}`}
                type="button"
                onClick={() => onAppendStem(stem)}
                className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                {stem}
              </button>
            ))}
          </div>
        </div>
      )}

      {difficultyAssistLevel === 3 && (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-emerald-800">关键句重排</div>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                还是太难的话，就先把一条关键支撑句拼出来。拼对后会自动放回输入框，但你还需要再补一句自己的展开。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                {fieldTileDone ? '已拼对' : `已选 ${selectedChunkCount} / ${totalChunkCount} 块`}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                还差 {remainingChunkCount} 块
              </span>
              <button
                type="button"
                onClick={onBackToStems}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900"
              >
                回到上一级
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-emerald-950">提示中文：{keySentenceZh}</p>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-emerald-800">
              <span>完成进度</span>
              <span>
                {selectedChunkCount} / {totalChunkCount}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${totalChunkCount === 0 ? 0 : (selectedChunkCount / totalChunkCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-gray-600">你的英文顺序</div>
              <div className="text-[11px] text-gray-500">
                {selectedChunkCount} / {totalChunkCount} 块
              </div>
            </div>
            <div className="min-h-[3rem] rounded-xl border-2 border-dashed border-emerald-200 bg-white px-2 py-2">
              <div className="flex flex-wrap gap-2">
                {fieldTileSelected.length === 0 ? (
                  <span className="px-2 py-1 text-[11px] text-gray-400">点击下方短语块依次加入</span>
                ) : (
                  fieldTileSelected.map((tile, index) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => onMoveTileToPool(tile)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-transform active:scale-[0.98] hover:bg-emerald-700"
                    >
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[11px] font-semibold">
                        {index + 1}
                      </span>
                      {tile.text}
                    </button>
                  ))
                )}
                {remainingChunkCount > 0 &&
                  Array.from({ length: remainingChunkCount }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="inline-flex min-h-[42px] items-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12px] text-emerald-400"
                    >
                      待选 {selectedChunkCount + index + 1}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-gray-600">可选短语块</div>
              <div className="text-[11px] text-gray-500">共 {fieldTilePool.length} 块</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {fieldTilePool.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => onMoveTileToAnswer(tile)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-transform active:scale-[0.98] hover:bg-slate-100"
                >
                  {tile.text}
                </button>
              ))}
            </div>
          </div>

          {fieldTileError ? <p className="mt-2 text-[11px] text-red-600">{fieldTileError}</p> : null}

          <button
            type="button"
            onClick={onCheckTiles}
            disabled={fieldTileDone || fieldTileSelected.length !== totalChunkCount}
            className="mt-3 min-h-[42px] w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            检查顺序
          </button>
        </div>
      )}
    </>
  );
}
