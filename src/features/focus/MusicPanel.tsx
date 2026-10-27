import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLyrics } from "@/hooks/useLyrics";
import { setLyricsPref, useLyricsPref } from "@/lib/lyricsPref";
import { OFFSET_STEP, formatOffset, setLyricsOffset, useLyricsOffset } from "@/lib/lyricsOffset";
import { Lyrics } from "./Lyrics";
import { MusicLists } from "./MusicLists";
import { useMusicLists } from "@/lib/musicLists";
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
  const side = big ? "h-12 w-12" : "h-11 w-11";
  return (
    <div className="flex items-center gap-2">
      <button onClick={prevMusic} aria-label="Canción anterior" className={`glass tap-target flex ${side} items-center justify-center rounded-full text-[var(--color-muted)]`}>
        <PrevGlyph />
      </button>
      <button onClick={toggleMusic} aria-label={playing ? "Pausar música" : "Reproducir música"} className={`glass-on tap-target flex ${big ? "h-14 w-14" : "h-11 w-11"} items-center justify-center rounded-full`}>
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
        <h2 className="card-title">Música</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
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
            className="min-w-0 flex-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2.5 text-base"
          />
          <button onClick={connect} className="btn-primary tap-target flex-none rounded-full px-5 text-sm font-semibold">
            Conectar
          </button>
        </div>
        {editing ? (
          <button onClick={() => setEditing(false)} className="tap-target mt-1 -ml-2 rounded-full px-3 text-sm text-[var(--color-muted)] underline">
            Cancelar
          </button>
        ) : null}
        <p className="mt-3 text-meta leading-snug text-[var(--color-muted)]">
          Mejor con listas propias o de álbum; las mezclas automáticas de YouTube a veces no se dejan reproducir fuera de YouTube.
        </p>
        <div className="mt-4 border-t border-[var(--color-line)] pt-4">
          <MusicLists current={m.config?.url ?? null} />
        </div>
      </div>
    );
  }

  const thumb = m.videoId ? `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg` : null;
  return (
    <div className="panel-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="card-title">Música</h2>
        <div className="-mr-2 flex items-center text-sm text-[var(--color-muted)]">
          <button onClick={() => setEditing(true)} className="tap-target rounded-full px-3 underline">
            Cambiar
          </button>
          <button
            onClick={() => {
              clearMusic();
              showToast("Música desconectada");
            }}
            className="tap-target rounded-full px-3 underline"
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
          <div className="truncate text-sm font-semibold">{m.title || waitingText(m)}</div>
          <div className="truncate text-meta text-[var(--color-muted)]">{m.author || (m.title || !m.ready ? "" : "El nombre de la canción aparece al sonar")}</div>
        </div>
        <Controls playing={m.playing} />
      </div>

      {m.error ? (
        <p role="alert" className="mt-3 text-meta text-[var(--color-warn)]">
          {m.error}
        </p>
      ) : null}

      <button
        onClick={() => setMusicSync(!m.config!.sync)}
        role="switch"
        aria-checked={m.config.sync}
        className="mt-3 flex min-h-[var(--control-h)] w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-line-strong)] px-3 py-2.5 text-left"
      >
        <span className="text-sm">
          Sonar solo durante el bloque
          <span className="block text-meta text-[var(--color-muted)]">Empieza con el bloque y se pausa con el cronómetro y en los descansos.</span>
        </span>
        <span aria-hidden className={`relative h-6 w-10 flex-none rounded-full border transition-colors ${m.config.sync ? "border-transparent bg-[rgb(var(--accent-solid-rgb))]" : "border-[var(--color-line-strong)] bg-[var(--color-surface-2)]"}`}>
          <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${m.config.sync ? "left-[18px] bg-[var(--text-on-accent)]" : "left-0.5 bg-[var(--color-muted)]"}`} />
        </span>
      </button>

      <div className="mt-4">
        <MusicLists current={m.config.url} />
      </div>
    </div>
  );
}

/** Inside the full-screen timer: the live player (the video itself, kept
 * visible as YouTube requires), the song's name and the controls. */
export function MusicZen() {
  const m = useMusic();
  const slotRef = useRef<HTMLDivElement>(null);
  const showSlot = !!m.config && m.started;
  const lyricsOn = useLyricsPref();
  const lyrics = useLyrics(m.videoId, m.title, m.author, lyricsOn && showSlot);
  const offset = useLyricsOffset(m.videoId);
  const lists = useMusicLists();

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    return registerMusicSlot(el);
  }, [showSlot]);

  if (!m.config) return null;
  if (!m.started) {
    return (
      <button onClick={playMusic} className="glass tap-target rounded-full px-5 text-sm font-semibold text-[var(--color-muted)]">
        Reproducir música
      </button>
    );
  }
  // Two siblings for the timer screen's row: the song card, and the lyrics
  // beside it (below it when there isn't the width). On a phone, with lyrics on,
  // the card shrinks to one row so the lyrics get the screen.
  const compact = lyricsOn;
  return (
    <>
      <div
        className={`flex w-full max-w-[340px] flex-none flex-col items-center gap-3 rounded-[28px] border border-[var(--color-line-strong)] bg-[rgb(var(--fg-rgb)/0.03)] p-3 ${
          compact ? "max-md:max-w-none max-md:flex-row max-md:gap-3 max-md:rounded-2xl max-md:p-2.5" : ""
        }`}
      >
        {/* The player itself is laid over this box by MusicHost (it has to stay
            visible); 16:9 so the video fills it with no bars of its own. */}
        <div ref={slotRef} className={`aspect-video w-full rounded-2xl bg-black ${compact ? "max-md:w-[38%] max-md:flex-none" : ""}`} />
        <div className={`flex w-full min-w-0 flex-col items-center gap-3 ${compact ? "max-md:flex-1 max-md:items-start max-md:gap-2" : ""}`}>
          <div className={`w-full min-w-0 px-1 text-center ${compact ? "max-md:px-0 max-md:text-left" : ""}`}>
            <div className="truncate text-base font-semibold leading-tight">{m.title || waitingText(m)}</div>
            <div className="mt-0.5 truncate text-meta text-[var(--color-muted)]">{m.error ?? m.author}</div>
          </div>
          <div className={`flex flex-col items-center gap-3 ${compact ? "max-md:flex-row max-md:flex-wrap max-md:gap-2" : ""}`}>
            <Controls playing={m.playing} big={!compact} />
            {lyricsOn && lyrics.status === "found" ? (
              <div role="group" aria-label="Ajustar el tiempo de la letra" className="glass flex items-center rounded-full">
                <button onClick={() => setLyricsOffset(m.videoId, offset - OFFSET_STEP)} aria-label="Letra más tarde" className="hit flex h-9 w-9 items-center justify-center text-base text-[var(--color-muted)]">
                  −
                </button>
                <button onClick={() => setLyricsOffset(m.videoId, 0)} aria-label="Restablecer el tiempo de la letra" title="Restablecer" className="num tap-target min-w-[3.6rem] px-1 text-center text-meta font-semibold text-[var(--color-ink)]">
                  {formatOffset(offset)}
                </button>
                <button onClick={() => setLyricsOffset(m.videoId, offset + OFFSET_STEP)} aria-label="Letra más temprano" className="hit flex h-9 w-9 items-center justify-center text-base text-[var(--color-muted)]">
                  +
                </button>
              </div>
            ) : null}
            <button
              onClick={() => setLyricsPref(!lyricsOn)}
              aria-pressed={lyricsOn}
              className={`glass tap-target rounded-full px-5 text-sm font-semibold ${lyricsOn ? "" : "text-[var(--color-muted)]"} ${compact ? "max-md:px-4" : ""}`}
            >
              Letra
            </button>
          </div>
          {/* Switch the music without leaving the timer: your lists as a row you can scroll. */}
          {lists.length > 1 ? (
            <div role="group" aria-label="Cambiar de lista" className="no-scrollbar flex w-full max-w-full gap-1.5 overflow-x-auto pb-0.5">
              {lists.map((l) => {
                const active = l.url === m.config?.url;
                return (
                  <button
                    key={l.url}
                    onClick={() => {
                      if (!active && saveMusicConfig(l.url)) playMusic();
                    }}
                    aria-pressed={active}
                    className={`glass tap-target max-w-[9rem] flex-none truncate rounded-full px-4 text-sm font-semibold ${active ? "" : "text-[var(--color-muted)]"}`}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      {lyricsOn ? <Lyrics key={m.videoId} lines={lyrics.lines} status={lyrics.status} playing={m.playing} offset={offset} /> : null}
    </>
  );
}
