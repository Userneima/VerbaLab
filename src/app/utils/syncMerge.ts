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
