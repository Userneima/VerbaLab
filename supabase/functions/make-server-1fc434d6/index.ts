import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function getClientIp(c: any): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = c.req.header("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const rlKey = `rl:${key}`;
  const bucket = await kv.get(rlKey) as { count?: number; resetAt?: number } | undefined;
  if (!bucket || bucket.resetAt <= now) {
    await kv.set(rlKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if ((bucket.count || 0) >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  await kv.set(rlKey, { count: (bucket.count || 0) + 1, resetAt: bucket.resetAt });
  return { ok: true };
}

function getAllowedOrigins(): Set<string> {
  const raw = Deno.env.get("CORS_ALLOW_ORIGINS") || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return new Set([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]);
  }
  return new Set(list);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

/** 任意端口的本机前端（Vite 常用 5173/5174/4173 等），避免仅白名单端口时浏览器 CORS 报 Failed to fetch */
function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return false;
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function captureServerError(scope: string, err: unknown) {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split("/").filter(Boolean).pop();
    if (!projectId || !url.username) return;
    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${url.username}` },
      body: JSON.stringify({
        message: `${scope}: ${String(err)}`,
        level: "error",
        platform: "javascript",
        logger: "edge-function",
      }),
    });
  } catch (_) {
    // noop
  }
}

// Helper: extract userId from auth token
async function getUserId(c: any): Promise<string | null> {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user?.id) return null;
    return user.id;
  } catch {
    return null;
  }
}

async function requireAuth(c: any): Promise<
  { ok: true; userId: string } | { ok: false; response: Response }
> {
  const userId = await getUserId(c);
  if (!userId) {
    return {
      ok: false,
      response: c.json({ error: "Unauthorized - valid auth token required" }, 401),
    };
  }
  return { ok: true, userId };
}

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return "";
      if (ALLOWED_ORIGINS.has(origin)) return origin;
      if (isLocalhostOrigin(origin)) return origin;
      return "";
    },
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use("/make-server-1fc434d6/ai/*", async (c, next) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;
  const rl = await enforceRateLimit(`ai:${auth.userId}`, 60, 60_000);
  if (!rl.ok) {
    return c.json(
      { error: "Rate limit exceeded for AI endpoints", retryAfterSec: rl.retryAfterSec },
      429,
    );
  }
  await next();
});

app.use("/make-server-1fc434d6/speech/*", async (c, next) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;
  const rl = await enforceRateLimit(`speech:${auth.userId}`, 30, 60_000);
  if (!rl.ok) {
    return c.json(
      { error: "Rate limit exceeded for speech endpoint", retryAfterSec: rl.retryAfterSec },
      429,
    );
  }
  await next();
});

// Alias routes also require auth + limit.
app.use("/ai/*", async (c, next) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;
  const rl = await enforceRateLimit(`ai:${auth.userId}`, 60, 60_000);
  if (!rl.ok) {
    return c.json(
      { error: "Rate limit exceeded for AI endpoints", retryAfterSec: rl.retryAfterSec },
      429,
    );
  }
  await next();
});

app.onError((err, c) => {
  captureServerError(`make-server:${c.req.path}`, err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Health check endpoint
app.get("/make-server-1fc434d6/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== Auth Routes ==========

app.post("/make-server-1fc434d6/auth/signup", async (c) => {
  try {
    const signupSecret = Deno.env.get("SIGNUP_API_SECRET");
    if (signupSecret) {
      const provided = c.req.header("x-signup-secret");
      if (provided !== signupSecret) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const ip = getClientIp(c);
    const ipRl = await enforceRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);
    if (!ipRl.ok) {
      return c.json({ error: "Too many signup attempts from this IP", retryAfterSec: ipRl.retryAfterSec }, 429);
    }

    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "email and password are required" }, 400);
    }

    const emailRl = await enforceRateLimit(`signup:email:${String(email).toLowerCase()}`, 3, 60 * 60 * 1000);
    if (!emailRl.ok) {
      return c.json({ error: "Too many signup attempts for this email", retryAfterSec: emailRl.retryAfterSec }, 429);
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || "" },
      email_confirm: true,
    });

    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    console.log(`User created: ${data.user?.id} (${email})`);
    return c.json({ success: true, userId: data.user?.id });
  } catch (err) {
    console.log(`Error in signup: ${err}`);
    return c.json({ error: `Signup failed: ${err}` }, 500);
  }
});

// ========== Data Sync Routes ==========

app.post("/make-server-1fc434d6/sync/save", async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) {
      return c.json({ error: "Unauthorized - valid auth token required" }, 401);
    }

    const body = await c.req.json();
    const { corpus, errorBank, stuckPoints, learnedCollocations, vocabCards, foundryExampleOverrides } = body;

    const prefix = `ffu_${userId}`;

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
        corpus || [],
        errorBank || [],
        stuckPoints || [],
        learnedCollocations || [],
        vocabCards || [],
        foundryExampleOverrides && typeof foundryExampleOverrides === "object"
          ? foundryExampleOverrides
          : {},
        syncMeta,
      ],
    );

    console.log(
      `Data saved for user: ${userId}, corpus: ${(corpus || []).length}, errors: ${(errorBank || []).length}, vocab: ${(vocabCards || []).length}`,
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
        pickSince(foundryExampleOverrides, meta.foundryAt) && foundryExampleOverrides && typeof foundryExampleOverrides === "object" && !Array.isArray(foundryExampleOverrides)
          ? foundryExampleOverrides
          : {},
      serverTimestamp: meta.updatedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.log(`Error loading sync data: ${err}`);
    return c.json({ error: `Failed to load data: ${err}` }, 500);
  }
});

// ========== Azure Speech Token Route ==========

app.get("/make-server-1fc434d6/speech/token", async (c) => {
  try {
    const speechKey = Deno.env.get("AZURE_SPEECH_KEY");
    const speechRegion = Deno.env.get("AZURE_SPEECH_REGION");

    if (!speechKey || !speechRegion) {
      console.log(
        "Azure Speech credentials missing - AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set",
      );
      return c.json({ error: "Azure Speech credentials not configured on server" }, 500);
    }

    const tokenUrl =
      `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const tokenResp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      console.log(`Azure token request failed: ${tokenResp.status} - ${errText}`);
      return c.json(
        { error: `Azure token request failed: ${tokenResp.status}` },
        500,
      );
    }

    const token = await tokenResp.text();

    console.log(`Azure Speech token issued successfully for region: ${speechRegion}`);
    return c.json({ token, region: speechRegion });
  } catch (err) {
    console.log(`Error fetching Azure Speech token: ${err}`);
    return c.json({ error: `Failed to get speech token: ${err}` }, 500);
  }
});

