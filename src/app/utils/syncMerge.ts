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

type SyncableVocabCard = {
  id: string;
  timestamp: string;
  lastViewedAt?: string | null;
  nextDueAt?: string | null;
  reviewStage?: number | null;
};

function maxIsoTimestamp(...values: Array<string | null | undefined>): string {
  return values
    .map(v => String(v || ''))
    .filter(Boolean)
    .sort()
    .at(-1) || '';
}

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

    const merged = {
      ...contentWinner,
      lastViewedAt:
        reviewWinner.lastViewedAt === undefined ? contentWinner.lastViewedAt ?? null : reviewWinner.lastViewedAt,
      nextDueAt:
        reviewWinner.nextDueAt === undefined ? contentWinner.nextDueAt ?? null : reviewWinner.nextDueAt,
      reviewStage:
        typeof reviewWinner.reviewStage === 'number'
          ? reviewWinner.reviewStage
          : (contentWinner.reviewStage ?? 0),
      // 用最近的“内容更新时间 / 最近复习时间”作为合并后的时间戳，
      // 让后续自动同步能把修复后的复习状态继续带出去。
      timestamp: maxIsoTimestamp(
        contentWinner.timestamp,
        reviewWinner.timestamp,
        reviewWinner.lastViewedAt,
      ),
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
