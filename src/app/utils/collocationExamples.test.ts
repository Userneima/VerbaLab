import { describe, expect, it } from 'vitest';
import type { ExampleSentence } from '../data/verbData';
import {
  diverseDailyExamples,
  filterCollocationExamplesForDisplay,
  normalizeExampleCore,
} from './collocationExamples';

function ex(scenario: ExampleSentence['scenario'], content: string): ExampleSentence {
  return { scenario, content };
}

describe('collocationExamples', () => {
  it('normalizeExampleCore strips disclosure prefix', () => {
    expect(normalizeExampleCore('In my daily life, I read books.')).toBe('i read books.');
  });

  it('diverseDailyExamples drops redundant daily paraphrases', () => {
    const examples: ExampleSentence[] = [
      ex('daily', 'I enjoy reading in the park.'),
      ex('daily', 'In my daily life, I enjoy reading in the park.'),
      ex('zju', 'Other scenario sentence.'),
    ];
    const daily = diverseDailyExamples(examples);
    expect(daily).toHaveLength(1);
    expect(daily[0].content).toBe('I enjoy reading in the park.');
  });

  it('filterCollocationExamplesForDisplay keeps non-daily and filtered daily', () => {
    const examples: ExampleSentence[] = [
      ex('daily', 'A'),
      ex('daily', 'In my daily life, A'),
      ex('design', 'B'),
    ];
    const out = filterCollocationExamplesForDisplay(examples);
    expect(out.some(e => e.scenario === 'design')).toBe(true);
    expect(out.filter(e => e.scenario === 'daily')).toHaveLength(1);
  });
});