// ========== DeepSeek AI ==========

async function callDeepSeek(
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

// Grammar check for Lab
app.post("/make-server-1fc434d6/ai/grammar-check", async (c) => {
  try {
    const { sentence, collocation } = await c.req.json();

    if (!sentence || !collocation) {
      return c.json({ error: "sentence and collocation are required" }, 400);
    }

    const systemPrompt =
      "You are an English grammar checker for Chinese ESL learners. The learner MUST use the exact target collocation: \"" +
      collocation +
      "\" (this is a fixed exercise phrase, not optional).\n\nRespond ONLY with valid JSON (no markdown, no code blocks). Use this exact format:\n{\n  \"isCorrect\": true/false,\n  \"correctedSentence\": \"If isCorrect is false: one full corrected English sentence that fixes all flagged issues and MUST include the exact target collocation unchanged. If isCorrect is true: empty string.\",\n  \"errors\": [\n    {\n      \"type\": \"grammar_type\",\n      \"description\": \"Description in Chinese of the error\",\n      \"hint\": \"Short hint in Chinese (optional)\",\n      \"grammarPoint\": \"Grammar concept name in Chinese\"\n    }\n  ],\n  \"overallHint\": \"Overall hint in Chinese (empty string if correct; may be empty if errors are self-explanatory)\"\n}\n\nRules:\n- Check grammar, tense, articles, prepositions, capitalization, subject-verb agreement, word order, and English sentence punctuation (. ! ? at the end).\n- NEVER treat Chinese full-width punctuation in the learner text (e.g. ，。；：「」) as an error. Do not add an error entry for that; do not set isCorrect to false solely for Chinese punctuation.\n- The collocation \"" +
      collocation +
      "\" must appear in the sentence and be used in a grammatically valid way. If it is used correctly, set isCorrect to true even if a different near-synonym (e.g. take a break vs have a break, make a decision vs take a decision) might be more common in some contexts — DO NOT mark incorrect solely for preferring a synonym over the assigned collocation.\n- NEVER tell the learner to replace \"" +
      collocation +
      "\" with a different phrase that means something similar; that would break the exercise.\n- Only flag the collocation if it is wrong (wrong preposition, wrong verb form, ungrammatical chunk, wrong part of speech, etc.).\n- English sentences should start with a capital letter and end with . ! or ? — flag missing/wrong English closing punctuation if relevant.\n- First person pronoun must be uppercase \"I\"\n- If the sentence is too short (fewer than 4 words), flag it as incomplete\n- Descriptions and hints must be in Chinese\n- correctedSentence must be natural English; do not include Chinese in correctedSentence\n- Be strict on real grammar errors but fair on the assigned collocation choice";

    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: "Please check this sentence: \"" + sentence + "\"\nTarget collocation: \"" + collocation + "\"",
      },
    ]);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.log(`Failed to parse DeepSeek grammar response: ${result}`);
      return c.json({ error: "Failed to parse AI response" }, 500);
    }

    return c.json(parsed);
  } catch (err) {
    console.log(`Error in grammar check: ${err}`);
    return c.json({ error: `Grammar check failed: ${err}` }, 500);
  }
});

