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

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-1fc434d6/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== Auth Routes ==========

app.post("/make-server-1fc434d6/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "email and password are required" }, 400);
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
    const { corpus, errorBank, stuckPoints, learnedCollocations } = body;

    const prefix = `ffu_${userId}`;

    await kv.mset(
      [`${prefix}_corpus`, `${prefix}_errors`, `${prefix}_stuck`, `${prefix}_learned`],
      [corpus || [], errorBank || [], stuckPoints || [], learnedCollocations || []],
    );

    console.log(
      `Data saved for user: ${userId}, corpus: ${(corpus || []).length}, errors: ${(errorBank || []).length}`,
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

    const prefix = `ffu_${userId}`;

    const [corpus, errorBank, stuckPoints, learnedCollocations] = await kv.mget([
      `${prefix}_corpus`,
      `${prefix}_errors`,
      `${prefix}_stuck`,
      `${prefix}_learned`,
    ]);

    console.log(`Data loaded for user: ${userId}`);

    return c.json({
      corpus: corpus || [],
      errorBank: errorBank || [],
      stuckPoints: stuckPoints || [],
      learnedCollocations: learnedCollocations || [],
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
): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured on server");

  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature,
      max_tokens: 1024,
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
      "You are an English grammar checker for Chinese ESL learners. Your task is to check if a sentence correctly uses the collocation \"" + collocation + "\".\n\nRespond ONLY with valid JSON (no markdown, no code blocks). Use this exact format:\n{\n  \"isCorrect\": true/false,\n  \"errors\": [\n    {\n      \"type\": \"grammar_type\",\n      \"description\": \"Description in Chinese of the error\",\n      \"hint\": \"Hint in Chinese on how to fix it (do NOT give the corrected sentence directly)\",\n      \"grammarPoint\": \"Grammar concept name in Chinese\"\n    }\n  ],\n  \"overallHint\": \"Overall hint in Chinese (empty string if correct)\"\n}\n\nRules:\n- Check grammar, tense, articles, prepositions, punctuation, capitalization, subject-verb agreement, word order\n- Check if the collocation \"" + collocation + "\" is used correctly and naturally\n- Sentence must start with capital letter and end with . ! or ?\n- First person pronoun must be uppercase \"I\"\n- If the sentence is too short (fewer than 4 words), flag it as incomplete\n- Descriptions and hints must be in Chinese\n- Do NOT provide the corrected sentence - only hints to guide the learner\n- Be strict but fair - the goal is to help learners improve";

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

Deno.serve(app.fetch);

