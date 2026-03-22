import type { VocabCardItem } from '../store/useStore';

/** 雅思题库 topic → 应用场景（中文），便于筛选与理解 */
const TOPIC_TO_SCENARIO_ZH: Record<string, string> = {
  'Daily Routine': '日常生活',
  Hobbies: '兴趣爱好',
  Study: '学习备考',
  'A Person You Admire': '人物描述',
  'A Challenge You Overcame': '挑战与经历',
  'A Skill You Want to Learn': '技能与学习规划',
  Technology: '科技与社会',
  Education: '教育与学习',
  Travel: '旅行与出行',
  'An Interesting Place': '地点与经历',
};

const PART_SCENARIO_FALLBACK: Record<number, string> = {
  1: '日常问答',
  2: '话题陈述',
  3: '观点讨论',
};

/**
 * 根据卡片内各题所属主题，生成去重后的应用场景标签（仅中文场景名，不含 Part/ headword 等噪音）。
 */
export function scenarioTagsFromVocabItems(items: VocabCardItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const tag =
      (it.topic && TOPIC_TO_SCENARIO_ZH[it.topic]) ||
      PART_SCENARIO_FALLBACK[it.part] ||
      '口语练习';
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}
