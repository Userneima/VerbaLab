import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { newStuckPointId } from '../../utils/ids';
import { trackProductEvent } from '../../utils/api';
import type { StuckPointEntry } from '../types';

export function useStuckPointsDomain(
  setStuckPoints: Dispatch<SetStateAction<StuckPointEntry[]>>,
) {
  const addStuckPoint = useCallback(
    (entry: Omit<StuckPointEntry, 'id' | 'timestamp' | 'resolved'>) => {
      const newEntry: StuckPointEntry = {
        ...entry,
        id: newStuckPointId(),
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      setStuckPoints((prev) => [newEntry, ...prev]);
      trackProductEvent({
        eventName: 'stuck_helper_generated',
        surface: newEntry.sourceMode || 'free',
        objectType: 'stuck',
        objectId: newEntry.id,
        metadata: {
          sourceMode: newEntry.sourceMode,
          hasRecommendedExpression: Boolean(newEntry.recommendedExpression),
        },
      });
      return newEntry;
    },
    [setStuckPoints],
  );

  const resolveStuck = useCallback(
    (stuckId: string) => {
      setStuckPoints((prev) =>
        prev.map((entry) => (entry.id === stuckId ? { ...entry, resolved: true } : entry)),
      );
    },
    [setStuckPoints],
  );

  const reopenStuck = useCallback(
    (stuckId: string) => {
      setStuckPoints((prev) =>
        prev.map((entry) => (entry.id === stuckId ? { ...entry, resolved: false } : entry)),
      );
    },
    [setStuckPoints],
  );

  const deleteStuckPoint = useCallback(
    (stuckId: string) => {
      setStuckPoints((prev) => prev.filter((entry) => entry.id !== stuckId));
    },
    [setStuckPoints],
  );

  const setStuckPointRecommendedExpression = useCallback(
    (stuckId: string, recommendedExpression: string) => {
      const trimmed = recommendedExpression.trim();
      if (!trimmed) return;
      setStuckPoints((prev) =>
        prev.map((entry) =>
          entry.id === stuckId ? { ...entry, recommendedExpression: trimmed } : entry,
        ),
      );
    },
    [setStuckPoints],
  );

  return {
    addStuckPoint,
    resolveStuck,
    reopenStuck,
    deleteStuckPoint,
    setStuckPointRecommendedExpression,
  };
}
