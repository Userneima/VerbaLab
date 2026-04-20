import type { Hono } from "npm:hono";
import * as kv from "../kv_store.ts";
import { getUserId } from "../platform.ts";

function mergeByIdNewerTimestamp<T extends { id: string; timestamp?: string }>(
  local: T[] | undefined,
  remote: T[] | undefined,
): T[] {
  const byId = new Map<string, T>();

  for (const item of remote || []) {
    if (!item?.id) continue;
    byId.set(item.id, item);
  }

  for (const item of local || []) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const lt = item.timestamp || "";
    const rt = existing.timestamp || "";
    byId.set(item.id, lt >= rt ? item : existing);
  }

  return [...byId.values()].sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );
}

type SyncableVocabCard = {
  id: string;
  timestamp?: string;
  lastViewedAt?: string | null;
  nextDueAt?: string | null;
  reviewStage?: number | null;
};

function maxIsoTimestamp(...values: Array<string | null | undefined>): string {
  return values.map((v) => String(v || "")).filter(Boolean).sort().at(-1) || "";
}

function pickVocabReviewWinner<T extends SyncableVocabCard>(left: T, right: T): T {
  const leftViewed = String(left.lastViewedAt || "");
  const rightViewed = String(right.lastViewedAt || "");
  if (leftViewed !== rightViewed) return leftViewed > rightViewed ? left : right;

  const leftStage = typeof left.reviewStage === "number" ? left.reviewStage : -1;
  const rightStage = typeof right.reviewStage === "number" ? right.reviewStage : -1;
  if (leftStage !== rightStage) return leftStage > rightStage ? left : right;

  const leftDue = String(left.nextDueAt || "");
  const rightDue = String(right.nextDueAt || "");
  if (leftDue !== rightDue) return leftDue > rightDue ? left : right;

  return String(left.timestamp || "") >= String(right.timestamp || "") ? left : right;
}

function mergeVocabCards<T extends SyncableVocabCard>(
  local: T[] | undefined,
  remote: T[] | undefined,
): T[] {
  const byId = new Map<string, T>();

  for (const remoteCard of remote || []) {
    if (!remoteCard?.id) continue;
    byId.set(remoteCard.id, remoteCard);
  }

  for (const localCard of local || []) {
    if (!localCard?.id) continue;
    const remoteCard = byId.get(localCard.id);
    if (!remoteCard) {
      byId.set(localCard.id, localCard);
      continue;
    }

    const contentWinner =
      String(localCard.timestamp || "") >= String(remoteCard.timestamp || "")
        ? localCard
        : remoteCard;
    const reviewWinner = pickVocabReviewWinner(localCard, remoteCard);

    byId.set(localCard.id, {
      ...contentWinner,
      lastViewedAt:
        reviewWinner.lastViewedAt === undefined ? contentWinner.lastViewedAt ?? null : reviewWinner.lastViewedAt,
      nextDueAt:
        reviewWinner.nextDueAt === undefined ? contentWinner.nextDueAt ?? null : reviewWinner.nextDueAt,
      reviewStage:
        typeof reviewWinner.reviewStage === "number"
          ? reviewWinner.reviewStage
          : (contentWinner.reviewStage ?? 0),
      timestamp: maxIsoTimestamp(
        contentWinner.timestamp,
        reviewWinner.timestamp,
        reviewWinner.lastViewedAt,
      ),
    } as T);
  }

  return [...byId.values()].sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );
}

function mergeLearnedIds(local: string[] | undefined, remote: string[] | undefined): string[] {
  return [
    ...new Set([...(remote || []), ...(local || [])].map((x) => String(x).trim()).filter(Boolean)),
  ];
}

type FoundryPack = { items: Array<{ content: string; chinese?: string }>; updatedAt?: string };

function mergeFoundryExampleOverrides(
  local: Record<string, FoundryPack> | undefined,
  remote: Record<string, FoundryPack> | undefined,
): Record<string, FoundryPack> {
  const out: Record<string, FoundryPack> = { ...(remote || {}) };
  for (const [key, localPack] of Object.entries(local || {})) {
    if (!localPack || typeof localPack !== "object" || !Array.isArray(localPack.items)) continue;
    const remotePack = out[key];
    if (!remotePack || typeof remotePack !== "object" || !Array.isArray(remotePack.items)) {
      out[key] = localPack;
      continue;
    }
    out[key] =
      String(localPack.updatedAt || "") >= String(remotePack.updatedAt || "")
        ? localPack
        : remotePack;
  }
  return out;
}

