/**
 * 云端拉取时与本地合并：同 id 取 timestamp 更新的一方，仅存在一侧的保留。
 * 降低多设备/离线写入后「整包覆盖」导致的数据丢失风险。
 */

export function mergeByIdNewerTimestamp<T extends { id: string; timestamp: string }>(
  local: T[],
  remote: T[]
): T[] {
  const byId = new Map<string, T>();

  for (const r of remote) {
    if (!r?.id) continue;
    byId.set(r.id, r);
  }

  for (const l of local) {
    if (!l?.id) continue;
    const r = byId.get(l.id);
    if (!r) {
      byId.set(l.id, l);
      continue;
    }
    const lt = l.timestamp || '';
    const rt = r.timestamp || '';
    byId.set(l.id, lt >= rt ? l : r);
  }

  return [...byId.values()].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

type SyncableCorpusEntry = {
  id: string;
  createdAt?: string;
  timestamp: string;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  reviewStage?: number | null;
};

function pickCorpusReviewWinner<T extends SyncableCorpusEntry>(left: T, right: T): T {
  const leftViewed = String(left.lastReviewedAt || '');
  const rightViewed = String(right.lastReviewedAt || '');
  if (leftViewed !== rightViewed) return leftViewed > rightViewed ? left : right;

  const leftStage = typeof left.reviewStage === 'number' ? left.reviewStage : -1;
  const rightStage = typeof right.reviewStage === 'number' ? right.reviewStage : -1;
  if (leftStage !== rightStage) return leftStage > rightStage ? left : right;

  const leftDue = String(left.nextReviewAt || '');
  const rightDue = String(right.nextReviewAt || '');
  if (leftDue !== rightDue) return leftDue > rightDue ? left : right;

  return String(left.timestamp || '') >= String(right.timestamp || '') ? left : right;
}

/**
 * 语料句子也有复习进度：
 * 内容字段优先取较新的 timestamp，
 * 复习字段优先取较新的 lastReviewedAt / reviewStage / nextReviewAt。
 */
export function mergeCorpusEntries<T extends SyncableCorpusEntry>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();

  for (const remoteEntry of remote) {
    if (!remoteEntry?.id) continue;
    byId.set(remoteEntry.id, remoteEntry);
  }

  for (const localEntry of local) {
    if (!localEntry?.id) continue;
    const remoteEntry = byId.get(localEntry.id);
    if (!remoteEntry) {
      byId.set(localEntry.id, localEntry);
      continue;
    }

    const contentWinner =
      String(localEntry.timestamp || '') >= String(remoteEntry.timestamp || '')
        ? localEntry
        : remoteEntry;
    const reviewWinner = pickCorpusReviewWinner(localEntry, remoteEntry);
    const createdAtCandidates = [localEntry.createdAt, remoteEntry.createdAt, contentWinner.timestamp]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .sort();

    byId.set(localEntry.id, {
      ...contentWinner,
      createdAt: createdAtCandidates[0] || contentWinner.timestamp,
      lastReviewedAt:
        reviewWinner.lastReviewedAt === undefined
          ? contentWinner.lastReviewedAt ?? null
          : reviewWinner.lastReviewedAt,
      nextReviewAt:
        reviewWinner.nextReviewAt === undefined
          ? contentWinner.nextReviewAt ?? null
          : reviewWinner.nextReviewAt,
      reviewStage:
        typeof reviewWinner.reviewStage === "number"
          ? reviewWinner.reviewStage
          : (contentWinner.reviewStage ?? 0),
      timestamp: contentWinner.timestamp,
    } satisfies T);
  }

  return [...byId.values()].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

type SyncableVocabCard = {
  id: string;
  timestamp: string;
  items?: Array<{ id?: string; sentence?: string; reviewChunks?: string[] }>;
  lastViewedAt?: string | null;
  nextDueAt?: string | null;
  reviewStage?: number | null;
};

function pickVocabReviewWinner<T extends SyncableVocabCard>(left: T, right: T): T {
  const leftViewed = String(left.lastViewedAt || '');
  const rightViewed = String(right.lastViewedAt || '');
  if (leftViewed !== rightViewed) return leftViewed > rightViewed ? left : right;

  const leftStage = typeof left.reviewStage === 'number' ? left.reviewStage : -1;
  const rightStage = typeof right.reviewStage === 'number' ? right.reviewStage : -1;
  if (leftStage !== rightStage) return leftStage > rightStage ? left : right;

  const leftDue = String(left.nextDueAt || '');
  const rightDue = String(right.nextDueAt || '');
  if (leftDue !== rightDue) return leftDue > rightDue ? left : right;

  return String(left.timestamp || '') >= String(right.timestamp || '') ? left : right;
}

function mergeVocabItemsWithReviewChunks<T extends SyncableVocabCard>(content: T, left: T, right: T): T {
  if (!Array.isArray(content.items)) return content;
  const candidates = [...(left.items || []), ...(right.items || [])];
  const items = content.items.map((item) => {
    if (Array.isArray(item.reviewChunks) && item.reviewChunks.length > 0) return item;
    const source = candidates.find((candidate) => {
      if (!Array.isArray(candidate.reviewChunks) || candidate.reviewChunks.length === 0) return false;
      return (
        (item.id && candidate.id === item.id) ||
        (item.sentence && candidate.sentence === item.sentence)
      );
    });
    return source ? { ...item, reviewChunks: source.reviewChunks } : item;
  });
  return { ...content, items };
}

/**
 * 词卡合并与普通条目不同：
 * 内容字段优先取较新的 timestamp，
 * 复习字段优先取较新的复习状态，避免某端复习结果被旧快照覆盖。
 */
export function mergeVocabCards<T extends SyncableVocabCard>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();

  for (const remoteCard of remote) {
    if (!remoteCard?.id) continue;
    byId.set(remoteCard.id, remoteCard);
  }

  for (const localCard of local) {
    if (!localCard?.id) continue;
    const remoteCard = byId.get(localCard.id);
    if (!remoteCard) {
      byId.set(localCard.id, localCard);
      continue;
    }

    const contentWinner =
      String(localCard.timestamp || '') >= String(remoteCard.timestamp || '')
        ? localCard
        : remoteCard;
    const reviewWinner = pickVocabReviewWinner(localCard, remoteCard);

    const contentWithChunks = mergeVocabItemsWithReviewChunks(contentWinner, localCard, remoteCard);
    const merged = {
      ...contentWithChunks,
      lastViewedAt:
        reviewWinner.lastViewedAt === undefined ? contentWithChunks.lastViewedAt ?? null : reviewWinner.lastViewedAt,
      nextDueAt:
        reviewWinner.nextDueAt === undefined ? contentWithChunks.nextDueAt ?? null : reviewWinner.nextDueAt,
      reviewStage:
        typeof reviewWinner.reviewStage === 'number'
          ? reviewWinner.reviewStage
          : (contentWithChunks.reviewStage ?? 0),
      // timestamp 表示词卡添加/内容时间，不能被复习时间污染；
      // 复习进度只通过 lastViewedAt / nextDueAt / reviewStage 合并。
      timestamp: contentWithChunks.timestamp,
    } satisfies T;

    byId.set(localCard.id, merged);
  }

  return [...byId.values()].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

export function mergeLearnedCollocationIds(local: Set<string>, remote: string[] | undefined): Set<string> {
  const next = new Set(local);
  for (const id of remote || []) {
    if (id) next.add(String(id));
  }
  return next;
}

/** 资产区自定义例句：按搭配 id 合并，updatedAt 较新的一方胜出 */
export type FoundryExampleOverridePack = {
  items: Array<{ content: string; chinese?: string }>;
  updatedAt: string;
};

export function mergeFoundryExampleOverrides(
  local: Record<string, FoundryExampleOverridePack>,
  remote: Record<string, FoundryExampleOverridePack> | undefined | null
): Record<string, FoundryExampleOverridePack> {
  const out: Record<string, FoundryExampleOverridePack> = { ...local };
  for (const [key, r] of Object.entries(remote || {})) {
    if (!r || typeof r !== 'object' || !Array.isArray(r.items)) continue;
    const l = local[key];
    if (!l) {
      out[key] = r;
      continue;
    }
    out[key] = (l.updatedAt || '') >= (r.updatedAt || '') ? l : r;
  }
  return out;
}