// Lab: follow-up Q&A about grammar points (after grammar check failed)
app.post("/make-server-1fc434d6/ai/grammar-tutor", async (c) => {
  try {
    const body = await c.req.json();
    const sentence = String(body.sentence || "").trim();
    const collocation = String(body.collocation || "").trim();
    const chineseContext = String(body.chineseContext || "").trim();
    const overallHint = String(body.overallHint || "").trim();
    const errors = Array.isArray(body.errors) ? body.errors : [];
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!sentence || !collocation) {
      return c.json({ error: "sentence and collocation are required" }, 400);
    }

    const errLines = errors.length
      ? errors.map((e: any, i: number) =>
        `${i + 1}. [${e.grammarPoint || "语法"}] ${e.description || ""}\n   提示：${e.hint || ""}`
      ).join("\n")
      : "(本次为中式表达或其它反馈，无分项语法条目)";

    const systemPrompt =
      "你是面向中国英语学习者的语法与表达助教，用中文回答。\n\n" +
      "【当前练习上下文】\n" +
      "题目语境（中文）：" + (chineseContext || "（未提供）") + "\n" +
      "目标搭配：" + collocation + "\n" +
      "学习者写的英文：\"" + sentence + "\"\n\n" +
      "【系统已给出的诊断】\n" + errLines + "\n" +
      (overallHint ? "总提示：" + overallHint + "\n" : "") +
      "\n规则：\n" +
      "- 本题固定目标搭配为「" + collocation + "」：讲解、对比或举例时**不要**引导学习者改用近义搭配（如用 take a break 替代 have a break）作为「更对的答案」；若句子已正确使用该搭配，应肯定搭配选择并只谈其它语法点。\n" +
      "- 学习者会追问语法概念、用法区别、为什么错等，请讲清楚，可举与上文不同的新例句帮助理解。\n" +
      "- 不要直接给出「把上面那句改对」的完整答案，也不要逐词复述其错误句子的「标准版」；引导学习者自己改。\n" +
      "- 回答简洁有条理，必要时用小标题或分点。\n";

    const validMsgs = messages.filter((m: any) =>
      m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    ).slice(-20);

    const result = await callDeepSeek(
      [{ role: "system", content: systemPrompt }, ...validMsgs],
      0.4,
    );

    const reply = (result || "").trim();
    if (!reply) {
      return c.json({ error: "Empty tutor response" }, 500);
    }
    return c.json({ reply });
  } catch (err) {
    console.log(`Error in grammar tutor: ${err}`);
    return c.json({ error: `Grammar tutor failed: ${err}` }, 500);
  }
});

