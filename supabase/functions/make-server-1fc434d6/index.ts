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
const grammarCheckHandler = async (c: any) => {
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

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromModel(result) as Record<string, unknown>;
    } catch {
      console.log(`Failed to parse DeepSeek grammar response: ${result}`);
      return c.json({ error: "Failed to parse AI response" }, 500);
    }

    const isCorrect = Boolean(parsed.isCorrect);
    let correctedSentence = String(parsed.correctedSentence || "").trim();
    const overallHint = String(parsed.overallHint || "").trim();
    const errors = Array.isArray(parsed.errors)
      ? parsed.errors.map((item) => {
          const raw = item && typeof item === "object" && !Array.isArray(item)
            ? item as Record<string, unknown>
            : {};
          return {
            type: String(raw.type || "").trim(),
            description: String(raw.description || "").trim(),
            hint: String(raw.hint || "").trim(),
            grammarPoint: String(raw.grammarPoint || "").trim(),
          };
        }).filter((item) => item.description || item.grammarPoint || item.hint || item.type)
      : [];

    if (!isCorrect && !correctedSentence) {
      try {
        const repairPrompt =
          "You only repair English sentences for Chinese ESL learners.\n\n" +
          "Return ONLY valid JSON:\n" +
          "{\n" +
          '  "correctedSentence": "one natural corrected English sentence"\n' +
          "}\n\n" +
          "Rules:\n" +
          "- Keep the exact target collocation unchanged: \"" + collocation + "\".\n" +
          "- Fix grammar, tense, articles, prepositions, word order, capitalization, and punctuation.\n" +
          "- Do not explain.\n" +
          "- Do not output multiple options.\n" +
          "- correctedSentence must be natural English only.";
        const repairResult = await callDeepSeek(
          [
            { role: "system", content: repairPrompt },
            {
              role: "user",
              content:
                "Original sentence: \"" + sentence + "\"\n" +
                "Target collocation: \"" + collocation + "\"\n" +
                (errors.length
                  ? "Known issues: " + errors.map((item) => item.description).filter(Boolean).join("；") + "\n"
                  : "") +
                "Return JSON only.",
            },
          ],
          0.2,
          256,
        );
        const repaired = parseJsonFromModel(repairResult) as Record<string, unknown>;
        correctedSentence = String(repaired.correctedSentence || "").trim();
      } catch (repairError) {
        console.log(`Failed to repair correctedSentence: ${repairError}`);
      }
    }

    return c.json({
      isCorrect,
      correctedSentence,
      errors,
      overallHint,
    });
  } catch (err) {
    console.log(`Error in grammar check: ${err}`);
    return c.json({ error: `Grammar check failed: ${err}` }, 500);
  }
};

app.post("/make-server-1fc434d6/ai/grammar-check", grammarCheckHandler);
app.post("/ai/grammar-check", grammarCheckHandler);

// Lab: follow-up Q&A about grammar points (after grammar check failed)
const grammarTutorHandler = async (c: any) => {
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
};

app.post("/make-server-1fc434d6/ai/grammar-tutor", grammarTutorHandler);
app.post("/ai/grammar-tutor", grammarTutorHandler);

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
const chinglishCheckHandler = async (c: any) => {
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
};

app.post("/make-server-1fc434d6/ai/chinglish-check", chinglishCheckHandler);
app.post("/ai/chinglish-check", chinglishCheckHandler);

