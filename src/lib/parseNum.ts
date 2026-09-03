export interface ParsedNum {
  value: number | null;
  extra: string;
}

/** Extracts a leading number from a messy cell value (e.g. "100 (calent.)", "25/lado"), keeping the remainder as `extra`. */
export function parseNum(raw: unknown): ParsedNum {
  if (typeof raw === "number") return { value: raw, extra: "" };
  if (raw == null) return { value: null, extra: "" };
  const s = String(raw).trim();
  const m = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (!m) return { value: null, extra: s };
  const value = parseFloat(m[1].replace(",", "."));
  const extra = s.slice(m[0].length).trim();
  return { value, extra };
}
