import { anthropic } from "./anthropic";
import { gemini } from "./gemini";
import { AiError, type AiProvider, type AiRequest } from "./types";

export * from "./types";

function provider(): AiProvider {
  switch (process.env.AI_PROVIDER) {
    case "gemini":
      return gemini;
    case "anthropic":
      return anthropic;
    default:
      throw new AiError(`AI_PROVIDER inconnu : ${process.env.AI_PROVIDER ?? "(vide)"}`);
  }
}

/**
 * Point d'entrée unique de l'IA. Changer de fournisseur = changer les variables
 * AI_PROVIDER, AI_API_KEY et AI_MODEL_*. Sur erreur 429 (quota), un modèle de
 * secours optionnel (AI_MODEL_TEXT_FALLBACK) prend le relais pour le texte.
 */
export async function generateJson(req: AiRequest): Promise<{ data: unknown; model: string }> {
  const p = provider();
  const primary = req.kind === "vision" ? process.env.AI_MODEL_VISION : process.env.AI_MODEL_TEXT;
  if (!primary) throw new AiError(`Modèle ${req.kind} non configuré`);

  try {
    return { data: await p.generateJson(req, primary), model: primary };
  } catch (e) {
    const fallback = req.kind === "text" ? process.env.AI_MODEL_TEXT_FALLBACK : undefined;
    if (e instanceof AiError && e.rateLimited && fallback && fallback !== primary) {
      return { data: await p.generateJson(req, fallback), model: fallback };
    }
    throw e;
  }
}
