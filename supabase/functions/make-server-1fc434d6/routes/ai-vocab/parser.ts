import { ALLOWED_VOCAB_TAGS, normalizeTagHint, uniqueStrings, type RegisterGuide } from "./guardrails.ts";

export function parseRegisterGuide(raw: unknown): RegisterGuide | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const guide = raw as Record<string, unknown>;
  const anchorZh = String(guide.anchorZh || "").trim();
  const alternatives = Array.isArray(guide.alternatives)
    ? (guide.alternatives as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const alt = item as Record<string, unknown>;
          const phrase = String(alt.phrase || "").trim();
          const labelZh = String(alt.labelZh || "").trim();
          if (!phrase || !labelZh) return null;
          const usageZh = String(alt.usageZh || "").trim();
          return {
            phrase,
            labelZh,
            usageZh: usageZh || undefined,
          };
        })
        .filter(Boolean) as RegisterGuide["alternatives"]
    : [];
  const compareExamples =
    guide.compareExamples && typeof guide.compareExamples === "object" && !Array.isArray(guide.compareExamples)
      ? (() => {
          const example = guide.compareExamples as Record<string, unknown>;
          const original = String(example.original || "").trim();
          const spoken = String(example.spoken || "").trim();
          return original && spoken ? { original, spoken } : undefined;
        })()
      : undefined;
  const pitfalls = Array.isArray(guide.pitfalls)
    ? (guide.pitfalls as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const coreCollocations = Array.isArray(guide.coreCollocations)
    ? (guide.coreCollocations as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const tagHints = Array.isArray(guide.tagHints)
    ? (guide.tagHints as unknown[])
        .map((x) => normalizeTagHint(String(x)))
        .filter((tag, index, arr) => tag && arr.indexOf(tag) === index && ALLOWED_VOCAB_TAGS.includes(tag))
    : undefined;

  if (!anchorZh && alternatives.length === 0 && !compareExamples && !pitfalls?.length && !coreCollocations?.length) {
    return undefined;
  }

  return {
    anchorZh,
    alternatives,
    compareExamples,
    pitfalls: pitfalls?.length ? pitfalls : undefined,
    coreCollocations: coreCollocations?.length ? coreCollocations : undefined,
    tagHints: tagHints?.length ? tagHints : undefined,
  };
}

export function mergeRegisterGuides(base?: RegisterGuide, patch?: RegisterGuide): RegisterGuide | undefined {
  if (!base && !patch) return undefined;
  const mergedAlternatives = patch?.alternatives?.length ? patch.alternatives : base?.alternatives || [];
  const mergedTagHints = uniqueStrings([...(base?.tagHints || []), ...(patch?.tagHints || [])]);
  const mergedPitfalls = uniqueStrings([...(patch?.pitfalls || []), ...(base?.pitfalls || [])]);
  const mergedCollocations = uniqueStrings([...(patch?.coreCollocations || []), ...(base?.coreCollocations || [])]);
  return {
    anchorZh: String(patch?.anchorZh || base?.anchorZh || "").trim(),
    alternatives: mergedAlternatives,
    compareExamples: patch?.compareExamples || base?.compareExamples,
    pitfalls: mergedPitfalls.length ? mergedPitfalls : undefined,
    coreCollocations: mergedCollocations.length ? mergedCollocations : undefined,
    tagHints: mergedTagHints.length ? mergedTagHints : undefined,
  };
}