export function registerSyncRoutes(app: Hono) {
  app.post("/make-server-1fc434d6/sync/save", async (c) => {
    try {
      const userId = await getUserId(c);
      if (!userId) {
        return c.json({ error: "Unauthorized - valid auth token required" }, 401);
      }

      const body = await c.req.json();
      const {
        corpus,
        errorBank,
        stuckPoints,
        learnedCollocations,
        vocabCards,
        foundryExampleOverrides,
      } = body;

      const prefix = `ffu_${userId}`;

      const [
        remoteCorpus,
        remoteErrorBank,
        remoteStuckPoints,
        remoteLearnedCollocations,
        remoteVocabCards,
        remoteFoundryExampleOverrides,
      ] = await kv.mget([
        `${prefix}_corpus`,
        `${prefix}_errors`,
        `${prefix}_stuck`,
        `${prefix}_learned`,
        `${prefix}_vocab`,
        `${prefix}_foundry_examples`,
      ]);

      const mergedCorpus = mergeByIdNewerTimestamp(
        Array.isArray(corpus) ? corpus : [],
        Array.isArray(remoteCorpus) ? remoteCorpus : [],
      );
      const mergedErrorBank = mergeByIdNewerTimestamp(
        Array.isArray(errorBank) ? errorBank : [],
        Array.isArray(remoteErrorBank) ? remoteErrorBank : [],
      );
      const mergedStuckPoints = mergeByIdNewerTimestamp(
        Array.isArray(stuckPoints) ? stuckPoints : [],
        Array.isArray(remoteStuckPoints) ? remoteStuckPoints : [],
      );
      const mergedLearnedCollocations = mergeLearnedIds(
        Array.isArray(learnedCollocations) ? learnedCollocations : [],
        Array.isArray(remoteLearnedCollocations) ? remoteLearnedCollocations : [],
      );
      const mergedVocabCards = mergeVocabCards(
        Array.isArray(vocabCards) ? vocabCards : [],
        Array.isArray(remoteVocabCards) ? remoteVocabCards : [],
      );
      const mergedFoundryExampleOverrides = mergeFoundryExampleOverrides(
        foundryExampleOverrides && typeof foundryExampleOverrides === "object" && !Array.isArray(foundryExampleOverrides)
          ? foundryExampleOverrides
          : {},
        remoteFoundryExampleOverrides && typeof remoteFoundryExampleOverrides === "object" && !Array.isArray(remoteFoundryExampleOverrides)
          ? remoteFoundryExampleOverrides
          : {},
      );

      const nowIso = new Date().toISOString();
      const syncMeta = {
        updatedAt: nowIso,
        corpusAt: nowIso,
        errorsAt: nowIso,
        stuckAt: nowIso,
        learnedAt: nowIso,
        vocabAt: nowIso,
        foundryAt: nowIso,
      };
      await kv.mset(
        [
          `${prefix}_corpus`,
          `${prefix}_errors`,
          `${prefix}_stuck`,
          `${prefix}_learned`,
          `${prefix}_vocab`,
          `${prefix}_foundry_examples`,
          `${prefix}_sync_meta`,
        ],
        [
          mergedCorpus,
          mergedErrorBank,
          mergedStuckPoints,
          mergedLearnedCollocations,
          mergedVocabCards,
          mergedFoundryExampleOverrides,
          syncMeta,
        ],
      );

      console.log(
        `Data saved for user: ${userId}, merged corpus: ${mergedCorpus.length}, merged errors: ${mergedErrorBank.length}, merged vocab: ${mergedVocabCards.length}`,
      );

      return c.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
      console.log(`Error saving sync data: ${err}`);
      return c.json({ error: `Failed to save data: ${err}` }, 500);
    }
  });

  app.get("/make-server-1fc434d6/sync/load", async (c) => {
    try {
      const userId = await getUserId(c);
      if (!userId) {
        return c.json({ error: "Unauthorized - valid auth token required" }, 401);
      }

      const since = c.req.query("since") || "";
      const prefix = `ffu_${userId}`;

      const [corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides, syncMeta] = await kv.mget([
        `${prefix}_corpus`,
        `${prefix}_errors`,
        `${prefix}_stuck`,
        `${prefix}_learned`,
        `${prefix}_vocab`,
        `${prefix}_foundry_examples`,
        `${prefix}_sync_meta`,
      ]);
      const meta = (syncMeta && typeof syncMeta === "object") ? syncMeta as Record<string, string> : {};
      const pickSince = (payload: unknown, at?: string) => {
        if (!since) return payload;
        if (!at) return payload;
        return at > since ? payload : undefined;
      };

      console.log(`Data loaded for user: ${userId}`);

      return c.json({
        corpus: pickSince(corpus || [], meta.corpusAt),
        errorBank: pickSince(errorBank || [], meta.errorsAt),
        stuckPoints: pickSince(stuckPoints || [], meta.stuckAt),
        learnedCollocations: pickSince(learnedCollocations || [], meta.learnedAt),
        vocabCards: pickSince(vocabCards || [], meta.vocabAt),
        foundryExampleOverrides:
          pickSince(foundryExampleOverrides, meta.foundryAt) &&
            foundryExampleOverrides &&
            typeof foundryExampleOverrides === "object" &&
            !Array.isArray(foundryExampleOverrides)
            ? foundryExampleOverrides
            : {},
        serverTimestamp: meta.updatedAt || new Date().toISOString(),
      });
    } catch (err) {
      console.log(`Error loading sync data: ${err}`);
      return c.json({ error: `Failed to load data: ${err}` }, 500);
    }
  });
}
