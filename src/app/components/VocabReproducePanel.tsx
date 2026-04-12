import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  type SentenceTile,
  tokenizeSentenceToTiles,
  buildShuffledTilePool,
  verifyReconstructedSentence,
} from '../utils/sentenceTileBank';

type Props = {
  /** 卡片上的参考例句（用户需复原） */
  referenceSentence: string;
  /** 本项训练的搭配（展示用，复原正确即已包含） */
  targetCollocation: string;
  /** 中文翻译：作题目提示 */
  cueZh?: string;
  onComplete: () => void;
  alreadyPassed: boolean;
};

export function VocabReproducePanel({
  referenceSentence,
  targetCollocation,
  cueZh,
  onComplete,
  alreadyPassed,
}: Props) {
  const sessionKey = `${referenceSentence}\0${targetCollocation}`;

  const refTiles = useMemo(() => tokenizeSentenceToTiles(referenceSentence), [referenceSentence]);
  const distractorCount = useMemo(() => {
    const n = refTiles.length;
    return Math.min(6, Math.max(3, Math.floor(n / 2) + 2));
  }, [refTiles.length]);

  const [pool, setPool] = useState<SentenceTile[]>([]);
  const [selected, setSelected] = useState<SentenceTile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (alreadyPassed) return;
    setPool(buildShuffledTilePool(referenceSentence, distractorCount));
    setSelected([]);
    setError(null);
    setDone(false);
  }, [sessionKey, referenceSentence, distractorCount, alreadyPassed]);

  const moveToAnswer = (tile: SentenceTile) => {
    setError(null);
    setPool(p => p.filter(t => t.id !== tile.id));
    setSelected(s => [...s, tile]);
  };

  const moveToPool = (tile: SentenceTile) => {
    setError(null);
    setSelected(s => s.filter(t => t.id !== tile.id));
    setPool(p => [...p, tile]);
  };

  const submit = () => {
    setError(null);
    if (selected.length !== refTiles.length) {
      setError(`请排列 ${refTiles.length} 个词块（当前 ${selected.length} 个）。`);
      return;
    }
    if (!verifyReconstructedSentence(selected, referenceSentence)) {
      setError('顺序或词形不对，可点击已选词块放回下方重排。');
      return;
    }
    setDone(true);
    onComplete();
  };

  const canCheck = refTiles.length > 0 && selected.length === refTiles.length && !done;

  if (alreadyPassed || done) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        <CheckCircle2 size={16} className="shrink-0" />
        句子复原正确，可标记复习结果。
      </div>
    );
  }

  const hintZh =
    cueZh?.trim() ||
    '请根据中文提示，将词块排成与卡片一致的英文句（含标点与大小写习惯）。';

  return (
    <div className="space-y-3 border border-violet-200 rounded-xl p-3 bg-violet-50/40">
      <p className="text-[11px] text-violet-900 font-medium leading-relaxed">
        到期复习：根据中文提示排列词块复原英文句，通过后即可点下方「已浏览 / 记住了 / 还不太熟」。
      </p>

      <div>
        <div className="text-[11px] font-semibold text-gray-700 mb-1.5">翻译这句话</div>
        <div className="rounded-lg border border-violet-100 bg-white px-3 py-2.5 text-sm text-gray-900 leading-relaxed">
          {hintZh}
        </div>
      </div>

      {targetCollocation?.trim() ? (
        <p className="text-[10px] text-gray-500">
          目标搭配：<span className="text-gray-700 font-medium">{targetCollocation}</span>
        </p>
      ) : null}

      <div>
        <div className="text-[11px] font-semibold text-gray-600 mb-1.5">你的英文</div>
        <div
          role="group"
          aria-label="已排列的词块，点击可放回词库"
          className="min-h-[3rem] flex flex-wrap gap-2 items-start content-start rounded-lg border-2 border-dashed border-violet-200 bg-white/90 px-2 py-2"
        >
          {selected.length === 0 ? (
            <span className="text-[11px] text-gray-400 py-1">
              点击下方词块依次加入（共需 {refTiles.length} 个）
            </span>
          ) : (
            selected.map(tile => (
              <button
                key={tile.id}
                type="button"
                onClick={() => moveToPool(tile)}
                className="px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-transform"
              >
                {tile.text}
              </button>
            ))
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 tabular-nums">
          已选 {selected.length} / {refTiles.length}
        </p>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-gray-600 mb-1.5">词库</div>
        <div className="flex flex-wrap gap-2">
          {pool.map(tile => (
            <button
              key={tile.id}
              type="button"
              onClick={() => moveToAnswer(tile)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-slate-100 text-gray-900 text-sm font-medium hover:bg-slate-200 active:scale-[0.98] transition-transform"
            >
              {tile.text}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={!canCheck}
        className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        检查
      </button>
    </div>
  );
}
