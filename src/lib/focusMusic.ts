import { parseYouTubeSource, type YouTubeSource } from "./youtube";

/** Music for Focus: the official YouTube player (playlists from YouTube or
 * YouTube Music), driven from our own controls and shown with what's playing.
 *
 * A web page can't see what another app or tab is playing, and YouTube Music
 * itself can't be embedded — so the music plays *here*, in a player the app
 * owns, which is the only way to know the song's name. The player has to stay
 * visible (YouTube's terms don't allow playing it hidden), so a single iframe
 * is kept alive by MusicHost and laid over whichever "slot" is on screen. */

const KEY = "performance_focus_music_v1";
const MAX_CONSECUTIVE_ERRORS = 3;

export interface MusicConfig {
  url: string;
  /** Play while a focus block runs; pause on pause / break / stop. */
  sync: boolean;
}

export type MusicSlotMode = "off" | "zen";

export interface MusicState {
  config: MusicConfig | null;
  source: YouTubeSource | null;
  /** The player exists (created the first time you press play). */
  started: boolean;
  /** …and has finished loading, so it can be told what to do. */
  ready: boolean;
  playing: boolean;
  title: string;
  author: string;
  /** Current track's video id — its thumbnail is the cover shown outside full screen. */
  videoId: string;
  error: string | null;
  slotMode: MusicSlotMode;
}

// ── minimal typing of the IFrame API we use ──────────────────────────────
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  loadPlaylist(opts: { list: string; listType: "playlist" }): void;
  loadVideoById(id: string): void;
  setLoop(loop: boolean): void;
  getVideoData(): { title?: string; author?: string; video_id?: string };
  getPlayerState(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function readConfig(): MusicConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<MusicConfig>;
    if (typeof c.url !== "string" || !parseYouTubeSource(c.url)) return null;
    return { url: c.url, sync: c.sync === true };
  } catch {
    return null;
  }
}

function writeConfig(c: MusicConfig | null): void {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* it just won't be remembered */
  }
}

const initialConfig = readConfig();
let state: MusicState = {
  config: initialConfig,
  source: initialConfig ? parseYouTubeSource(initialConfig.url) : null,
  started: false,
  ready: false,
  playing: false,
  title: "",
  author: "",
  videoId: "",
  error: null,
  slotMode: "off",
};
const listeners = new Set<() => void>();

