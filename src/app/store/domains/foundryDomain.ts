import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FoundryExampleOverridePack } from '../../utils/syncMerge';

export function useFoundryDomain(
  setFoundryExampleOverrides: Dispatch<
    SetStateAction<Record<string, FoundryExampleOverridePack>>
  >,
) {
  const setFoundryExamplesForCollocation = useCallback(
    (collocationId: string, items: FoundryExampleOverridePack['items']) => {
      const cleaned = items
        .map((it) => ({
          content: it.content.trim(),
          chinese: it.chinese?.trim() ? it.chinese.trim() : undefined,
        }))
        .filter((it) => it.content.length > 0);
      setFoundryExampleOverrides((prev) => {
        const next = { ...prev };
        if (cleaned.length === 0) {
          delete next[collocationId];
        } else {
          next[collocationId] = {
            items: cleaned,
            updatedAt: new Date().toISOString(),
          };
        }
        return next;
      });
    },
    [setFoundryExampleOverrides],
  );

  const clearFoundryExamplesForCollocation = useCallback(
    (collocationId: string) => {
      setFoundryExampleOverrides((prev) => {
        if (!(collocationId in prev)) return prev;
        const next = { ...prev };
        delete next[collocationId];
        return next;
      });
    },
    [setFoundryExampleOverrides],
  );

  return {
    setFoundryExamplesForCollocation,
    clearFoundryExamplesForCollocation,
  };
}
