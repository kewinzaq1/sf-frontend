/**
 * Client-side avatar compression.
 *
 * The avatar renders at 64 CSS px at most, so a 192px square source covers a
 * 3x retina display perfectly. Downscaling before upload turns a multi-MB
 * camera photo into a ~5 KB payload — which also keeps the contacts list
 * fast, since the API inlines every photo in its list responses.
 */

/** Square output edge: 64 px largest render × 3x device pixel ratio. */
export const AVATAR_SIZE = 192;

/** Guard against absurd inputs before the browser tries to decode them. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const QUALITY = 0.8;

/**
 * True when a WebP file declares an animation.
 *
 * An animated WebP is a RIFF container whose `VP8X` header is followed by an
 * `ANIM` chunk within the first few dozen bytes — sniffing those is enough,
 * and cheap. Errors count as "not animated": the file then goes through the
 * compressor, which at worst freezes a file we failed to read anyway.
 */
export async function isAnimatedWebP(file: File): Promise<boolean> {
  if (file.type !== "image/webp") return false;
  try {
    const header: ArrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(0, 64));
    });
    return new TextDecoder("ascii").decode(new Uint8Array(header)).includes("ANIM");
  } catch {
    return false;
  }
}

/**
 * Centre-crop `file` to a square, downscale it to `AVATAR_SIZE`, and return
 * the result as a WebP data URL (JPEG where the browser cannot encode WebP).
 * Never upscales: an image smaller than the target keeps its own size.
 */
export async function compressAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(AVATAR_SIZE, side);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d canvas is unavailable");

    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    return await blobToDataUrl(await encode(canvas));
  } finally {
    bitmap.close();
  }
}

/** WebP keeps alpha and compresses best; fall back to JPEG when unsupported. */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg");
  if (jpeg?.type === "image/jpeg") return jpeg;

  throw new Error("the browser could not encode the image");
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
