/** A voice that reads the Bible aloud: the browser's own speech synthesis, so
 * it's free, works offline for local voices and needs no account. Which
 * voices exist depends on the device — this module picks the best Spanish one
 * (deep, natural, Latin American first) and keeps the listener's choices. */

const KEY = "performance_narrator_v1";

export interface NarratorPrefs {
  /** voiceURI of the chosen voice; null = pick the best automatically. */
  voiceURI: string | null;
  /** Speaking speed. Slower than normal reads like a guide, not a bot. */
  rate: number;
  /** Lower = deeper. */
  pitch: number;
}

export const DEFAULT_NARRATOR_PREFS: NarratorPrefs = { voiceURI: null, rate: 0.9, pitch: 0.85 };

export const RATE_RANGE = { min: 0.6, max: 1.3 };
export const PITCH_RANGE = { min: 0.5, max: 1.2 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function parsePrefs(raw: unknown): NarratorPrefs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<NarratorPrefs>;
  const num = (v: unknown, fallback: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : fallback);
  return {
    voiceURI: typeof o.voiceURI === "string" && o.voiceURI ? o.voiceURI : null,
    rate: num(o.rate, DEFAULT_NARRATOR_PREFS.rate, RATE_RANGE.min, RATE_RANGE.max),
    pitch: num(o.pitch, DEFAULT_NARRATOR_PREFS.pitch, PITCH_RANGE.min, PITCH_RANGE.max),
  };
}

export function loadPrefs(): NarratorPrefs {
  try {
    return parsePrefs(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return DEFAULT_NARRATOR_PREFS;
  }
}

export function savePrefs(p: NarratorPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* it just won't be remembered */
  }
}

export function narratorSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang" | "voiceURI">;

const NATURAL = /natural|neural|online|premium|enhanced|wavenet|studio/i;
// First names of common male Spanish voices: a deeper register suits a narrator.
const MALE = /\b(jorge|diego|alvaro|álvaro|pablo|raul|raúl|juan|carlos|enrique|tom[aá]s|miguel|antonio|manuel|andr[eé]s|lorenzo|gonzalo|ricardo|male|hombre)\b/i;
const LATAM = /^es[-_](419|mx|us|co|ar|cl|pe|ve)/i;

/** Higher = better narrator. Only Spanish voices score at all. */
export function voiceScore(v: VoiceLike): number {
  if (!/^es/i.test(v.lang)) return -1;
  let s = 1;
  if (NATURAL.test(v.name)) s += 4;
  if (/google/i.test(v.name)) s += 2;
  if (MALE.test(v.name)) s += 3;
  if (LATAM.test(v.lang)) s += 2;
  if (/^es[-_]co/i.test(v.lang)) s += 1;
  return s;
}

/** Spanish voices, best first. */
export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices
    .map((v) => ({ v, s: voiceScore(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v);
}

/** The voice to use: the saved one if it's still installed, else the best. */
export function chooseVoice<T extends VoiceLike>(voices: T[], voiceURI: string | null): T | null {
  const ranked = rankVoices(voices);
  return (voiceURI ? ranked.find((v) => v.voiceURI === voiceURI) : undefined) ?? ranked[0] ?? null;
}

/** Text as it should be spoken: no stray brackets/markers, one space between words. */
export function speakable(verse: string): string {
  return verse
    .replace(/[[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
