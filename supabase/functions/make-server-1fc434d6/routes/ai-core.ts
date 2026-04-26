import type { Hono } from "npm:hono";
import { callDeepSeek, parseJsonFromModel } from "./ai-shared.ts";

export function registerCoreAiRoutes(app: Hono) {
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
          content: `Please check this sentence: "${sentence}"\nTarget collocation: "${collocation}"`,
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
            `- Keep the exact target collocation unchanged: "${collocation}".\n` +
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
                  `Original sentence: "${sentence}"\n` +
                  `Target collocation: "${collocation}"\n` +
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

      return c.json({ isCorrect, correctedSentence, errors, overallHint });
    } catch (err) {
      console.log(`Error in grammar check: ${err}`);
      return c.json({ error: `Grammar check failed: ${err}` }, 500);
    }
  };

  app.post("/make-server-1fc434d6/ai/grammar-check", grammarCheckHandler);
  app.post("/ai/grammar-check", grammarCheckHandler);

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
        `- 本题固定目标搭配为「${collocation}」：讲解、对比或举例时不要引导学习者改用近义搭配作为“更对的答案”。\n` +
        "- 学习者会追问语法概念、用法区别、为什么错等，请讲清楚，可举与上文不同的新例句帮助理解。\n" +
        "- 不要直接给出“把上面那句改对”的完整答案，也不要逐词复述其错误句子的标准版；引导学习者自己改。\n" +
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

  app.post("/make-server-1fc434d6/ai/stuck-suggest", async (c) => {
    try {
      const { chineseThought, corpusSentences, verbCollocations } = await c.req.json();
      if (!chineseThought) {
        return c.json({ error: "chineseThought is required" }, 400);
      }

      const corpusContext = (corpusSentences || []).slice(0, 20).map(
        (s: any) => `- "${s.userSentence}" (collocation: ${s.collocation})`,
      ).join("\n");

      const verbContext = (verbCollocations || []).slice(0, 30).map(
        (v: any) => `- ${v.phrase} (${v.meaning})`,
      ).join("\n");

      const systemPrompt =
        "You are an English speaking coach for Chinese ESL learners using a \"core verb + collocation\" learning method. The learner is stuck during an IELTS speaking practice and tells you what they want to say in Chinese.\n\nYour job is to help them express the idea using simple English with core verbs (get, make, take, keep, give, put, set, go, come, do, etc.).\n\nFollow this three-layer strategy:\n1. FIRST check if the learner's personal corpus has a relevant sentence they can adapt. If found, return type \"corpus\".\n2. If not in corpus, check the verb collocation library for relevant collocations. If found, return type \"verb\".\n3. If neither matches, suggest a simple paraphrase using core verbs. Return type \"paraphrase\".\n\nLearner's personal corpus:\n" +
        (corpusContext || "(empty)") +
        "\n\nAvailable verb collocations:\n" +
        (verbContext || "(none provided)") +
        "\n\nRespond ONLY with valid JSON (no markdown):\n{\n  \"type\": \"corpus\" | \"verb\" | \"paraphrase\",\n  \"suggestion\": \"A short mixed Chinese/English summary for quick display. Keep it concise.\",\n  \"recommendedExpression\": \"A short English phrase (2-5 words) the learner should remember, such as get an offer / feel under pressure / keep in touch.\",\n  \"guidanceZh\": \"Chinese guidance explaining the most natural way to express the idea and what wording to prioritize.\",\n  \"examples\": [\n    {\n      \"sentence\": \"One natural English sentence\",\n      \"chinese\": \"Natural Chinese translation\",\n      \"noteZh\": \"Why this sentence works or when to use it\"\n    }\n  ]\n}\n\nRules:\n- Always return recommendedExpression when possible.\n- recommendedExpression should be the core expression the learner should remember, not a full sentence.\n- Always return 2 or 3 example sentences.\n- Example sentences must be natural, everyday usable English.\n- guidanceZh must be concise, practical, and directly usable.\n- suggestion should be a short summary, not a long paragraph.\n- Examples should help the learner either say it directly or adapt it with small edits.\n- Prefer simple, speakable English over fancy vocabulary.";

      const result = await callDeepSeek(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `我想表达：${chineseThought}` },
        ],
        0.5,
      );

      let parsed;
      try {
        parsed = parseJsonFromModel(result) as Record<string, unknown>;
      } catch {
        parsed = { type: "paraphrase", suggestion: result, guidanceZh: result, examples: [] };
      }
      const rawExamples = Array.isArray(parsed.examples) ? parsed.examples : [];
      const examples = rawExamples
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const row = item as Record<string, unknown>;
          const sentence = String(row.sentence || "").trim();
          if (!sentence) return null;
          const chinese = String(row.chinese || "").trim();
          const noteZh = String(row.noteZh || "").trim();
          return {
            sentence,
            chinese: chinese || undefined,
            noteZh: noteZh || undefined,
          };
        })
        .filter(Boolean)
        .slice(0, 3);

      return c.json({
        type: parsed.type === "corpus" || parsed.type === "verb" ? parsed.type : "paraphrase",
        suggestion: String(parsed.suggestion || parsed.guidanceZh || "").trim(),
        recommendedExpression: String(parsed.recommendedExpression || "").trim() || undefined,
        guidanceZh: String(parsed.guidanceZh || "").trim() || undefined,
        examples,
      });
    } catch (err) {
      console.log(`Error in stuck suggestion: ${err}`);
      return c.json({ error: `Stuck suggestion failed: ${err}` }, 500);
    }
  });

  app.post("/make-server-1fc434d6/ai/evaluate-answer", async (c) => {
    try {
      const { question, answer, part } = await c.req.json();
      if (!answer) {
        return c.json({ error: "answer is required" }, 400);
      }

      const partNum = part || 2;
      const systemPrompt =
        `You are an IELTS speaking examiner and English coach. Evaluate the learner's spoken answer to an IELTS Part ${partNum} question.\n\n` +
        "Focus on:\n1. Fluency & Coherence (0-100)\n2. Grammar Range & Accuracy (0-100)\n3. Vocabulary (especially use of core verbs like get, make, take, keep, give, etc.) (0-100)\n4. Overall score (average of above three)\n\n" +
        "Identify which core verbs (get, take, make, do, have, go, set, keep, give, put, come, see, know, think, find, tell, ask, work, feel, need) were used.\n\n" +
        "Respond ONLY with valid JSON (no markdown):\n{\n  \"score\": 75,\n  \"fluency\": 70,\n  \"grammar\": 80,\n  \"vocabulary\": 75,\n  \"verbsUsed\": [\"get\", \"make\"],\n  \"feedback\": [\n    \"Chinese feedback point 1\",\n    \"Chinese feedback point 2\",\n    \"Chinese feedback point 3\"\n  ]\n}\n\nFeedback should be in Chinese, 3-5 points, specific and actionable. Be encouraging but honest.";

      const result = await callDeepSeek(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `IELTS Question: "${question}"\n\nMy answer: "${answer}"` },
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
          { role: "user", content: `Sentence: "${sentence}"\nTarget collocation: "${collocation}"\n\nIs this Chinglish? If yes, give native version and brief thinking in Chinese.` },
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
}