// Stuck suggestion for Field
app.post("/make-server-1fc434d6/ai/stuck-suggest", async (c) => {
  try {
    const { chineseThought, corpusSentences, verbCollocations } = await c.req.json();

    if (!chineseThought) {
      return c.json({ error: "chineseThought is required" }, 400);
    }

    const corpusContext = (corpusSentences || []).slice(0, 20).map(
      (s: any) => "- \"" + s.userSentence + "\" (collocation: " + s.collocation + ")",
    ).join("\n");

    const verbContext = (verbCollocations || []).slice(0, 30).map(
      (v: any) => "- " + v.phrase + " (" + v.meaning + ")",
    ).join("\n");

    const corpusPart = corpusContext || "(empty)";
    const verbPart = verbContext || "(none provided)";
    const systemPrompt =
      "You are an English speaking coach for Chinese ESL learners using a \"core verb + collocation\" learning method. The learner is stuck during an IELTS speaking practice and tells you what they want to say in Chinese.\n\nYour job is to help them express the idea using simple English with core verbs (get, make, take, keep, give, put, set, go, come, do, etc.).\n\nFollow this three-layer strategy:\n1. FIRST check if the learner's personal corpus has a relevant sentence they can adapt. If found, return type \"corpus\".\n2. If not in corpus, check the verb collocation library for relevant collocations. If found, return type \"verb\".\n3. If neither matches, suggest a simple paraphrase using core verbs. Return type \"paraphrase\".\n\nLearner's personal corpus:\n" + corpusPart + "\n\nAvailable verb collocations:\n" + verbPart + "\n\nRespond ONLY with valid JSON (no markdown):\n{\n  \"type\": \"corpus\" | \"verb\" | \"paraphrase\",\n  \"suggestion\": \"Your suggestion in mixed Chinese/English, explaining how to express the idea. Include example sentences. Use emoji for visual clarity.\"\n}\n\nKeep your suggestion concise, practical, and encouraging.";

    const result = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "我想表达：" + chineseThought },
      ],
      0.5,
    );

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { type: "paraphrase", suggestion: result };
    }

    return c.json(parsed);
  } catch (err) {
    console.log(`Error in stuck suggestion: ${err}`);
    return c.json({ error: `Stuck suggestion failed: ${err}` }, 500);
  }
});

// Field evaluation for IELTS speaking
app.post("/make-server-1fc434d6/ai/evaluate-answer", async (c) => {
  try {
    const { question, answer, part } = await c.req.json();

    if (!answer) {
      return c.json({ error: "answer is required" }, 400);
    }

    const partNum = part || 2;
    const systemPrompt =
      "You are an IELTS speaking examiner and English coach. Evaluate the learner's spoken answer to an IELTS Part " + partNum + " question.\n\nFocus on:\n1. Fluency & Coherence (0-100)\n2. Grammar Range & Accuracy (0-100)\n3. Vocabulary (especially use of core verbs like get, make, take, keep, give, etc.) (0-100)\n4. Overall score (average of above three)\n\nIdentify which core verbs (get, take, make, do, have, go, set, keep, give, put, come, see, know, think, find, tell, ask, work, feel, need) were used.\n\nRespond ONLY with valid JSON (no markdown):\n{\n  \"score\": 75,\n  \"fluency\": 70,\n  \"grammar\": 80,\n  \"vocabulary\": 75,\n  \"verbsUsed\": [\"get\", \"make\"],\n  \"feedback\": [\n    \"Chinese feedback point 1\",\n    \"Chinese feedback point 2\",\n    \"Chinese feedback point 3\"\n  ]\n}\n\nFeedback should be in Chinese, 3-5 points, specific and actionable. Be encouraging but honest.";

    const result = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "IELTS Question: \"" + question + "\"\n\nMy answer: \"" + answer + "\"" },
      ],
      0.4,
    );

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return c.json({ error: "Failed to parse AI evaluation" }, 500);
    }

    return c.json(parsed);
  } catch (err) {
    console.log(`Error in answer evaluation: ${err}`);
    return c.json({ error: `Evaluation failed: ${err}` }, 500);
  }
});

