/** A random v4 uuid that works everywhere. `crypto.randomUUID` is missing in
 * older Safari and in insecure contexts (plain http on a LAN address), and
 * calling it there throws — which, inside a Dexie write hook, would abort the
 * save of the row. Falls back to getRandomValues and, as a last resort, to
 * Math.random (not cryptographic, but a client-side row id only needs to be
 * unique, not secret). */
export function uuid(): string {
  const c = (globalThis as { crypto?: Partial<Crypto> }).crypto;
  try {
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fall through to the next option */
  }
  const bytes = new Uint8Array(16);
  let filled = false;
  try {
    if (c && typeof c.getRandomValues === "function") {
      c.getRandomValues(bytes);
      filled = true;
    }
  } catch {
    /* fall through to Math.random */
  }
  if (!filled) for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
