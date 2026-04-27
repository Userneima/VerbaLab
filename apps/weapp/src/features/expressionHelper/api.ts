import { requestJson } from '../../platform/request';

export type ExpressionGuideExample = {
  sentence: string;
  chinese?: string;
  noteZh?: string;
};

export type ExpressionGuide = {
  type: 'corpus' | 'verb' | 'paraphrase';
  suggestion: string;
  recommendedExpression?: string;
  guidanceZh?: string;
  examples: ExpressionGuideExample[];
};

export function generateExpressionGuide(chineseThought: string): Promise<ExpressionGuide> {
  return requestJson<ExpressionGuide>({
    method: 'POST',
    path: '/ai/stuck-suggest',
    data: {
      chineseThought,
      corpusSentences: [],
      verbCollocations: [],
    },
  });
}
