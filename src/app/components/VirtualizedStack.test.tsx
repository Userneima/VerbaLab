import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { VirtualizedStack } from './VirtualizedStack';

describe('VirtualizedStack', () => {
  it('renders virtualized items container', () => {
    render(
      <VirtualizedStack
        items={Array.from({ length: 20 }, (_, i) => `item-${i}`)}
        estimateSize={40}
        renderItem={(item) => <div>{item}</div>}
      />
    );
    expect(document.querySelector('.max-h-\\[70vh\\]')).toBeTruthy();
  });
});

