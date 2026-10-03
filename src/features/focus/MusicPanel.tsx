import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clearMusic, getMusicState, nextMusic, playMusic, prevMusic, registerMusicSlot, saveMusicConfig, setMusicSync, subscribeMusic, toggleMusic } from "@/lib/focusMusic";
import type { MusicState } from "@/lib/focusMusic";
import { showToast } from "@/ui/Toast";

function useMusic() {
  return useSyncExternalStore(subscribeMusic, getMusicState, getMusicState);
}

/** Before the first song plays there's no title to show; say what's actually going on. */
function waitingText(m: MusicState): string {
  if (!m.started) return "Lista conectada — pulsa play";
  return m.ready ? "Pulsa play para empezar" : "Cargando…";
}

const GLYPH = { width: 18, height: 18, viewBox: "0 0 20 20", "aria-hidden": true } as const;
function PlayGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M6 3.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L6.9 3.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg {...GLYPH}>
      <rect x="5" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
      <rect x="11.4" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
    </svg>
  );
}
function NextGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M4 4.2v11.6a.6.6 0 0 0 .9.5l8-5.8a.6.6 0 0 0 0-1l-8-5.8a.6.6 0 0 0-.9.5Z" fill="currentColor" />
      <rect x="14" y="4" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
function PrevGlyph() {
  return (
    <svg {...GLYPH} style={{ transform: "scaleX(-1)" }}>
      <path d="M4 4.2v11.6a.6.6 0 0 0 .9.5l8-5.8a.6.6 0 0 0 0-1l-8-5.8a.6.6 0 0 0-.9.5Z" fill="currentColor" />
      <rect x="14" y="4" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

function Controls({ playing, big }: { playing: boolean; big?: boolean }) {
  const side = big ? "h-11 w-11" : "h-9 w-9";
  return (
    <div className="flex items-center gap-2">
      <button onClick={prevMusic} aria-label="Canción anterior" className={`glass tap-target flex ${side} items-center justify-center rounded-full text-[var(--color-muted)]`}>
        <PrevGlyph />
      </button>
      <button onClick={toggleMusic} aria-label={playing ? "Pausar música" : "Reproducir música"} className={`glass-on tap-target flex ${big ? "h-12 w-12" : "h-10 w-10"} items-center justify-center rounded-full text-white`}>
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </button>
      <button onClick={nextMusic} aria-label="Siguiente canción" className={`glass tap-target flex ${side} items-center justify-center rounded-full text-[var(--color-muted)]`}>
        <NextGlyph />
      </button>
    </div>
  );
}

/** The "Música" card on the Focus screen: connect a YouTube / YouTube Music
 * playlist, see what's playing, control it, and optionally tie it to the timer. */
export function MusicPanel() {
  const m = useMusic();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  function connect() {
    if (!saveMusicConfig(text)) {
      showToast("Pega un enlace de YouTube o YouTube Music");
      return;
    }
    setText("");
    setEditing(false);
    playMusic();
  }

  if (!m.config || editing) {
    return (
      <div className="panel-surface p-4">
        <div className="eyebrow">Música</div>
        <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">
          Pega el enlace de una lista de YouTube o YouTube Music. Suena aquí mismo y la verás con su nombre en la pantalla completa del cronómetro.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            inputMode="url"
            placeholder="https://music.youtube.com/playlist?list=…"
            aria-label="Enlace de la lista"
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-red)]"
          />
          <button onClick={connect} className="btn-primary tap-target flex-none rounded-full px-4 text-[12px] font-semibold uppercase tracking-wide text-white">
            Conectar
          </button>
        </div>
        {editing ? (
          <button onClick={() => setEditing(false)} className="mt-2 text-[11.5px] text-[var(--color-muted)] underline">
            Cancelar
          </button>
        ) : null}
        <p className="mt-3 text-[11px] leading-snug text-[var(--color-muted-2)]">
          Mejor con listas propias o de álbum; las mezclas automáticas de YouTube a veces no se dejan reproducir fuera de YouTube.
        </p>
      </div>
    );
  }

  const thumb = m.videoId ? `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg` : null;
  return (
    <div className="panel-surface p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Música</div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
          <button onClick={() => setEditing(true)} className="underline">
            Cambiar
          </button>
          <button
            onClick={() => {
              clearMusic();
              showToast("Música desconectada");
            }}
            className="underline"
          >
            Quitar
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-14 w-14 flex-none overflow-hidden rounded-xl bg-[var(--color-surface-2)]">
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{m.title || waitingText(m)}</div>
          <div className="truncate text-[12px] text-[var(--color-muted)]">{m.author || (m.title || !m.ready ? "" : "El nombre de la canción aparece al sonar")}</div>
        </div>
        <Controls playing={m.playing} />
      </div>

      {m.error ? (
        <p role="alert" className="mt-3 text-[11.5px] text-[var(--color-warn)]">
          {m.error}
        </p>
      ) : null}

      <button
        onClick={() => setMusicSync(!m.config!.sync)}
        aria-pressed={m.config.sync}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-line-strong)] px-3 py-2.5 text-left"
      >
        <span className="text-[12.5px]">
          Sonar solo durante el bloque
          <span className="block text-[11px] text-[var(--color-muted)]">Empieza con el bloque y se pausa con el cronómetro y en los descansos.</span>
        </span>
        <span aria-hidden className={`relative h-5 w-9 flex-none rounded-full transition-colors ${m.config.sync ? "bg-[var(--color-red)]" : "bg-[var(--color-surface-2)]"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${m.config.sync ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>
    </div>
  );
}

/** Inside the full-screen timer: the live player (the video itself, kept
 * visible as YouTube requires), the song's name and the controls. */
export function MusicZen() {
  const m = useMusic();
  const slotRef = useRef<HTMLDivElement>(null);
  const showSlot = !!m.config && m.started;

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    return registerMusicSlot(el);
  }, [showSlot]);

  if (!m.config) return null;
  if (!m.started) {
    return (
      <button onClick={playMusic} className="glass tap-target rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
        Reproducir música
      </button>
    );
  }
  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-[28px] border border-[var(--color-line-strong)] bg-[rgb(var(--fg-rgb)/0.03)] p-3">
      {/* The player itself is laid over this box by MusicHost (it has to stay
          visible); 16:9 so the video fills it with no bars of its own. */}
      <div ref={slotRef} className="aspect-video w-full rounded-2xl bg-black" />
      <div className="w-full min-w-0 px-1 text-center">
        <div className="truncate text-[15px] font-semibold leading-tight">{m.title || waitingText(m)}</div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">{m.error ?? m.author}</div>
      </div>
      <Controls playing={m.playing} big />
    </div>
  );
}
