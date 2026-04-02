import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedStack<T>(props: {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  empty?: React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const { items, estimateSize = 140, overscan = 8, className, empty, renderItem } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (items.length === 0) return <>{empty ?? null}</>;

  return (
    <div ref={parentRef} className={className ?? 'max-h-[70vh] overflow-y-auto'}>
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: '0.75rem',
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

