/** Reads a cart number from the cart's QR (".../app/connect?cart=12") or from a typed number. */
export function parseCartCode(text: string): number | null {
  const fromUrl = text.match(/[?&]cart=(\d+)/);
  const raw = fromUrl ? fromUrl[1] : text.trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