function set(patch: Partial<MusicState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getMusicState(): MusicState {
  return state;
}
export function subscribeMusic(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── slot: where on screen the player is currently shown ──────────────────
let slotEl: HTMLElement | null = null;

export function getMusicSlotEl(): HTMLElement | null {
  return slotEl;
}

/** A place on screen that wants to show the player (the full-screen timer).
 * Everywhere else the player is parked off-screen and only the controls show.
 * Returns the release. */
export function registerMusicSlot(el: HTMLElement): () => void {
  slotEl = el;
  set({ slotMode: "zen" });
  return () => {
    if (slotEl === el) {
      slotEl = null;
      set({ slotMode: "off" });
    }
  };
}

// ── the player ───────────────────────────────────────────────────────────
let player: YTPlayer | null = null;
let ready = false;
let container: HTMLElement | null = null;
let pollId: number | null = null;
let errorStreak = 0;
let wantPlay = false;
let apiPromise: Promise<void> | null = null;

/** MusicHost hands over the (React-owned) element the player is created inside. */
export function setMusicContainer(el: HTMLElement | null): void {
  container = el;
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("No se pudo cargar YouTube"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

function errorText(code: number): string {
  if (code === 101 || code === 150) return "Este video no permite reproducirse fuera de YouTube.";
  if (code === 100) return "Este video no está disponible o es privado.";
  return "YouTube no pudo reproducir esto.";
}

function refreshInfo(): void {
  if (!player || !ready) return;
  try {
    const d = player.getVideoData();
    const title = d?.title ?? "";
    const author = d?.author ?? "";
    const videoId = d?.video_id ?? "";
    const st = player.getPlayerState();
    const playing = st === 1 || st === 3;
    if (title !== state.title || author !== state.author || videoId !== state.videoId || playing !== state.playing) set({ title, author, videoId, playing });
  } catch {
    /* player not ready to answer yet */
  }
}

function startPolling(): void {
  if (pollId != null) return;
  pollId = window.setInterval(() => {
    if (!document.hidden) refreshInfo();
  }, 1500);
}

function stopPolling(): void {
  if (pollId != null) window.clearInterval(pollId);
  pollId = null;
}

function loadSource(src: YouTubeSource): void {
  if (!player || !ready) return;
  if (src.list) {
    player.loadPlaylist({ list: src.list, listType: "playlist" });
    try {
      player.setLoop(true);
    } catch {
      /* not a playlist yet */
    }
  } else if (src.video) player.loadVideoById(src.video);
}

async function createPlayer(src: YouTubeSource): Promise<void> {
  if (player || !container) return;
  try {
    await loadYouTubeApi();
  } catch (err) {
    set({ error: err instanceof Error ? err.message : "No se pudo cargar YouTube" });
    return;
  }
  if (player || !container || !window.YT) return;
  const target = document.createElement("div");
  container.appendChild(target);
  set({ started: true, ready: false, error: null });
  // Never leave it on "Cargando…" for good: if the player doesn't come up, say so.
  window.setTimeout(() => {
    if (player && !ready && !state.error) set({ error: "YouTube no respondió. Revisa tu conexión o el enlace." });
  }, 12000);
  player = new window.YT.Player(target, {
    width: "100%",
    height: "100%",
    // Only set when there's a video: an explicit `videoId: undefined` makes the
    // API build an iframe with no src at all (a playlist player then never
    // starts and the UI sits on "Cargando…" forever).
    ...(src.list ? {} : { videoId: src.video }),
    playerVars: {
      autoplay: 1,
      controls: 0,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      disablekb: 1,
      origin: window.location.origin,
      ...(src.list ? { listType: "playlist", list: src.list } : {}),
    },
    events: {
      onReady: () => {
        ready = true;
        set({ ready: true });
        if (src.list) {
          try {
            player?.setLoop(true);
          } catch {
            /* ignore */
          }
        }
        if (wantPlay) player?.playVideo();
        startPolling();
        refreshInfo();
      },
      onStateChange: (e: { data: number }) => {
        if (e.data === 1) errorStreak = 0;
        if (e.data === 1 || e.data === 3) set({ error: null });
        refreshInfo();
      },
      onError: (e: { data: number }) => {
        errorStreak++;
        set({ error: errorText(e.data), playing: false });
        // In a playlist one bad track shouldn't stop the music.
        if (state.source?.list && errorStreak < MAX_CONSECUTIVE_ERRORS) window.setTimeout(() => player?.nextVideo(), 800);
      },
    },
  });
}

// ── controls ─────────────────────────────────────────────────────────────

/** Starts (or resumes) playback. Call from a click the first time: browsers
 * only let a page start sound after a user gesture. */
export function playMusic(): void {
  const src = state.source;
  if (!src) return;
  wantPlay = true;
  if (!player) {
    void createPlayer(src);
    return;
  }
  if (ready) player.playVideo();
}

export function pauseMusic(): void {
  wantPlay = false;
  if (player && ready) player.pauseVideo();
}

export function toggleMusic(): void {
  if (state.playing) pauseMusic();
  else playMusic();
}

export function nextMusic(): void {
  if (player && ready) player.nextVideo();
}

export function prevMusic(): void {
  if (player && ready) player.previousVideo();
}

// ── configuration ────────────────────────────────────────────────────────

/** Saves the link. Returns false if it isn't a YouTube / YouTube Music link. */
export function saveMusicConfig(url: string): boolean {
  const source = parseYouTubeSource(url);
  if (!source) return false;
  errorStreak = 0;
  const config: MusicConfig = { url: url.trim(), sync: state.config?.sync ?? false };
  writeConfig(config);
  set({ config, source, error: null, title: "", author: "", videoId: "" });
  if (player && ready) {
    loadSource(source);
    if (wantPlay) player.playVideo();
  }
  return true;
}

export function setMusicSync(sync: boolean): void {
  if (!state.config) return;
  const config = { ...state.config, sync };
  writeConfig(config);
  set({ config });
}

export function clearMusic(): void {
  wantPlay = false;
  stopPolling();
  try {
    player?.destroy();
  } catch {
    /* already gone */
  }
  player = null;
  ready = false;
  if (container) container.innerHTML = "";
  writeConfig(null);
  set({ config: null, source: null, started: false, ready: false, playing: false, title: "", author: "", videoId: "", error: null });
}