function parseJsonFromModel(text: string): unknown {
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

const ALLOWED_VOCAB_TAGS = [
  "#职场", "#商务", "#面试", "#邮件", "#日常", "#口语", "#写作", "#学术", "#技术",
  "#入门", "#高频", "#进阶", "#四六级", "#考研", "#雅思", "#BEC", "#托福", "#外企常用",
  "#n.", "#v.", "#adj.", "#adv.", "#prep.", "#phrase",
  "#正式", "#非正式", "#书面", "#俚语", "#固定搭配", "#易错", "#易混", "#委婉", "#负面",
  "#形近", "#义近", "#词根", "#必背",
];

const TAG_CATEGORIES: Array<{ name: string; tags: Set<string> }> = [
  { name: "scene", tags: new Set(["#职场", "#商务", "#面试", "#邮件", "#日常", "#口语", "#写作", "#学术", "#技术"]) },
  { name: "difficulty", tags: new Set(["#入门", "#高频", "#进阶", "#四六级", "#考研", "#雅思", "#BEC", "#托福", "#外企常用"]) },
  { name: "pos", tags: new Set(["#n.", "#v.", "#adj.", "#adv.", "#prep.", "#phrase"]) },
  { name: "usage", tags: new Set(["#正式", "#非正式", "#书面", "#俚语", "#固定搭配", "#易错", "#易混", "#委婉", "#负面"]) },
  { name: "memory", tags: new Set(["#形近", "#义近", "#词根", "#必背"]) },
];

type RegisterGuide = {
  anchorZh: string;
  alternatives: Array<{
    phrase: string;
    labelZh: string;
    usageZh?: string;
  }>;
  compareExamples?: {
    original: string;
    spoken: string;
  };
  pitfalls?: string[];
  coreCollocations?: string[];
  tagHints?: string[];
};

type RegisterGuideQuality = {
  passed: boolean;
  issues: string[];
};

type RegisterAnalysisStyle =
  | "formal_abstract_shift"
  | "formal_plain_shift"
  | "already_spoken"
  | "professional_or_domain"
  | "polysemous_metaphor_noun"
  | "phrase";

const POLYSEMOUS_METAPHOR_NOUN_HEADWORDS = new Set([
  "mirage",
  "illusion",
  "fantasy",
  "myth",
  "utopia",
]);

const POLYSEMOUS_METAPHOR_HINT_RE =
  /(海市蜃楼|泡影|错觉|假象|幻觉|幻象|幻想|虚幻|虚假|比喻|字面|literal|figurative|metaphor|illusion|pipe dream|fantasy|false hope|wishful thinking|unreal|not real)/i;

const POLYSEMOUS_METAPHOR_BOUNDARY_RE =
  /(海市蜃楼|泡影|错觉|假象|幻觉|幻象|幻想|字面|比喻|不只|别只|不要只|literal|figurative|not just|more than)/i;

function normalizeTagHint(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function countTagCategories(tags?: string[]): number {
  if (!tags?.length) return 0;
  const categories = new Set<string>();
  for (const rawTag of tags) {
    const tag = normalizeTagHint(rawTag);
    for (const group of TAG_CATEGORIES) {
      if (group.tags.has(tag)) categories.add(group.name);
    }
  }
  return categories.size;
}

function isPolysemousMetaphorNoun(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
}): boolean {
  const headword = input.headword.trim().toLowerCase();
  if (!headword || /\s/.test(headword)) return false;
  if (POLYSEMOUS_METAPHOR_NOUN_HEADWORDS.has(headword)) return true;

  const combined = `${input.sense} ${input.phraseForExample}`.trim().toLowerCase();
  const looksNounLike =
    /(n\.|noun|名词|概念|抽象|idea|concept|image|vision|hope|goal|dream)/i.test(combined) ||
    /(age|ion|ity|ness|ment|ism|ure|hood|ship|ance|ence)$/.test(headword);

  return looksNounLike && POLYSEMOUS_METAPHOR_HINT_RE.test(combined);
}

function buildSenseFocusHint(input: {
  headword: string;
  sense: string;
  phraseForExample?: string;
}): string {
  const explicitSense = input.sense.trim();
  if (explicitSense) {
    return `严格锁定用户指定义项：${explicitSense}`;
  }
  if (
    isPolysemousMetaphorNoun({
      headword: input.headword,
      sense: input.sense,
      phraseForExample: input.phraseForExample || input.headword,
    })
  ) {
    return `${input.headword} 同时有字面义和比喻义；若用户未额外说明，优先分析更常用于抽象表达的比喻义，不要默认写成沙漠/光学现象。`;
  }
  return "";
}

function inferRecoveryAnalysisStyle(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
}): RegisterAnalysisStyle {
  const headword = input.headword.trim().toLowerCase();
  const combined = `${input.sense} ${input.phraseForExample}`.toLowerCase();

  if (/\s/.test(headword)) return "phrase";
  if (isPolysemousMetaphorNoun(input)) return "polysemous_metaphor_noun";
  if (/(职场|商务|邮件|面试|技术|学术|office|business|email|interview|technical|academic)/.test(combined)) {
    return "professional_or_domain";
  }
  if (/(正式|书面|学术|少口语|rare in speech|formal|written|academic)/.test(combined)) {
    return /(ate|ify|ize|ise)$/.test(headword) ? "formal_abstract_shift" : "formal_plain_shift";
  }
  if (/(ly|ous|ive|ful|less|able|ible|al|ic|ary|ent|ant|y)$/.test(headword)) return "already_spoken";
  if (/(ate|ify|ize|ise)$/.test(headword)) return "formal_abstract_shift";
  return "formal_plain_shift";
}

function guessIsCommonFromStyle(style: RegisterAnalysisStyle): boolean {
  return style !== "formal_abstract_shift" && style !== "formal_plain_shift";
}

function choosePhraseForExample(input: {
  headword: string;
  style: RegisterAnalysisStyle;
  spokenAlternatives: string[];
}): string {
  const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const firstAlt = input.spokenAlternatives.find((phrase) => phrase.trim()) || input.headword;
  if (input.style === "formal_abstract_shift" || input.style === "formal_plain_shift") {
    return firstAlt;
  }
  if (input.style === "professional_or_domain" && norm(firstAlt) !== norm(input.headword)) {
    return firstAlt;
  }
  return input.headword;
}

