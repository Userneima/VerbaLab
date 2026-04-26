import {
  AI_USAGE_BLOCKED_ERROR,
  assertAiUsageAllowed,
  recordAiUsageEvent,
  type AiUsage,
} from "../observability.ts";
import { requireAuthUser } from "../platform.ts";

export class AiUsageBlockedError extends Error {
  retryAfterSec: number;

  constructor(message: string, retryAfterSec: number) {
    super(message);
    this.name = "AiUsageBlockedError";
    this.retryAfterSec = retryAfterSec;
  }
}

export function isAiUsageBlockedError(err: unknown): err is AiUsageBlockedError {
  return err instanceof AiUsageBlockedError || (err instanceof Error && err.name === "AiUsageBlockedError");
}

export function aiUsageBlockedResponse(c: any, err: unknown): Response | null {
  if (!isAiUsageBlockedError(err)) return null;
  return c.json({ error: err.message || AI_USAGE_BLOCKED_ERROR, retryAfterSec: err.retryAfterSec }, 429);
}

type DeepSeekResult = {
  content: string;
  model: string;
  usage: AiUsage | null;
};

async function callDeepSeekRaw(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  maxTokens = 1024,
  model?: string,
): Promise<DeepSeekResult> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured on server");
  const chosenModel = model || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";

  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chosenModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.log(`DeepSeek API error: ${resp.status} - ${errText}`);
    throw new Error(`DeepSeek API request failed: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: String(data.model || chosenModel),
    usage: data.usage && typeof data.usage === "object" ? data.usage as AiUsage : null,
  };
}

export async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  maxTokens = 1024,
  model?: string,
): Promise<string> {
  const result = await callDeepSeekRaw(messages, temperature, maxTokens, model);
  return result.content;
}

export async function callTrackedDeepSeek(
  c: any,
  feature: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  maxTokens = 1024,
  model?: string,
): Promise<string> {
  const auth = await requireAuthUser(c);
  if (!auth.ok) throw new Error("Unauthorized - valid auth token required");

  const policy = await assertAiUsageAllowed(auth.user);
  if (!policy.ok) {
    throw new AiUsageBlockedError(policy.message, policy.retryAfterSec);
  }

  const started = Date.now();
  let chosenModel = model || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
  try {
    const result = await callDeepSeekRaw(messages, temperature, maxTokens, model);
    chosenModel = result.model || chosenModel;
    await recordAiUsageEvent({
      actor: auth.user,
      feature,
      model: chosenModel,
      usage: result.usage,
      latencyMs: Date.now() - started,
      success: true,
    });
    await assertAiUsageAllowed(auth.user);
    return result.content;
  } catch (err) {
    await recordAiUsageEvent({
      actor: auth.user,
      feature,
      model: chosenModel,
      usage: null,
      latencyMs: Date.now() - started,
      success: false,
      error: err,
    });
    if (!isAiUsageBlockedError(err)) {
      await assertAiUsageAllowed(auth.user);
    }
    throw err;
  }
}

export function parseJsonFromModel(text: string): unknown {
  const candidates: string[] = [];
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]?.trim()) candidates.push(fencedMatch[1].trim());
  if (text.trim()) candidates.push(text.trim());

  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.push(text.slice(firstObject, lastObject + 1).trim());
  }

  const firstArray = text.indexOf("[");
  const lastArray = text.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    candidates.push(text.slice(firstArray, lastArray + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error("Unable to parse JSON from model response");
}
