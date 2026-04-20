export async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
  maxTokens = 1024,
  model?: string,
): Promise<string> {
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
  return data.choices?.[0]?.message?.content || "";
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
