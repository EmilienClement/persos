export type AiImage = { mimeType: string; base64: string };

export type AiRequest = {
  system: string;
  user: string;
  images?: AiImage[];
  /** "vision" = étiquetage photo, "text" = styliste, achats, profil de goûts. */
  kind: "vision" | "text";
  /** Pour le suivi de quota (table ai_usage). */
  label: string;
};

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public rateLimited = false,
  ) {
    super(message);
  }
}

export interface AiProvider {
  /** Renvoie le JSON parsé de la réponse du modèle. */
  generateJson(req: AiRequest, model: string): Promise<unknown>;
}
