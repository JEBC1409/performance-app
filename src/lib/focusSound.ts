/** The Focus end-of-phase chime, synthesised with Web Audio so there's no
 * asset to load or cache. Browsers keep an AudioContext suspended until the
 * page has had a user gesture, so the context is created/resumed from the
 * Start button and from the first tap/key anywhere (initAudioUnlock). */

const KEY = "performance_focus_sound_v1";

let ctx: AudioContext | null = null;
let on = readPref();
const listeners = new Set<() => void>();

function readPref(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function isSoundOn(): boolean {
  return on;
}

export function subscribeSound(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setSoundOn(next: boolean): void {
  on = next;
  try {
    localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    /* preference just won't persist */
  }
  listeners.forEach((l) => l());
  if (next) {
    unlockAudio();
    void playChime("focus", true);
  }
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Unlock audio on the first user gesture, so a timer restored after a
 * reload can still ring. */
export function initAudioUnlock(): () => void {
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const handler = () => {
    unlockAudio();
    if (ctx?.state === "running") remove();
  };
  const remove = () => events.forEach((e) => document.removeEventListener(e, handler, true));
  events.forEach((e) => document.addEventListener(e, handler, true));
  return remove;
}

function bell(c: AudioContext, freq: number, at: number, dur: number, peak: number) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  out.connect(c.destination);
  // A sine plus a quiet octave-up overtone reads as a soft bell rather than a beep.
  [
    { f: freq, g: 1, type: "sine" as const },
    { f: freq * 2, g: 0.22, type: "triangle" as const },
  ].forEach(({ f, g, type }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = f;
    gain.gain.value = g;
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  });
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const D5 = 587.33;

/** Focus block done: a bright rising arpeggio, played twice. Break done:
 * a gentler falling pair, so the two are distinguishable without looking. */
export async function playChime(kind: "focus" | "break", force = false): Promise<void> {
  if (!on && !force) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") await c.resume();
    // Still locked (no gesture yet): skip rather than queue a chime that fires late.
    if (c.state !== "running") return;
    const t = c.currentTime + 0.05;
    if (kind === "focus") {
      [0, 1.5].forEach((off) => {
        [C5, E5, G5, C6].forEach((f, i) => bell(c, f, t + off + i * 0.17, i === 3 ? 1.3 : 0.55, 0.32));
      });
    } else {
      [0, 1.2].forEach((off) => {
        [G5, D5].forEach((f, i) => bell(c, f, t + off + i * 0.28, i === 1 ? 1.0 : 0.6, 0.3));
      });
    }
  } catch {
    /* audio is best-effort; never let it break the timer */
  }
}