function parseRegisterGuide(raw: unknown): RegisterGuide | undefined {
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

function mergeRegisterGuides(base?: RegisterGuide, patch?: RegisterGuide): RegisterGuide | undefined {
  if (!base && !patch) return undefined;
  const mergedAlternatives = patch?.alternatives?.length
    ? patch.alternatives
    : (base?.alternatives || []);
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

function validateRegisterGuideQuality(
  noteZh: string,
  guide?: RegisterGuide,
  context?: {
    style?: RegisterAnalysisStyle;
    headword?: string;
  },
): RegisterGuideQuality {
  const issues: string[] = [];
  const alternativesWithUsage = guide?.alternatives.filter((alt) => alt.phrase && alt.usageZh) || [];
  if (noteZh.trim().length < 10) issues.push("补一条更明确的中文总结 noteZh");
  if (!guide?.anchorZh || guide.anchorZh.trim().length < 12) issues.push("原词定位不够清楚");
  if (alternativesWithUsage.length < 2) issues.push("分档替换至少给 2 条且每条带 usageZh");
  if (!guide?.compareExamples?.original || !guide.compareExamples?.spoken) issues.push("缺少正式/口语对比例句");
  if ((guide?.pitfalls?.length ?? 0) < 1) issues.push("缺少至少 1 条避坑提示");
  if ((guide?.coreCollocations?.length ?? 0) < 2) issues.push("目标搭配至少给 2 条");
  if ((guide?.tagHints?.length ?? 0) < 2) issues.push("标签至少给 2 个");
  if (countTagCategories(guide?.tagHints) < 2) issues.push("标签需要覆盖至少 2 个类别");
  if (context?.style === "polysemous_metaphor_noun") {
    const boundaryText = [
      noteZh,
      guide?.anchorZh || "",
      ...(guide?.pitfalls || []),
      ...alternativesWithUsage.map((alt) => alt.usageZh || ""),
    ].join(" ");
    if (!POLYSEMOUS_METAPHOR_BOUNDARY_RE.test(boundaryText)) {
      issues.push("多义/比喻义名词需要点明字面义和比喻义的边界");
    }
    if (!(guide?.alternatives || []).some((alt) => /口语/.test(alt.labelZh))) {
      issues.push("多义/比喻义名词至少要给 1 条口语替换");
    }
    const originalSentence = guide?.compareExamples?.original?.toLowerCase() || "";
    const normalizedHeadword = context.headword?.trim().toLowerCase();
    if (normalizedHeadword && !originalSentence.includes(normalizedHeadword)) {
      issues.push("例句对比里的 original 句要保留原词，方便看到义项差异");
    }
  }
  return {
    passed: issues.length === 0,
    issues,
  };
}

function inferRegisterAnalysisStyle(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
  isCommonInSpokenEnglish: boolean;
}): RegisterAnalysisStyle {
  const headword = input.headword.trim().toLowerCase();
  const sense = input.sense.trim().toLowerCase();
  const phrase = input.phraseForExample.trim().toLowerCase();
  const combined = `${sense} ${phrase}`;

  if (/\s/.test(headword)) return "phrase";
  if (isPolysemousMetaphorNoun(input)) return "polysemous_metaphor_noun";
  if (/(职场|商务|邮件|面试|技术|学术|office|business|email|interview|technical|academic)/.test(combined)) {
    return "professional_or_domain";
  }
  if (input.isCommonInSpokenEnglish) return "already_spoken";
  if (/(ate|ify|ize|ise)$/.test(headword)) return "formal_abstract_shift";
  return "formal_plain_shift";
}

function buildRegisterAnalysisExample(style: RegisterAnalysisStyle): {
  styleGuidance: string;
  exampleJson: string;
} {
  switch (style) {
    case "polysemous_metaphor_noun":
      return {
        styleGuidance:
          "适合既有字面义又有比喻义的抽象名词。先锁定这张卡要讲的义项，再写口语/通用替换，明确不同替换各自强调的语义，不要把字面义和比喻义混在一起。",
        exampleJson: JSON.stringify({
          noteZh:
            "mirage 不只指海市蜃楼，更常用来比喻看似很近、其实不存在的希望；日常改写常会说 illusion 或 pipe dream。",
          spokenAlternatives: ["mirage", "illusion", "pipe dream", "fantasy"],
          registerGuide: {
            anchorZh: "mirage = 海市蜃楼；也可比喻虚幻的希望、泡影，中性偏贬义，通用（口语 + 书面都常用）。",
            alternatives: [
              { phrase: "mirage", labelZh: "日常口语", usageZh: "本词本身就能直接说，尤其适合“看似有希望、实际不存在”的比喻义。" },
              { phrase: "illusion", labelZh: "口语替代", usageZh: "最通用，强调“错觉、假象、不真实的东西”。" },
              { phrase: "pipe dream", labelZh: "参考说法", usageZh: "更地道、更口语，强调“不太可能实现的幻想”。" },
              { phrase: "fantasy", labelZh: "参考说法", usageZh: "更偏想象或幻想，弱化“看似真实却会破灭”的意味。" },
            ],
            compareExamples: {
              original: "Success proved to be a mirage.",
              spoken: "Success turned out to be just an illusion.",
            },
            pitfalls: [
              "mirage 不只指“海市蜃楼”；在比喻义里，它更常指看似很近、其实不存在的希望或目标，别和单纯的 imagination 混在一起。",
              "如果你想强调“白日梦、太不现实的幻想”，pipe dream 往往比 mirage 更口语。",
            ],
            coreCollocations: ["a mirage of success", "the mirage of prosperity", "a political mirage"],
            tagHints: ["#n.", "#进阶", "#书面", "#易混"],
          },
        }),
      };
    case "formal_abstract_shift":
      return {
        styleGuidance: "适合抽象、偏书面、容易被错误口语替换的词。重点写清楚语义核心、感情色彩和错误替换为什么错。",
        exampleJson: JSON.stringify({
          noteZh: "perpetuate 指让有害的事长期延续；口语里更接近 keep alive，不是 keep going。",
          spokenAlternatives: ["keep alive", "prop up", "maintain"],
          registerGuide: {
            anchorZh: "perpetuate = 使有害的事、观念或不公长期持续存在，极度正式，偏书面/学术语境。",
            alternatives: [
              { phrase: "keep alive", labelZh: "日常口语", usageZh: "口语里表达“让坏东西一直存在”时更自然。" },
              { phrase: "prop up", labelZh: "参考说法", usageZh: "更偏批评语气，强调硬撑着不好的东西。" },
              { phrase: "maintain", labelZh: "参考说法", usageZh: "更中性，也可用于正式说明。" },
            ],
            compareExamples: {
              original: "Stereotypes perpetuate harm.",
              spoken: "Stereotypes keep harmful attitudes alive.",
            },
            pitfalls: ["别用 keep going 或 carry on，它们更像“人继续做某事”，和 perpetuate 不是一回事。"],
            coreCollocations: ["perpetuate stereotypes", "perpetuate harm", "perpetuate inequality"],
            tagHints: ["#v.", "#正式", "#书面", "#负面"],
          },
        }),
      };
    case "professional_or_domain":
      return {
        styleGuidance: "适合职场、商务、邮件、技术等专业语境。重点写清楚什么时候保留原词，什么时候换成更随口的说法。",
        exampleJson: JSON.stringify({
          noteZh: "deadline 本身就能直接用于职场口语和邮件；更随口时也常说 due date。",
          spokenAlternatives: ["deadline", "due date", "cutoff"],
          registerGuide: {
            anchorZh: "deadline = 截止时间，职场/邮件高频词，本身就常用于口语和书面沟通。",
            alternatives: [
              { phrase: "deadline", labelZh: "日常口语", usageZh: "工作、会议、项目跟进里直接说最自然。" },
              { phrase: "due date", labelZh: "参考说法", usageZh: "更中性，适合解释时间要求。" },
              { phrase: "cutoff", labelZh: "参考说法", usageZh: "更像规则或系统里的截止点。" },
            ],
            compareExamples: {
              original: "The deadline is Friday.",
              spoken: "The due date is Friday.",
            },
            pitfalls: ["别把 deadline 一律改成 end time；很多场景里反而更不地道。"],
            coreCollocations: ["meet a deadline", "deadline is Friday", "tight deadline"],
            tagHints: ["#n.", "#职场", "#邮件", "#高频"],
          },
        }),
      };
    case "phrase":
      return {
        styleGuidance: "适合短语或 phrasal verb。重点写清楚短语本身是否已经口语高频，以及近义短语的语气区别。",
        exampleJson: JSON.stringify({
          noteZh: "follow up 本身就是高频职场口语短语；不同替换说法主要是语气轻重不同。",
          spokenAlternatives: ["follow up", "check back", "get back to"],
          registerGuide: {
            anchorZh: "follow up = 跟进、继续处理，职场沟通和邮件里都很常见，本身就适合口语。",
            alternatives: [
              { phrase: "follow up", labelZh: "日常口语", usageZh: "工作沟通里最通用、最自然。" },
              { phrase: "check back", labelZh: "参考说法", usageZh: "更像稍后再确认一次。" },
              { phrase: "get back to", labelZh: "参考说法", usageZh: "更像回复对方或回到某个问题上。" },
            ],
            compareExamples: {
              original: "I'll follow up on this tomorrow.",
              spoken: "I'll get back to you on this tomorrow.",
            },
            pitfalls: ["别把 follow up 机械换成 continue；后者缺少“跟进某件事”的语义。"],
            coreCollocations: ["follow up on this", "follow up with someone", "quick follow-up"],
            tagHints: ["#phrase", "#职场", "#邮件", "#高频"],
          },
        }),
      };
    case "already_spoken":
      return {
        styleGuidance: "适合本身就能直接说的常用词。不要硬制造正式/口语对立，要写成“本身可直接说 + 更自然的变体/重说法”。",
        exampleJson: JSON.stringify({
          noteZh: "helpful 本身就能直接用于口语；想更自然也常说 really useful 或 a big help。",
          spokenAlternatives: ["helpful", "really useful", "a big help"],
          registerGuide: {
            anchorZh: "helpful = 有帮助的，本身就是高频口语词，中性通用。",
            alternatives: [
              { phrase: "helpful", labelZh: "日常口语", usageZh: "本身就很自然，直接说即可。" },
              { phrase: "really useful", labelZh: "参考说法", usageZh: "更像随口评价工具、建议或信息。" },
              { phrase: "a big help", labelZh: "参考说法", usageZh: "更像口语里总结帮助或表达感谢。" },
            ],
            compareExamples: {
              original: "Your feedback was helpful.",
              spoken: "Your feedback was a big help.",
            },
            pitfalls: ["别为了显得高级硬换成 assistive 或 beneficial，日常交流里反而更别扭。"],
            coreCollocations: ["helpful advice", "helpful feedback", "be helpful"],
            tagHints: ["#adj.", "#高频", "#口语"],
          },
        }),
      };
    case "formal_plain_shift":
    default:
      return {
        styleGuidance: "适合正式但不算特别抽象的单词。重点写清楚口语里更常换成哪个更朴素的词。",
        exampleJson: JSON.stringify({
          noteZh: "utilize 在口语里通常直接换成 use；保留原词时会显得更正式、更书面。",
          spokenAlternatives: ["use", "make use of", "employ"],
          registerGuide: {
            anchorZh: "utilize = 使用，语义不复杂，但语体偏正式，常见于书面、商务或学术表达。",
            alternatives: [
              { phrase: "use", labelZh: "日常口语", usageZh: "日常交流里最自然、最不费力。" },
              { phrase: "make use of", labelZh: "参考说法", usageZh: "比 use 稍正式一点，但仍常见。" },
              { phrase: "employ", labelZh: "参考说法", usageZh: "更偏正式说明，常见于商务或学术。" },
            ],
            compareExamples: {
              original: "We utilize AI to improve the workflow.",
              spoken: "We use AI to improve the workflow.",
            },
            pitfalls: ["口语里别为了显得高级硬用 utilize，大多数场景直接说 use 更自然。"],
            coreCollocations: ["utilize resources", "utilize data", "utilize AI"],
            tagHints: ["#v.", "#正式", "#书面", "#进阶"],
          },
        }),
      };
  }
}

function applyRegisterGuardrails(input: {
  headword: string;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
}): {
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
} {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const headword = norm(input.headword);
  const phrase = norm(input.phraseForExample);
  const badContinuationPhrases = new Set(["keep going", "carry on", "keep it up", "continue"]);

  if (headword === "perpetuate" && badContinuationPhrases.has(phrase)) {
    return {
      phraseForExample: "keep alive",
      spokenAlternatives: ["keep alive", "prop up", "maintain"],
      writtenSupplement: input.writtenSupplement || input.headword,
      noteZh: "perpetuate 指让有害的事长期延续；口语里更接近 keep alive，不是 keep going。",
      registerGuide: {
        anchorZh: "perpetuate = 使有害的事、观念或不公长期持续存在，极度正式，偏书面/学术语境。",
        alternatives: [
          { phrase: "keep alive", labelZh: "日常口语", usageZh: "口语里表达“让坏东西一直存在”时更自然。" },
          { phrase: "prop up", labelZh: "参考说法", usageZh: "更偏批评语气，强调硬撑着不好的东西。" },
          { phrase: "maintain", labelZh: "参考说法", usageZh: "更中性，也可用于正式说明。" },
        ],
        compareExamples: {
          original: "Stereotypes perpetuate harm.",
          spoken: "Stereotypes keep harmful attitudes alive.",
        },
        pitfalls: [
          "别用 keep going 或 carry on，它们更像“人继续做某事”，和 perpetuate 不是一回事。",
        ],
        coreCollocations: ["perpetuate stereotypes", "perpetuate harm", "perpetuate inequality"],
        tagHints: ["#v.", "#正式", "#书面", "#负面"],
      },
    };
  }

  return {
    phraseForExample: input.phraseForExample,
    spokenAlternatives: input.spokenAlternatives,
    writtenSupplement: input.writtenSupplement,
    noteZh: input.noteZh,
    registerGuide: input.registerGuide,
  };
}

async function enrichRegisterGuide(input: {
  headword: string;
  sense: string;
  phraseForExample: string;
  spokenAlternatives: string[];
  isCommonInSpokenEnglish: boolean;
  writtenSupplement: string | null;
  model: string;
  retryReasons?: string[];
  currentNoteZh?: string;
  currentGuide?: RegisterGuide;
  attempt?: number;
}): Promise<{
  noteZh: string;
  spokenAlternatives: string[];
  registerGuide?: RegisterGuide;
}> {
  const style = inferRegisterAnalysisStyle(input);
  const { styleGuidance, exampleJson } = buildRegisterAnalysisExample(style);
  const senseFocusHint = buildSenseFocusHint(input);
  const systemPrompt =
    "You write dense, practical register analysis for Chinese ESL learners making vocab cards.\n\n" +
    "Your job is to turn one word/phrase into a COMPLETE learning note, not a vague explanation.\n" +
    "Every output must be detailed enough to render these sections well:\n" +
    "1. 原词定位\n" +
    "2. 分档替换\n" +
    "3. 例句对比\n" +
    "4. 避坑提示\n" +
    "5. 目标搭配\n\n" +
    "Rules:\n" +
    "- Be semantically exact. Never give a casual replacement if the meaning drifts.\n" +
    "- If the learner word is already natural in spoken English, say so clearly, but STILL give useful analysis and at least 2 alternatives or rephrasings with usage notes.\n" +
    "- If the learner word has both literal and figurative senses, LOCK the target sense first. Say whether this card focuses on the figurative/common use, and warn against mixing literal and figurative meanings.\n" +
    "- alternatives must have 2 to 4 items, and EVERY item must include usageZh.\n" +
    "- compareExamples.original and compareExamples.spoken must describe the same situation and same meaning; only wording/register changes.\n" +
    "- pitfalls must contain at least 1 concrete warning in Chinese.\n" +
    "- coreCollocations must contain 2 to 4 high-value collocations of the learner word.\n" +
    "- tagHints must contain 2 to 4 tags from AT LEAST 2 different categories. Do not return only #正式 or only one category.\n" +
    "- Prefer this mix when possible: 1 词性 tag + 1 用法/语域 tag + 1 难度/场景 tag.\n" +
    "- tagHints must only use tags from this exact allowlist: " + ALLOWED_VOCAB_TAGS.join(", ") + ".\n" +
    (senseFocusHint ? "- Sense focus for this card: " + senseFocusHint + "\n" : "") +
    "- Follow the closest template style for this word type: " + styleGuidance + "\n\n" +
    "Reference example (learn the density and structure, do not copy the wording):\n" +
    exampleJson + "\n\n" +
    "Respond ONLY with valid JSON:\n" +
    "{\n" +
    '  "noteZh": "一句中文，总结这个词在口语里该怎么处理",\n' +
    '  "spokenAlternatives": ["2 to 4 alternatives, most natural first"],\n' +
    '  "registerGuide": {\n' +
    '    "anchorZh": "一句中文，精确锚定原词义 + 语域",\n' +
    '    "alternatives": [\n' +
    '      {"phrase": "wording", "labelZh": "日常口语 / 参考说法 / 中性通用 / 正式书面", "usageZh": "一句中文说明"}\n' +
    '    ],\n' +
    '    "compareExamples": {"original": "sentence with learner wording", "spoken": "same meaning in more natural wording"},\n' +
    '    "pitfalls": ["中文避坑提醒"],\n' +
    '    "coreCollocations": ["collocation 1", "collocation 2"],\n' +
    '    "tagHints": ["#v.", "#正式"]\n' +
    '  }\n' +
    "}";

  const userPrompt =
    "Learner target: \"" + input.headword + "\"" +
    (input.sense ? "\nSense note: " + input.sense : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
    "\nInferred analysis style: " + style +
    "\nChosen spoken practice phrase: \"" + input.phraseForExample + "\"" +
    "\nIs common in spoken English: " + (input.isCommonInSpokenEnglish ? "true" : "false") +
    "\nCurrent spoken alternatives: " + JSON.stringify(input.spokenAlternatives) +
    (input.writtenSupplement ? "\nWritten supplement: " + input.writtenSupplement : "") +
    (input.currentNoteZh ? "\nCurrent noteZh draft: " + input.currentNoteZh : "") +
    (input.currentGuide ? "\nCurrent registerGuide draft: " + JSON.stringify(input.currentGuide) : "") +
    (input.retryReasons?.length
      ? "\nCurrent draft problems that MUST be fixed: " + input.retryReasons.join("；")
      : "") +
    "\nAttempt: " + String(input.attempt || 1) +
    "\nReturn JSON only.";

  try {
    const result = await callDeepSeek(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      0.2,
      1200,
      input.model,
    );
    const raw = parseJsonFromModel(result) as Record<string, unknown>;
    const noteZh = String(raw.noteZh || "").trim();
    const spokenAlternatives = Array.isArray(raw.spokenAlternatives)
      ? (raw.spokenAlternatives as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : input.spokenAlternatives;
    const registerGuide = parseRegisterGuide(raw.registerGuide);
    return {
      noteZh,
      spokenAlternatives: spokenAlternatives.length ? spokenAlternatives : input.spokenAlternatives,
      registerGuide,
    };
  } catch (e) {
    console.log(`enrichRegisterGuide failed: ${e}`);
    return {
      noteZh: "",
      spokenAlternatives: input.spokenAlternatives,
      registerGuide: undefined,
    };
  }
}

async function recoverSpokenRegisterAfterParseFailure(input: {
  headword: string;
  sense: string;
  model: string;
  rawResult: string;
}): Promise<{
  isCommonInSpokenEnglish: boolean;
  phraseForExample: string;
  spokenAlternatives: string[];
  writtenSupplement: string | null;
  noteZh: string;
  registerGuide?: RegisterGuide;
}> {
  const style = inferRecoveryAnalysisStyle({
    headword: input.headword,
    sense: input.sense,
    phraseForExample: input.headword,
  });
  const isCommon = guessIsCommonFromStyle(style);
  let finalAlternatives = [input.headword];
  let finalNoteZh = "";
  let finalRegisterGuide: RegisterGuide | undefined;
  let quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
    style,
    headword: input.headword,
  });

  for (let attempt = 1; attempt <= 3 && !quality.passed; attempt += 1) {
    const enriched = await enrichRegisterGuide({
      headword: input.headword,
      sense: input.sense,
      phraseForExample: input.headword,
      spokenAlternatives: finalAlternatives,
      isCommonInSpokenEnglish: isCommon,
      writtenSupplement: null,
      model: input.model,
      retryReasons: [
        "首轮语体判断响应无法解析成 JSON，请直接返回完整 JSON",
        ...quality.issues,
      ],
      currentNoteZh: finalNoteZh,
      currentGuide: finalRegisterGuide,
      attempt,
    });
    if (enriched.noteZh.trim()) finalNoteZh = enriched.noteZh.trim();
    if (enriched.spokenAlternatives.length) {
      finalAlternatives = uniqueStrings([...enriched.spokenAlternatives, ...finalAlternatives]);
    }
    finalRegisterGuide = mergeRegisterGuides(finalRegisterGuide, enriched.registerGuide);
    quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
      style,
      headword: input.headword,
    });
  }

  const phraseForExample = choosePhraseForExample({
    headword: input.headword,
    style,
    spokenAlternatives: finalAlternatives,
  });
  const norm = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const writtenSupplement = !isCommon && norm(phraseForExample) !== norm(input.headword)
    ? input.headword
    : null;

  return {
    isCommonInSpokenEnglish: isCommon,
    phraseForExample,
    spokenAlternatives: finalAlternatives,
    writtenSupplement,
    noteZh: finalNoteZh,
    registerGuide: finalRegisterGuide,
  };
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
  registerGuide?: RegisterGuide;
}> {
  const systemPrompt =
    "You help Chinese ESL learners choose natural SPOKEN English. The learner will type an English word or short phrase they want to practice.\n\n" +
    "Judge whether their target is commonly used in everyday casual conversation (with friends, family, coworkers in informal talk), " +
    "or is mainly written, academic, literary, legal, medical jargon in print, or otherwise rare in speech.\n\n" +
    "Your output must be semantically precise. NEVER suggest a spoken replacement that changes the core meaning, subject type, sentiment, or argument structure.\n" +
    "If there is no truly equivalent casual replacement, keep the learner's wording as the spoken phrase.\n\n" +
    "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
    "{\n" +
    '  "isCommonInSpokenEnglish": true or false,\n' +
    '  "phraseForExample": "string — the ONE wording to use in a single spoken example sentence. If isCommonInSpokenEnglish is true, use the learner\'s wording (fix only capitalization). If false, pick the most natural thing natives say in speech (simple word, phrasal verb, or idiom like \\"runs in the family\\"); do NOT force the formal word into the example.",\n' +
    '  "spokenAlternatives": ["2 to 4 alternatives, most natural first"],\n' +
    '  "writtenSupplement": "string or null — if you chose phraseForExample different from the learner\'s input because theirs is formal/rare in speech, put THEIR original word/phrase here as the \\"written/academic\\" label; otherwise null.",\n' +
    '  "noteZh": "one short sentence in Chinese: why phraseForExample fits spoken English better when you switched, or confirm it is already colloquial.",\n' +
    '  "registerGuide": {\n' +
    '    "anchorZh": "一句中文，精确锚定原词义 + 语域，比如：perpetuate = 使有害的事长期持续存在，极度正式，仅书面/学术用",\n' +
    '    "alternatives": [\n' +
    '      {\n' +
    '        "phrase": "spoken or neutral wording",\n' +
    '        "labelZh": "日常口语 / 中性通用 / 正式书面",\n' +
    '        "usageZh": "一句中文说明这个替换的场景与语气"\n' +
    '      }\n' +
    '    ],\n' +
    '    "compareExamples": {\n' +
    '      "original": "one short sentence using the learner original wording",\n' +
    '      "spoken": "one short sentence using the spoken replacement, same situation and same meaning"\n' +
    '    },\n' +
    '    "pitfalls": ["1 to 2 条中文避坑提醒，指出不能乱换的表达"],\n' +
    '    "coreCollocations": ["2 to 4 core collocations of the learner original wording"],\n' +
    '    "tagHints": ["从允许标签中选 2 到 4 个，比如 #v. #正式 #学术 #书面"]\n' +
    '  }\n' +
    "}\n\n" +
    "Rules:\n" +
    "- phraseForExample must be a single chunk you can embed in one short sentence (not a list).\n" +
    "- spokenAlternatives must include phraseForExample first or mirror the same ideas.\n" +
    "- If the learner's term is already fine for speaking, set isCommonInSpokenEnglish true and phraseForExample to their term.\n" +
    "- compareExamples.original and compareExamples.spoken must describe the same event or claim; only wording/register changes.\n" +
    "- If the learner word has literal and figurative senses, lock the target sense in anchorZh/pitfalls and do not mix replacements from different senses.\n" +
    "- If phraseForExample differs from the learner target, pitfalls should explain common wrong replacements when relevant.\n" +
    "- tagHints must contain 2 to 4 tags from AT LEAST 2 different categories. Do not return only #正式 or only one category.\n" +
    "- Prefer this mix when possible: 1 词性 tag + 1 用法/语域 tag + 1 难度/场景 tag.\n" +
    "- tagHints must only use tags from this exact allowlist: " + ALLOWED_VOCAB_TAGS.join(", ") + ".";
  const senseFocusHint = buildSenseFocusHint({
    headword,
    sense,
    phraseForExample: headword,
  });

  const userContent =
    "Learner target: \"" + headword + "\"" +
    (sense ? "\nSense / context note: " + sense : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
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
    const registerGuide = parseRegisterGuide(raw.registerGuide);
    let writtenSupplement = raw.writtenSupplement != null && String(raw.writtenSupplement).trim()
      ? String(raw.writtenSupplement).trim()
      : null;
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    if (!writtenSupplement && norm(phraseForExample) !== norm(headword)) {
      writtenSupplement = headword;
    }
    const guarded = applyRegisterGuardrails({
      headword,
      phraseForExample,
      spokenAlternatives: alts.length ? alts : [phraseForExample],
      writtenSupplement,
      noteZh,
      registerGuide,
    });
    let finalNoteZh = guarded.noteZh;
    let finalAlternatives = guarded.spokenAlternatives;
    let finalRegisterGuide = guarded.registerGuide;
    const analysisStyle = inferRegisterAnalysisStyle({
      headword,
      sense,
      phraseForExample: guarded.phraseForExample,
      isCommonInSpokenEnglish: isCommon,
    });
    let quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
      style: analysisStyle,
      headword,
    });

    for (let attempt = 1; attempt <= 2 && !quality.passed; attempt += 1) {
      const enriched = await enrichRegisterGuide({
        headword,
        sense,
        phraseForExample: guarded.phraseForExample,
        spokenAlternatives: finalAlternatives,
        isCommonInSpokenEnglish: isCommon,
        writtenSupplement: guarded.writtenSupplement,
        model,
        retryReasons: quality.issues,
        currentNoteZh: finalNoteZh,
        currentGuide: finalRegisterGuide,
        attempt,
      });
      if (enriched.noteZh.trim()) finalNoteZh = enriched.noteZh.trim();
      if (enriched.spokenAlternatives.length) {
        finalAlternatives = uniqueStrings([...enriched.spokenAlternatives, ...finalAlternatives]);
      }
      finalRegisterGuide = mergeRegisterGuides(finalRegisterGuide, enriched.registerGuide);
      quality = validateRegisterGuideQuality(finalNoteZh, finalRegisterGuide, {
        style: analysisStyle,
        headword,
      });
    }
    return {
      isCommonInSpokenEnglish: isCommon,
      phraseForExample: guarded.phraseForExample,
      spokenAlternatives: finalAlternatives,
      writtenSupplement: guarded.writtenSupplement,
      noteZh: finalNoteZh,
      registerGuide: finalRegisterGuide,
    };
  } catch (e) {
    console.log(`assessSpokenRegister parse failed: ${e} raw=${result.slice(0, 300)}`);
    return recoverSpokenRegisterAfterParseFailure({
      headword,
      sense,
      model,
      rawResult: result,
    });
  }
}

