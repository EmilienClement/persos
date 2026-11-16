import { AiError, type AiProvider, type AiRequest } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const gemini: AiProvider = {
  async generateJson(req: AiRequest, model: string) {
    const key = process.env.AI_API_KEY;
    if (!key) throw new AiError("AI_API_KEY manquante");

    const parts: unknown[] = [{ text: req.user }];
    for (const img of req.images ?? []) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
    }

    const res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AiError(`Gemini ${res.status}: ${body.slice(0, 300)}`, res.status, res.status === 429);
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new AiError("Gemini : réponse vide ou bloquée");
    return parseJson(text);
  },
};

export function parseJson(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new AiError("Réponse IA non-JSON");
  }
}
