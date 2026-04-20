import type { Hono } from "npm:hono";

export function registerSpeechRoutes(app: Hono) {
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
}
