/** Shared 1 Hz clock. Driven by a Web Worker so it keeps ticking accurately
 * while the tab is hidden; falls back to a plain interval where workers
 * aren't available. Runs only while something is subscribed. */

const subs = new Set<() => void>();
let worker: Worker | null = null;
let fallbackId: number | null = null;
let visibilityBound = false;

function fire() {
  subs.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("tick subscriber failed", err);
    }
  });
}

function startFallback() {
  if (fallbackId === null) fallbackId = window.setInterval(fire, 1000);
}

function start() {
  if (worker || fallbackId !== null) return;
  if (!visibilityBound) {
    visibilityBound = true;
    // Catch up the moment the tab comes back instead of waiting for the next beat.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && subs.size) fire();
    });
  }
  try {
    const w = new Worker(new URL("./tickWorker.ts", import.meta.url), { type: "module" });
    w.onmessage = fire;
    w.onerror = () => {
      w.terminate();
      if (worker === w) worker = null;
      if (subs.size) startFallback();
    };
    worker = w;
  } catch {
    startFallback();
  }
}

function stop() {
  worker?.terminate();
  worker = null;
  if (fallbackId !== null) {
    window.clearInterval(fallbackId);
    fallbackId = null;
  }
}

export function subscribeTick(cb: () => void): () => void {
  subs.add(cb);
  start();
  return () => {
    subs.delete(cb);
    if (!subs.size) stop();
  };
}