// Short English sentence → natural Chinese (for corpus UI)
const translateSentenceHandler = async (c: any) => {
  try {
    const body = await c.req.json();
    const text = String(body.text || "").trim();
    if (!text || text.length > 800) {
      return c.json({ error: "text required, max 800 chars" }, 400);
    }

    const result = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "You translate English sentences to concise natural Chinese for language learners. Output ONLY the Chinese translation: no quotes, no English, no notes, no markdown.",
        },
        { role: "user", content: text },
      ],
      0.2,
      384,
    );

    const translation = (result || "").trim().replace(/^["「]|["」]$/g, "");
    if (!translation) {
      return c.json({ error: "Empty translation" }, 500);
    }
    return c.json({ translation });
  } catch (err) {
    console.log(`Error in translate-sentence: ${err}`);
    return c.json({ error: `Translation failed: ${err}` }, 500);
  }
};

app.post("/make-server-1fc434d6/ai/translate-sentence", translateSentenceHandler);
app.post("/ai/translate-sentence", translateSentenceHandler);

// Chinglish detection: grammatically correct but non-native; return native version + thinking
app.post("/make-server-1fc434d6/ai/chinglish-check", async (c) => {
  try {
    const { sentence, collocation } = await c.req.json();
    if (!sentence || !collocation) {
      return c.json({ isChinglish: false });
    }

    const systemPrompt =
      "You are an expert at distinguishing natural native English from Chinglish (Chinese-influenced English). The sentence is grammatically correct but may sound unnatural to native speakers.\n\nRespond ONLY with valid JSON (no markdown):\n{\n  \"isChinglish\": true or false,\n  \"nativeVersion\": \"How a native speaker would say it (only if isChinglish is true)\",\n  \"nativeThinking\": \"One short sentence in Chinese explaining the native speaker's mindset or why they phrase it differently (only if isChinglish is true)\"\n}\n\nIf the sentence is already natural, set isChinglish to false and omit nativeVersion and nativeThinking.";

    const result = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Sentence: \"" + sentence + "\"\nTarget collocation: \"" + collocation + "\"\n\nIs this Chinglish? If yes, give native version and brief thinking in Chinese." },
      ],
      0.3,
    );

    let parsed: { isChinglish?: boolean; nativeVersion?: string; nativeThinking?: string };
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return c.json({ isChinglish: false });
    }
    if (!parsed.isChinglish) {
      return c.json({ isChinglish: false });
    }
    return c.json({
      isChinglish: true,
      nativeVersion: parsed.nativeVersion || "",
      nativeThinking: parsed.nativeThinking || "",
    });
  } catch (err) {
    console.log(`Error in chinglish check: ${err}`);
    return c.json({ isChinglish: false });
  }
});

function parseJsonFromModel(text: string): unknown {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1].trim());
}

