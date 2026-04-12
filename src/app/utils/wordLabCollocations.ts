import { getDailyCollocations } from '../data/verbData';

/** 搭配抽样数量：供模型白名单选用 */
export const VOCAB_LAB_COLLOCATION_COUNT = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 词卡工坊 / 补充原词例句：与工坊生成一致的随机搭配白名单 */
export function pickWordLabCollocations(): Array<{ phrase: string; meaning: string; verb: string }> {
  return shuffle(getDailyCollocations())
    .slice(0, VOCAB_LAB_COLLOCATION_COUNT)
    .map(({ verb, collocation }) => ({
      phrase: collocation.phrase,
      meaning: collocation.meaning,
      verb: verb.verb,
    }));
}
