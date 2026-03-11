import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Helper: extract userId from auth token
async function getUserId(c: any): Promise<string | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
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
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
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
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
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

// Save all user data (uses auth userId)
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
      [corpus || [], errorBank || [], stuckPoints || [], learnedCollocations || []]
    );

    console.log(`Data saved for user: ${userId}, corpus: ${(corpus || []).length}, errors: ${(errorBank || []).length}`);

    return c.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.log(`Error saving sync data: ${err}`);
    return c.json({ error: `Failed to save data: ${err}` }, 500);
  }
});

// Load all user data
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
      console.log("Azure Speech credentials missing - AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set");
      return c.json({ error: "Azure Speech credentials not configured on server" }, 500);
    }

    // Fetch token from Azure
    const tokenUrl = `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
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
      return c.json({ error: `Azure token request failed: ${tokenResp.status}` }, 500);
    }

    const token = await tokenResp.text();

    console.log(`Azure Speech token issued successfully for region: ${speechRegion}`);
    return c.json({ token, region: speechRegion });
  } catch (err) {
    console.log(`Error fetching Azure Speech token: ${err}`);
    return c.json({ error: `Failed to get speech token: ${err}` }, 500);
  }
});

// ========== DeepSeek AI Routes ==========

// Helper: call DeepSeek chat completion
async function callDeepSeek(messages: Array<{ role: string; content: string }>, temperature = 0.3): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not configured on server");
  }

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

    const systemPrompt = `You are an English grammar checker for Chinese ESL learners. Your task is to check if a sentence correctly uses the collocation "${collocation}".

Respond ONLY with valid JSON (no markdown, no code blocks). Use this exact format:
{
  "isCorrect": true/false,
  "errors": [
    {
      "type": "grammar_type",
      "description": "Description in Chinese of the error",
      "hint": "Hint in Chinese on how to fix it (do NOT give the corrected sentence directly)",
      "grammarPoint": "Grammar concept name in Chinese"
    }
  ],
  "overallHint": "Overall hint in Chinese (empty string if correct)"
}

Rules:
- Check grammar, tense, articles, prepositions, punctuation, capitalization, subject-verb agreement, word order
- Check if the collocation "${collocation}" is used correctly and naturally
- Sentence must start with capital letter and end with . ! or ?
- First person pronoun must be uppercase "I"
- If the sentence is too short (fewer than 4 words), flag it as incomplete
- Descriptions and hints must be in Chinese
- Do NOT provide the corrected sentence - only hints to guide the learner
- Be strict but fair - the goal is to help learners improve`;

    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please check this sentence: "${sentence}"\nTarget collocation: "${collocation}"` },
    ]);

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.log(`Failed to parse DeepSeek grammar response: ${result}`);
      return c.json({ error: "Failed to parse AI response" }, 500);
    }

    console.log(`Grammar check for "${collocation}": isCorrect=${parsed.isCorrect}, errors=${parsed.errors?.length || 0}`);
    return c.json(parsed);
  } catch (err) {
    console.log(`Error in grammar check: ${err}`);
    return c.json({ error: `Grammar check failed: ${err}` }, 500);
  }
});

// Stuck suggestion for Field
app.post("/make-server-1fc434d6/ai/stuck-suggest", async (c) => {
  try {
    const { chineseThought, corpusSentences, verbCollocations } = await c.req.json();

    if (!chineseThought) {
      return c.json({ error: "chineseThought is required" }, 400);
    }

    // Build context about user's corpus
    const corpusContext = (corpusSentences || []).slice(0, 20).map(
      (s: any) => `- "${s.userSentence}" (collocation: ${s.collocation})`
    ).join("\n");

    // Build verb library context
    const verbContext = (verbCollocations || []).slice(0, 30).map(
      (v: any) => `- ${v.phrase} (${v.meaning})`
    ).join("\n");

    const systemPrompt = `You are an English speaking coach for Chinese ESL learners using a "core verb + collocation" learning method. The learner is stuck during an IELTS speaking practice and tells you what they want to say in Chinese.

Your job is to help them express the idea using simple English with core verbs (get, make, take, keep, give, put, set, go, come, do, etc.).

Follow this three-layer strategy:
1. FIRST check if the learner's personal corpus has a relevant sentence they can adapt. If found, return type "corpus".
2. If not in corpus, check the verb collocation library for relevant collocations. If found, return type "verb".
3. If neither matches, suggest a simple paraphrase using core verbs. Return type "paraphrase".

Learner's personal corpus:
${corpusContext || "(empty)"}

Available verb collocations:
${verbContext || "(none provided)"}

Respond ONLY with valid JSON (no markdown):
{
  "type": "corpus" | "verb" | "paraphrase",
  "suggestion": "Your suggestion in mixed Chinese/English, explaining how to express the idea. Include example sentences. Use emoji for visual clarity."
}

Keep your suggestion concise, practical, and encouraging.`;

    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: `我想表达：${chineseThought}` },
    ], 0.5);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.log(`Failed to parse DeepSeek stuck response: ${result}`);
      // Fallback
      parsed = { type: "paraphrase", suggestion: result };
    }

    console.log(`Stuck suggestion for "${chineseThought}": type=${parsed.type}`);
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

    const systemPrompt = `You are an IELTS speaking examiner and English coach. Evaluate the learner's spoken answer to an IELTS Part ${part || 2} question.

Focus on:
1. Fluency & Coherence (0-100)
2. Grammar Range & Accuracy (0-100)
3. Vocabulary (especially use of core verbs like get, make, take, keep, give, etc.) (0-100)
4. Overall score (average of above three)

Identify which core verbs (get, take, make, do, have, go, set, keep, give, put, come, see, know, think, find, tell, ask, work, feel, need) were used.

Respond ONLY with valid JSON (no markdown):
{
  "score": 75,
  "fluency": 70,
  "grammar": 80,
  "vocabulary": 75,
  "verbsUsed": ["get", "make"],
  "feedback": [
    "Chinese feedback point 1",
    "Chinese feedback point 2",
    "Chinese feedback point 3"
  ]
}

Feedback should be in Chinese, 3-5 points, specific and actionable. Be encouraging but honest.`;

    const result = await callDeepSeek([
      { role: "system", content: systemPrompt },
      { role: "user", content: `IELTS Question: "${question}"\n\nMy answer: "${answer}"` },
    ], 0.4);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.log(`Failed to parse DeepSeek evaluation response: ${result}`);
      return c.json({ error: "Failed to parse AI evaluation" }, 500);
    }

    console.log(`Evaluation for Part ${part}: score=${parsed.score}`);
    return c.json(parsed);
  } catch (err) {
    console.log(`Error in answer evaluation: ${err}`);
    return c.json({ error: `Evaluation failed: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);