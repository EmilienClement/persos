// Traitement des photos dans le navigateur (aucun coût serveur).

export async function toBitmap(file: Blob) {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const blobOf = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), type, q));

export function fitSize(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

/** JPEG réduit, utilisé comme entrée du détourage. */
export async function resizeJpeg(file: Blob, max: number) {
  const bmp = await toBitmap(file);
  const { w, h } = fitSize(bmp.width, bmp.height, max);
  const c = canvasOf(w, h);
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return blobOf(c, "image/jpeg", 0.88);
}

/** Pose l'image (éventuellement transparente) sur un fond neutre, puis exporte en WebP. */
export async function composeWebp(src: Blob, max: number, quality: number, bg = "#f4f0e8") {
  const bmp = await toBitmap(src);
  const { w, h } = fitSize(bmp.width, bmp.height, max);
  const c = canvasOf(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return blobOf(c, "image/webp", quality);
}

/** Détourage local. Si ça échoue (mémoire, réseau), on garde la photo d'origine. */
export async function removeBg(src: Blob): Promise<Blob> {
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    return await removeBackground(src, { output: { format: "image/png" } });
  } catch {
    return src;
  }
}
