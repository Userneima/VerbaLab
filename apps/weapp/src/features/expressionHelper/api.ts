import { requestJson } from '../../platform/request';
import { getAuthToken } from '../../platform/storage';

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

export type ExpressionInspiration = {
  chineseThought: string;
  angleZh?: string;
};

export function generateExpressionGuide(chineseThought: string): Promise<ExpressionGuide> {
  return requestJson<ExpressionGuide>({
    method: 'POST',
    path: getAuthToken() ? '/ai/stuck-suggest' : '/public/stuck-suggest',
    data: {
      chineseThought,
    },
  });
}

export function generateExpressionInspirations(contextZh: string): Promise<{ inspirations: ExpressionInspiration[] }> {
  return requestJson<{ inspirations: ExpressionInspiration[] }>({
    method: 'POST',
    path: getAuthToken() ? '/ai/expression-inspirations' : '/public/expression-inspirations',
    data: {
      contextZh,
    },
  });
}