/** 当主生成只返回一条时，单独补一条「原词在日常里怎么说」 */
async function generateOriginalDailyFallbackItem(
  headword: string,
  sense: string,
  colLines: string,
  model: string,
): Promise<{
  sentence: string;
  collocationsUsed: string[];
  chinese?: string;
} | null> {
  const senseFocusHint = buildSenseFocusHint({
    headword,
    sense,
    phraseForExample: headword,
  });
  const systemPrompt =
    "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
    "TASK: Write ONE short natural English sentence for real life.\n\n" +
    "The learner wants their ORIGINAL word or phrase used in a believable everyday moment " +
    "(chatting, texting, explaining to a friend, casual work talk, commenting on something they read or watched — " +
    "NOT essay or exam style).\n\n" +
    "The sentence MUST naturally include this learner wording (same surface form; inflections only if grammar requires): \"" +
    headword + "\"" +
    (sense ? "\nSense note: " + sense : "") + "\n\n" +
    (senseFocusHint ? "Sense focus: " + senseFocusHint + "\n\n" : "") +
    "Use AT LEAST ONE collocation from the whitelist below (verbatim phrase appearing in the sentence).\n\n" +
    "COLLOCATION WHITELIST:\n" + colLines + "\n\n" +
    "Respond ONLY with valid JSON (no markdown, no code fences):\n" +
    "{\n" +
    "  \"sentence\": \"English sentence\",\n" +
    "  \"collocationsUsed\": [\"phrase from whitelist used in sentence\"],\n" +
    "  \"chinese\": \"该句中文释义\"\n" +
    "}\n\n" +
    "Rules: usually 8-16 words; conversational; contractions OK when natural; one clear main clause preferred.";

  const userContent =
    "Learner original wording: \"" + headword + "\"" +
    (sense ? "\nSense: " + sense : "") +
    (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
    "\nReturn JSON only.";

  try {
    const result = await callDeepSeek(
      [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
      0.35,
      1024,
      model,
    );
    const parsed = parseJsonFromModel(result) as {
      sentence?: string;
      collocationsUsed?: unknown;
      chinese?: string;
    };
    const sentence = String(parsed?.sentence || "").trim();
    if (!sentence) return null;
    const collocationsUsed = Array.isArray(parsed?.collocationsUsed)
      ? (parsed.collocationsUsed as unknown[]).map((x) => String(x))
      : [];
    return {
      sentence,
      collocationsUsed,
      chinese: String(parsed?.chinese || "").trim() || undefined,
    };
  } catch (e) {
    console.log(`generateOriginalDailyFallbackItem failed: ${e}`);
    return null;
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
    const senseFocusHint = buildSenseFocusHint({
      headword,
      sense,
      phraseForExample: phraseForSentence,
    });

    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const needOriginalDailySentence = norm(headword) !== norm(phraseForSentence);

    const colLines = collocations.slice(0, 35).map((x: any) =>
      typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`
    ).join("\n");

    const dualSentenceBlock = needOriginalDailySentence
      ? "\n\nDUAL OUTPUT REQUIRED:\n" +
        "The learner typed \"" + headword + "\" but the spoken practice target is \"" + phraseForSentence +
        "\" (more colloquial for speech).\n" +
        "You MUST return exactly TWO objects in \"items\", in this order:\n" +
        "- items[0]: One everyday spoken sentence built around the SPOKEN target \"" + phraseForSentence +
        "\" (same style rules as below).\n" +
        "- items[1]: One short sentence showing how the learner's ORIGINAL wording \"" + headword +
        "\" can still appear in everyday life (chatting, texting, explaining to a friend, casual work talk, commenting on something you read or watched — believable daily moments, not essay style). " +
        "items[1] MUST naturally include \"" + headword + "\" (same surface form as learner input; inflections only if grammar requires).\n" +
        "BOTH items must each use AT LEAST ONE collocation from the whitelist (verbatim phrase appearing in that sentence).\n"
      : "";

    const itemCountRule = needOriginalDailySentence
      ? "- Return exactly TWO objects in \"items\", in the order above.\n"
      : "- Return exactly ONE object in \"items\".\n";

    const systemPrompt =
      "You are a daily English speaking coach for Chinese ESL learners.\n\n" +
      "TASK: Write short, natural English sentence(s) for real life (work, home, friends, errands — NOT exam prompts).\n\n" +
      dualSentenceBlock +
      "Each sentence MUST:\n" +
      "1) For items[0] only: naturally include this spoken target (inflections OK): \"" + phraseForSentence + "\"" +
      (sense ? "\n   (Learner sense note: " + sense + ")" : "") + "\n" +
      "2) Use AT LEAST ONE collocation from the whitelist below in EACH sentence you output (verbatim phrase as written).\n\n" +
      "Learner originally typed: \"" + headword + "\".\n\n" +
      (senseFocusHint ? "Resolved sense focus: " + senseFocusHint + "\n\n" : "") +
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
      itemCountRule +
      "- Sentence length should usually be 8-16 words each; avoid very long or multi-clause sentences.\n" +
      "- Prefer one clear main clause; at most one simple subordinate clause per sentence.\n" +
      "- Prefer conversational wording and contractions when natural (I'm, it's, don't, can't).\n" +
      "- Do NOT frame as an answer to a test question; standalone real-life lines.\n" +
      "- collocationsUsed must be non-empty for each item; phrases must appear in the sentence naturally.\n" +
      "- Avoid awkward literal translation style.\n" +
      "- Do NOT include questionId or tags.";

    const userContent =
      "Spoken practice target: \"" + phraseForSentence + "\"\nOriginal learner input: \"" + headword + "\"" +
      (sense ? "\nSense note: " + sense : "") +
      (senseFocusHint ? "\nSense focus guidance: " + senseFocusHint : "") +
      (needOriginalDailySentence ? "\nReturn two items: [0] spoken target sentence, [1] original wording in daily use." : "") +
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

    const mapItem = (it: any) => {
      const sentence = String(it?.sentence || "").trim();
      const collocationsUsed = Array.isArray(it?.collocationsUsed)
        ? it.collocationsUsed.map((x: any) => String(x))
        : [];
      return {
        sentence,
        collocationsUsed,
        chinese: String(it?.chinese || "").trim() || undefined,
      };
    };

    const first = rawItems.find((it: any) => it && String(it.sentence || "").trim());
    if (!first) {
      return c.json({ error: "AI returned no valid items" }, 500);
    }

    const itemsOut = [mapItem(first)];

    if (needOriginalDailySentence && rawItems.length > 1) {
      const second = rawItems[1];
      if (second && String(second.sentence || "").trim()) {
        itemsOut.push(mapItem(second));
      }
    }

    if (needOriginalDailySentence && itemsOut.length < 2) {
      const fb = await generateOriginalDailyFallbackItem(headword, sense, colLines, vocabModel);
      if (fb) itemsOut.push(fb);
    }

    return c.json({
      headword,
      sense: sense || undefined,
      spokenPracticePhrase: phraseForSentence,
      isCommonInSpokenEnglish: reg.isCommonInSpokenEnglish,
      spokenAlternatives: reg.spokenAlternatives,
      writtenSupplement: reg.writtenSupplement,
      registerNoteZh: reg.noteZh || undefined,
      registerGuide: reg.registerGuide,
      items: itemsOut,
    });
  } catch (err) {
    console.log(`Error in vocab-card: ${err}`);
    return c.json({ error: `Vocab card generation failed: ${err}` }, 500);
  }
};

/** 仅生成「原词·日常」单句：用于旧卡一键补充 */
const vocabCardOriginalDailyHandler = async (c: any) => {
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
    const colLines = collocations.slice(0, 35).map((x: any) =>
      typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`
    ).join("\n");

    const item = await generateOriginalDailyFallbackItem(headword, sense, colLines, vocabModel);
    if (!item) {
      return c.json({ error: "Failed to generate original-daily sentence" }, 500);
    }
    return c.json({ item });
  } catch (err) {
    console.log(`Error in vocab-card-original-daily: ${err}`);
    return c.json({ error: `Vocab card original-daily failed: ${err}` }, 500);
  }
};

/** 仅补全语体解析：用于旧卡或空白解析卡片补全 */
const vocabCardRegisterGuideHandler = async (c: any) => {
  try {
    const body = await c.req.json();
    const headword = String(body.headword || "").trim();
    const sense = String(body.sense || "").trim();

    if (!headword) {
      return c.json({ error: "headword is required" }, 400);
    }

    const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
    const reg = await assessSpokenRegister(headword, sense, vocabModel);

    return c.json({
      headword,
      sense: sense || undefined,
      spokenPracticePhrase: reg.phraseForExample,
      isCommonInSpokenEnglish: reg.isCommonInSpokenEnglish,
      spokenAlternatives: reg.spokenAlternatives,
      writtenSupplement: reg.writtenSupplement,
      registerNoteZh: reg.noteZh || undefined,
      registerGuide: reg.registerGuide,
    });
  } catch (err) {
    console.log(`Error in vocab-card-register-guide: ${err}`);
    return c.json({ error: `Vocab card register-guide failed: ${err}` }, 500);
  }
};

app.post("/make-server-1fc434d6/ai/vocab-card", vocabCardHandler);
// 部分网关只把 `/ai/...` 传给函数体，注册别名避免 404
app.post("/ai/vocab-card", vocabCardHandler);

app.post("/make-server-1fc434d6/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
app.post("/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
app.post("/make-server-1fc434d6/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);
app.post("/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);

Deno.serve(app.fetch);
