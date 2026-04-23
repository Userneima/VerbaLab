import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { newStuckPointId } from '../../utils/ids';
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
    deleteStuckPoint,
    setStuckPointRecommendedExpression,
  };
}
