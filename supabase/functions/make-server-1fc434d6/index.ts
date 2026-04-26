import { Hono } from "npm:hono";
import { applyPlatformMiddleware } from "./platform.ts";
import { registerCoreAiRoutes } from "./routes/ai-core.ts";
import { registerVocabAiRoutes } from "./routes/ai-vocab.ts";
import { registerAuthRoutes } from "./routes/auth.ts";
import { registerInviteRoutes } from "./routes/invites.ts";
import { registerSpeechRoutes } from "./routes/speech.ts";
import { registerSyncRoutes } from "./routes/sync.ts";

const app = new Hono();

applyPlatformMiddleware(app);

app.get("/make-server-1fc434d6/health", (c) =>
  c.json({
    ok: true,
    service: "make-server-1fc434d6",
    timestamp: new Date().toISOString(),
  }));

registerAuthRoutes(app);
registerInviteRoutes(app);
registerSyncRoutes(app);
registerSpeechRoutes(app);
registerCoreAiRoutes(app);
registerVocabAiRoutes(app);

Deno.serve(app.fetch);
