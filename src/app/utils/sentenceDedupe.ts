/**
 * 语料 / 错题等场景共用的「实质同一句」规范化（空白、大小写、句末标点、弯引号）。
 */
export function normalizeSentenceForDedupe(sentence: string): string {
  return sentence
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[.!?…]+$/u, '')
    .trim();
}
