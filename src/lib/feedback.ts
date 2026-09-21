/** Tiny tactile/visual feedback helpers. Both are best-effort and silent
 * where unsupported (desktop has no vibration; reduced-motion users get no
 * confetti). */

/** A short haptic tick (Android/Chromium; iOS ignores it). */
export function haptic(ms: number | number[] = 12): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(ms);
  } catch {
    /* not allowed here */
  }
}

const COLORS = ["#df2531", "#ff6b74", "#ffffff", "#e2b96f", "#2fae66"];

/** A brief burst of confetti from (x, y) — defaults to the middle-upper part
 * of the screen. Removes itself after the animation. */
export function celebrate(origin?: { x: number; y: number }, count = 26): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight * 0.38;
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 170;
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    bit.style.background = COLORS[i % COLORS.length];
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist + 70}px`);
    bit.style.setProperty("--rot", `${Math.round(Math.random() * 720 - 360)}deg`);
    bit.style.animationDelay = `${Math.round(Math.random() * 80)}ms`;
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}
