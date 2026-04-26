import type { Hono } from "npm:hono";
import { aiUsageBlockedResponse, callTrackedDeepSeek, parseJsonFromModel } from "./ai-shared.ts";
import { buildVocabCardGenerationPrompt } from "./ai-vocab/prompts.ts";
import { assessSpokenRegister, generateOriginalDailyFallbackItem, type DeepSeekCaller } from "./ai-vocab/service.ts";

export function registerVocabAiRoutes(app: Hono) {
  const makeTrackedCaller = (c: any, feature: string): DeepSeekCaller =>
    (messages, temperature, maxTokens, model) =>
      callTrackedDeepSeek(c, feature, messages, temperature, maxTokens, model);

  const vocabCardHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();
      const collocations = Array.isArray(body.collocations) ? body.collocations : [];

      if (!headword) return c.json({ error: "headword is required" }, 400);
      if (collocations.length < 1) return c.json({ error: "collocations array is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const reg = await assessSpokenRegister(
        headword,
        sense,
        vocabModel,
        makeTrackedCaller(c, "vocab_register_assess"),
      );
      const phraseForSentence = reg.phraseForExample;

      const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const needOriginalDailySentence = norm(headword) !== norm(phraseForSentence);

      const colLines = collocations
        .slice(0, 35)
        .map((x: any) => (typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`))
        .join("\n");

      const { systemPrompt, userContent } = buildVocabCardGenerationPrompt({
        headword,
        sense,
        phraseForSentence,
        colLines,
        needOriginalDailySentence,
      });

      const result = await callTrackedDeepSeek(
        c,
        "vocab_card",
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

      const mapItem = (it: any) => ({
        sentence: String(it?.sentence || "").trim(),
        collocationsUsed: Array.isArray(it?.collocationsUsed)
          ? it.collocationsUsed.map((x: any) => String(x))
          : [],
        chinese: String(it?.chinese || "").trim() || undefined,
      });

      const first = rawItems.find((it: any) => it && String(it.sentence || "").trim());
      if (!first) return c.json({ error: "AI returned no valid items" }, 500);

      const itemsOut = [mapItem(first)];

      if (needOriginalDailySentence && rawItems.length > 1) {
        const second = rawItems[1];
        if (second && String(second.sentence || "").trim()) itemsOut.push(mapItem(second));
      }

      if (needOriginalDailySentence && itemsOut.length < 2) {
        const fb = await generateOriginalDailyFallbackItem(
          headword,
          sense,
          colLines,
          vocabModel,
          makeTrackedCaller(c, "vocab_original_daily"),
        );
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
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card: ${err}`);
      return c.json({ error: `Vocab card generation failed: ${err}` }, 500);
    }
  };

  const vocabCardOriginalDailyHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();
      const collocations = Array.isArray(body.collocations) ? body.collocations : [];

      if (!headword) return c.json({ error: "headword is required" }, 400);
      if (collocations.length < 1) return c.json({ error: "collocations array is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const colLines = collocations
        .slice(0, 35)
        .map((x: any) => (typeof x === "string" ? `- ${x}` : `- ${x.phrase || x} (${x.meaning || ""}) [verb: ${x.verb || ""}]`))
        .join("\n");

      const item = await generateOriginalDailyFallbackItem(
        headword,
        sense,
        colLines,
        vocabModel,
        makeTrackedCaller(c, "vocab_original_daily"),
      );
      if (!item) return c.json({ error: "Failed to generate original-daily sentence" }, 500);
      return c.json({ item });
    } catch (err) {
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card-original-daily: ${err}`);
      return c.json({ error: `Vocab card original-daily failed: ${err}` }, 500);
    }
  };

  const vocabCardRegisterGuideHandler = async (c: any) => {
    try {
      const body = await c.req.json();
      const headword = String(body.headword || "").trim();
      const sense = String(body.sense || "").trim();

      if (!headword) return c.json({ error: "headword is required" }, 400);

      const vocabModel = Deno.env.get("DEEPSEEK_VOCAB_MODEL") || Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";
      const reg = await assessSpokenRegister(
        headword,
        sense,
        vocabModel,
        makeTrackedCaller(c, "vocab_register_guide"),
      );

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
      const blocked = aiUsageBlockedResponse(c, err);
      if (blocked) return blocked;
      console.log(`Error in vocab-card-register-guide: ${err}`);
      return c.json({ error: `Vocab card register-guide failed: ${err}` }, 500);
    }
  };

  app.post("/make-server-1fc434d6/ai/vocab-card", vocabCardHandler);
  app.post("/ai/vocab-card", vocabCardHandler);
  app.post("/make-server-1fc434d6/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
  app.post("/ai/vocab-card-original-daily", vocabCardOriginalDailyHandler);
  app.post("/make-server-1fc434d6/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);
  app.post("/ai/vocab-card-register-guide", vocabCardRegisterGuideHandler);
}