/** Step 1: decide if learner target is everyday spoken English vs formal/written; pick phrase for example sentence */
async function assessSpokenRegister(
  headword: string,
  sense: string,
  model: string,
): Promise<{
  isCommonInSpokenEnglish: boolean;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
}> {
  const systemPrompt =
    "You help Chinese ESL learners choose natural SPOKEN English. The learner will type an English word or short phrase they want to practice.\n\n" +
    "Judge whether their target is commonly used in everyday casual conversation (with friends, family, coworkers in informal talk), " +
    "or is mainly written, academic, literary, legal, medical jargon in print, or otherwise rare in speech.\n\n" +
    "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
    "{\n" +
    '  "isCommonInSpokenEnglish": true or false,\n' +
    '  "phraseForExample": "string — the ONE wording to use in a single spoken example sentence. If isCommonInSpokenEnglish is true, use the learner\'s wording (fix only capitalization). If false, pick the most natural thing natives say in speech (simple word, phrasal verb, or idiom like \\"runs in the family\\"); do NOT force the formal word into the example.\n' +
    '  "spokenAlternatives": ["2 to 4 alternatives, most natural first"],\n' +
    '  "writtenSupplement": "string or null — if you chose phraseForExample different from the learner\'s input because theirs is formal/rare in speech, put THEIR original word/phrase here as the \\"written/academic\\" label; otherwise null.\n' +
    '  "noteZh": "one short sentence in Chinese: why phraseForExample fits spoken English better when you switched, or confirm it is already colloquial."\n' +
    "}\n\n" +
    "Rules:\n" +
    "- phraseForExample must be a single chunk you can embed in one short sentence (not a list).\n" +
    "- spokenAlternatives must include phraseForExample first or mirror the same ideas.\n" +
    "- If the learner's term is already fine for speaking, set isCommonInSpokenEnglish true and phraseForExample to their term.";

  const userContent =
    "Learner target: \"" + headword + "\"" +
    (sense ? "\nSense / context note: " + sense : "") +
    "\nReturn JSON only.";

  const result = await callDeepSeek(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
    0.2,
    768,
    model,
  );

  try {
    const raw = parseJsonFromModel(result) as Record<string, unknown>;
    const phraseForExample = String(raw.phraseForExample || "").trim() || headword;
    const noteZh = String(raw.noteZh || "").trim();
    const isCommon = Boolean(raw.isCommonInSpokenEnglish);
    const alts = Array.isArray(raw.spokenAlternatives)
      ? (raw.spokenAlternatives as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [];
    let writtenSupplement = raw.writtenSupplement != null && String(raw.writtenSupplement).trim()
      ? String(raw.writtenSupplement).trim()
      : null;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    if (!writtenSupplement && norm(phraseForExample) !== norm(headword)) {
      writtenSupplement = headword;
    }
    return {
      isCommonInSpokenEnglish: isCommon,
      phraseForExample,
      spokenAlternatives: alts.length ? alts : [phraseForExample],
      writtenSupplement,
      noteZh,
    };
  } catch (e) {
    console.log(`assessSpokenRegister parse failed: ${e} raw=${result.slice(0, 300)}`);
    return {
      isCommonInSpokenEnglish: true,
      phraseForExample: headword,
      spokenAlternatives: [headword],
      writtenSupplement: null,
      noteZh: "",
    };
  }
}

// Word Lab: register check + one everyday sentence using collocation whitelist (no IELTS prompts)
const vocabCardHandler = async (c: any) => {
  try {
    const body = await c.req.json();
    const headword = String(body.headword || "").trim();
    const sense = String(body.sense || "").trim();
    const collocations = Array.isArray(body.collocations) ? body.collocations : [];

    if (!headword) {
      return c.json({ error: "headword is required" }, 400);
    }
    if (collocations.length < 1) {
      return c.json({ error: "collocations array is required" }, 400);
    }

    const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";

    const reg = await assessSpokenRegister(headword, sense, vocabModel);
    const phraseForSentence = reg.phraseForExample;

    const colLines = collocations.slice(0, 35).map((x: any) =>
      typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`
    ).join("\n");

    const systemPrompt =
      "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
      "TASK: Write exactly ONE short, natural sentence that someone might say in everyday life (work, home, friends, errands, plans, feelings — NOT exam prompts).\n\n" +
      "The sentence MUST:\n" +
      "1) naturally include this spoken target (use it naturally; inflections allowed if grammar requires: e.g. tense/agreement): \"" +
      phraseForSentence + "\"" +
      (sense ? "\n   (Learner sense note: " + sense + ")" : "") + "\n" +
      "2) use AT LEAST ONE collocation from the whitelist below (verbatim phrase as written, e.g. \"get started\", \"make sense\").\n\n" +
      "The learner originally typed \"" + headword + "\". The spoken target above is what they should practice saying; build the sentence around that, not around formal synonyms.\n\n" +
      "COLLOCATION WHITELIST (only use phrases from this list):\n" + colLines + "\n\n" +
      "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
      "{\n" +
      "  \"items\": [\n" +
      "    {\n" +
      "      \"sentence\": \"English sentence\",\n" +
      "      \"collocationsUsed\": [\"phrase from whitelist used in sentence\"],\n" +
      "      \"chinese\": \"该句中文释义\"\n" +
      "    }\n" +
      "  ]\n" +
      "}\n\n" +
      "Strict style rules:\n" +
      "- Return exactly ONE object in \"items\" (a single sentence).\n" +
      "- Sentence length should usually be 8-16 words; avoid very long or multi-clause sentences.\n" +
      "- Prefer one clear main clause; at most one simple subordinate clause.\n" +
      "- Prefer conversational wording and contractions when natural (I'm, it's, don't, can't).\n" +
      "- Use common daily vocabulary; avoid formal/academic phrasing.\n" +
      "- Do NOT frame the sentence as an answer to a test question; write a standalone real-life line.\n" +
      "- collocationsUsed must be non-empty; phrases must appear in the sentence naturally.\n" +
      "- Avoid awkward literal translation style; wording should sound like normal spoken English.\n" +
      "- Do NOT include questionId or tags.";

    const userContent =
      "Spoken practice target: \"" + phraseForSentence + "\"\nOriginal learner input: \"" + headword + "\"" +
      (sense ? "\nSense note: " + sense : "") +
      "\nGenerate JSON as specified.";

    const result = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      0.35,
      2048,
      vocabModel,
    );

    let parsed: { items?: any[] };
    try {
      parsed = parseJsonFromModel(result) as { items?: any[] };
    } catch {
      console.log(`Failed to parse vocab-card response: ${result.slice(0, 500)}`);
      return c.json({ error: "Failed to parse AI response" }, 500);
    }

    const rawItems = parsed.items || [];
    const first = rawItems.find((it: any) => it && String(it.sentence || "").trim());
    if (!first) {
      return c.json({ error: "AI returned no valid items" }, 500);
    }

    const sentence = String(first.sentence).trim();
    const collocationsUsed = Array.isArray(first.collocationsUsed)
      ? first.collocationsUsed.map((x: any) => String(x))
      : [];

    return c.json({
      headword,
      sense: sense || undefined,
      spokenPracticePhrase: phraseForSentence,
      isCommonInSpokenEnglish: reg.isCommonInSpokenEnglish,
      spokenAlternatives: reg.spokenAlternatives,
      writtenSupplement: reg.writtenSupplement,
      registerNoteZh: reg.noteZh || undefined,
      items: [
        {
          sentence,
          collocationsUsed,
          chinese: String(first.chinese || "").trim() || undefined,
        },
      ],
    });
  } catch (err) {
    console.log(`Error in vocab-card: ${err}`);
    return c.json({ error: `Vocab card generation failed: ${err}` }, 500);
  }
};

app.post("/make-server-1fc434d6/ai/vocab-card", vocabCardHandler);
// 部分网关只把 `/ai/...` 传给函数体，注册别名避免 404
app.post("/ai/vocab-card", vocabCardHandler);

Deno.serve(app.fetch);

