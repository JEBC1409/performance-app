import { getFocusState, pauseFocus, remainingSeconds, resumeFocus, subscribeFocus } from "./focusTimer";
import type { FocusTimerState } from "./focusTimer";
import { subscribeTick } from "./ticker";

/** Floating, always-on-top timer.
 *
 * Preferred: Document Picture-in-Picture (Chrome/Edge desktop) — a real
 * mini window we render our own UI into, with working buttons.
 * Fallback: a <canvas> streamed into a <video> and sent to the browser's
 * video Picture-in-Picture (Safari, Android Chrome, older Chromium) — shows
 * the countdown, with play/pause mapped to pause/resume.
 * Where neither exists, the button simply isn't offered. */

export type PipKind = "document" | "video";

export interface PipState {
  kind: PipKind | null;
  win: Window | null;
}

interface DocPipApi {
  requestWindow(opts?: { width?: number; height?: number }): Promise<Window>;
}

function docPipApi(): DocPipApi | null {
  const api = (window as unknown as { documentPictureInPicture?: DocPipApi }).documentPictureInPicture;
  return api ?? null;
}

function videoPipSupported(): boolean {
  return typeof document !== "undefined" && !!document.pictureInPictureEnabled && typeof HTMLVideoElement !== "undefined" && "requestPictureInPicture" in HTMLVideoElement.prototype;
}

export function pipSupport(): PipKind | null {
  if (typeof window === "undefined") return null;
  if (docPipApi()) return "document";
  if (videoPipSupported()) return "video";
  return null;
}

let pip: PipState = { kind: null, win: null };
const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

function setPip(next: PipState) {
  pip = next;
  listeners.forEach((l) => l());
}

export function getPip(): PipState {
  return pip;
}

export function subscribePip(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function closePip(): void {
  const t = teardown;
  teardown = null;
  try {
    t?.();
  } catch {
    /* already gone */
  }
  if (pip.kind) setPip({ kind: null, win: null });
}

function copyStyles(win: Window) {
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
    win.document.head.appendChild(el.cloneNode(true));
  });
}

async function openDocumentPip(api: DocPipApi): Promise<void> {
  const win = await api.requestWindow({ width: 320, height: 210 });
  try {
    copyStyles(win);
    win.document.documentElement.style.height = "100%";
    win.document.body.style.cssText = "margin:0;height:100%;background:#050506;overflow:hidden;";
    win.document.title = "Focus";
  } catch (err) {
    win.close();
    throw err;
  }
  const onHide = () => closePip();
  win.addEventListener("pagehide", onHide);
  teardown = () => {
    win.removeEventListener("pagehide", onHide);
    win.close();
  };
  setPip({ kind: "document", win });
}

// ── canvas → video fallback ───────────────────────────────────────────────

const CW = 480;
const CH = 270;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

function drawFrame(ctx: CanvasRenderingContext2D, s: FocusTimerState) {
  const isBreak = s.phase === "break";
  const accent = isBreak ? "#2fae66" : "#df2531";
  const left = Math.min(remainingSeconds(s, Date.now()), s.totalSec);
  const progress = s.totalSec > 0 ? 1 - left / s.totalSec : 0;

  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, CW, CH);
  const glow = ctx.createRadialGradient(CW / 2, CH / 2, 10, CW / 2, CH / 2, 200);
  glow.addColorStop(0, isBreak ? "rgba(47,174,102,0.22)" : "rgba(223,37,49,0.24)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CW, CH);

  const cx = CW / 2;
  const cy = CH / 2 - 8;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.stroke();
  if (progress > 0) {
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 92, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "300 58px 'Space Grotesk', Helvetica, Arial, sans-serif";
  ctx.fillText(fmt(left), cx, cy - 2);
  ctx.font = "600 12px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  const tag = s.status === "paused" ? "EN PAUSA" : isBreak ? "DESCANSO" : "ENFOQUE";
  ctx.fillText(tag, cx, cy + 34);

  ctx.font = "500 15px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#fff";
  const label = isBreak ? "Respira un momento" : s.task;
  ctx.fillText(label.length > 44 ? `${label.slice(0, 43)}…` : label, cx, CH - 16);
}

async function openVideoPip(): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") throw new Error("canvas streaming unavailable");

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText = "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:0;top:0;";
  video.srcObject = canvas.captureStream(5);
  document.body.appendChild(video);

  const render = () => drawFrame(ctx, getFocusState());
  render();

  const unsubTick = subscribeTick(render);
  const unsubState = subscribeFocus(render);
  const onLeave = () => closePip();
  video.addEventListener("leavepictureinpicture", onLeave);

  const ms = navigator.mediaSession;
  const setHandlers = (on: boolean) => {
    if (!ms) return;
    try {
      ms.setActionHandler("play", on ? () => resumeFocus() : null);
      ms.setActionHandler("pause", on ? () => pauseFocus() : null);
    } catch {
      /* action not supported here */
    }
  };

  teardown = () => {
    unsubTick();
    unsubState();
    video.removeEventListener("leavepictureinpicture", onLeave);
    setHandlers(false);
    if (document.pictureInPictureElement === video) void document.exitPictureInPicture().catch(() => {});
    (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    video.remove();
  };

  try {
    await video.play();
    await video.requestPictureInPicture();
  } catch (err) {
    closePipQuietly();
    throw err;
  }
  setHandlers(true);
  setPip({ kind: "video", win: null });
}

function closePipQuietly() {
  const t = teardown;
  teardown = null;
  try {
    t?.();
  } catch {
    /* ignore */
  }
}

/** Opens (or, if already open, closes) the floating timer. Must be called
 * from a click — browsers reject Picture-in-Picture otherwise. */
export async function togglePip(): Promise<"opened" | "closed" | "unsupported" | "failed"> {
  if (pip.kind) {
    closePip();
    return "closed";
  }
  const kind = pipSupport();
  if (!kind) return "unsupported";
  const api = docPipApi();
  if (kind === "document" && api) {
    try {
      await openDocumentPip(api);
      return "opened";
    } catch (err) {
      // Some embedded/hosted browsers expose the API but can't create the window.
      console.error("document picture-in-picture failed", err);
      if (!videoPipSupported()) return "failed";
    }
  }
  try {
    await openVideoPip();
    return "opened";
  } catch (err) {
    console.error("video picture-in-picture failed", err);
    return "failed";
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => closePipQuietly());
}
