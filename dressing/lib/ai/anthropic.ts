import { AiError, type AiProvider, type AiRequest } from "./types";
import { parseJson } from "./gemini";

export const anthropic: AiProvider = {
  async generateJson(req: AiRequest, model: string) {
    const key = process.env.AI_API_KEY;
    if (!key) throw new AiError("AI_API_KEY manquante");

    const content: unknown[] = [];
    for (const img of req.images ?? []) {
      content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
    }
    content.push({ type: "text", text: req.user });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: `${req.system}\n\nRéponds uniquement avec un objet JSON valide.`,
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AiError(`Anthropic ${res.status}: ${body.slice(0, 300)}`, res.status, res.status === 429);
    }
    const data = await res.json();
    const text: string | undefined = data?.content?.find?.((c: { type: string }) => c.type === "text")?.text;
    if (!text) throw new AiError("Anthropic : réponse vide");
    return parseJson(text);
  },
};
