import type { useNarrator } from "@/hooks/useNarrator";
import { PITCH_RANGE, RATE_RANGE } from "@/lib/narrator";
import { Sheet } from "@/ui";

type Narrator = ReturnType<typeof useNarrator>;

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
function SkipGlyph({ back = false }: { back?: boolean }) {
  return (
    <svg {...GLYPH} style={back ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M4 4.2v11.6a.6.6 0 0 0 .9.5l8-5.8a.6.6 0 0 0 0-1l-8-5.8a.6.6 0 0 0-.9.5Z" fill="currentColor" />
      <rect x="14" y="4" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
function SpeakerGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden>
      <path d="M3 7.5v5h3.2L11 16.5v-13L6.2 7.5H3Z" fill="currentColor" />
      <path d="M13.6 6.8a4.5 4.5 0 0 1 0 6.4M15.8 4.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** "Escuchar" in the reader's header: starts the chapter, or pauses/resumes it. */
export function ListenButton({ narrator }: { narrator: Narrator }) {
  if (!narrator.supported) return null;
  const playing = narrator.status === "playing";
  return (
    <button
      onClick={() => (playing ? narrator.pause() : narrator.status === "paused" ? narrator.play() : narrator.play(0))}
      aria-pressed={playing}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wide ${
        narrator.status === "idle" ? "glass text-[var(--color-muted)] hover:text-[var(--color-gold)]" : "glass-gold text-[var(--color-ink)]"
      }`}
    >
      <SpeakerGlyph />
      {playing ? "Pausar" : narrator.status === "paused" ? "Continuar" : "Escuchar"}
    </button>
  );
}

/** The player that floats while a chapter is being read: skip by verse, pause,
 * change the voice, stop. Stays on screen as you scroll. */
export function NarratorBar({ narrator, where, onVoice }: { narrator: Narrator; where: string; onVoice: () => void }) {
  if (!narrator.supported || narrator.status === "idle") return null;
  const playing = narrator.status === "playing";
  return (
    <>
      <div className="fixed bottom-[calc(5.75rem_+_env(safe-area-inset-bottom))] sidebar:bottom-4 left-0 right-0 z-40 flex justify-center px-4">
        <div
          role="group"
          aria-label="Lectura en voz alta"
          className="flex max-w-full items-center gap-1.5 rounded-2xl border border-[var(--color-line-strong)] px-2 py-2"
          style={{
            background: "linear-gradient(155deg, rgb(var(--fg-rgb)/0.05), rgb(var(--surface-rgb)/0.9) 55%, rgb(var(--bg-rgb)/0.92) 100%)",
            boxShadow: "0 18px 40px -20px rgba(0,0,0,0.85), 0 0 22px -8px rgb(var(--accent-rgb)/0.4)",
          }}
        >
          <button onClick={narrator.prev} aria-label="Versículo anterior" className="glass tap-target flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)]">
            <SkipGlyph back />
          </button>
          <button
            onClick={() => (playing ? narrator.pause() : narrator.play())}
            aria-label={playing ? "Pausar lectura" : "Continuar lectura"}
            className="glass-on tap-target flex h-11 w-11 items-center justify-center rounded-full text-white"
          >
            {playing ? <PauseGlyph /> : <PlayGlyph />}
          </button>
          <button onClick={narrator.next} aria-label="Versículo siguiente" className="glass tap-target flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)]">
            <SkipGlyph />
          </button>
          <div className="min-w-0 px-1.5">
            <div className="eyebrow eyebrow-gold">Leyendo</div>
            <div className="num truncate text-[12.5px] font-semibold">{where}</div>
          </div>
          <button onClick={onVoice} className="glass tap-target rounded-full px-2.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Voz
          </button>
          <button onClick={narrator.stop} aria-label="Detener lectura" className="glass tap-target flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)]">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <rect x="1.5" y="1.5" width="9" height="9" rx="1.6" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

const sleepMinutesLeft = (at: number) => Math.max(1, Math.ceil((at - Date.now()) / 60_000));

/** Choose the voice and how it sounds. A voice is picked by ear: tapping one says a sample. */
export function VoiceSheet({ narrator, open, onClose }: { narrator: Narrator; open: boolean; onClose: () => void }) {
  const { prefs, voices } = narrator;
  const active = voices.find((v) => v.voiceURI === prefs.voiceURI)?.voiceURI ?? voices[0]?.voiceURI ?? null;
  return (
    <Sheet open={open} onClose={onClose} title="Voz del narrador">
      <div className="flex flex-col gap-4">
        {voices.length === 0 ? (
          <p className="text-[12.5px] text-[var(--color-muted)]">
            Este dispositivo no tiene voces en español instaladas. En Android: Ajustes → Idioma → Texto a voz. En iPhone: Ajustes → Accesibilidad → Contenido leído → Voces. En Windows: Ajustes → Hora e idioma → Voz.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Voz" className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto pr-1">
            {voices.map((v) => (
              <button
                key={v.voiceURI}
                role="radio"
                aria-checked={v.voiceURI === active}
                onClick={() => {
                  narrator.setPrefs({ voiceURI: v.voiceURI });
                  narrator.preview(v.voiceURI);
                }}
                className={`rounded-xl px-3 py-2 text-left ${v.voiceURI === active ? "glass-on" : "glass"}`}
              >
                <span className="block text-[13px] font-semibold">{v.name.replace(/^Microsoft |^Google /, "")}</span>
                <span className={`block text-[12px] ${v.voiceURI === active ? "text-white/80" : "text-[var(--color-muted)]"}`}>{v.lang}</span>
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="flex items-baseline justify-between text-[12px]">
            <span className="font-semibold">Velocidad</span>
            <span className="num text-[var(--color-muted)]">{prefs.rate.toFixed(2)}×</span>
          </span>
          <input
            type="range"
            min={RATE_RANGE.min}
            max={RATE_RANGE.max}
            step={0.05}
            value={prefs.rate}
            onChange={(e) => narrator.setPrefs({ rate: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--color-red)]"
          />
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between text-[12px]">
            <span className="font-semibold">Tono</span>
            <span className="text-[var(--color-muted)]">{prefs.pitch < 0.8 ? "muy grave" : prefs.pitch < 0.95 ? "grave" : prefs.pitch < 1.05 ? "normal" : "agudo"}</span>
          </span>
          <input
            type="range"
            min={PITCH_RANGE.min}
            max={PITCH_RANGE.max}
            step={0.05}
            value={prefs.pitch}
            onChange={(e) => narrator.setPrefs({ pitch: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--color-red)]"
          />
        </label>
        <div>
          <div className="text-[12px] font-semibold">Apagar la lectura en</div>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Apagado automático">
            {[null, 15, 30, 60].map((m) => {
              const on = narrator.sleepMin === m;
              return (
                <button key={m ?? "off"} onClick={() => narrator.setSleep(m)} aria-pressed={on} className={`num rounded-full px-4 py-2 text-[12px] font-semibold ${on ? "glass-on" : "glass text-[var(--color-muted)]"}`}>
                  {m == null ? "Sin límite" : `${m} min`}
                </button>
              );
            })}
          </div>
          {narrator.sleepAt != null ? <p className="mt-2 text-[12px] text-[var(--color-muted)]">Se apaga en unos {sleepMinutesLeft(narrator.sleepAt)} min, al terminar el versículo.</p> : null}
        </div>
        <button onClick={() => narrator.preview(prefs.voiceURI)} className="glass tap-target rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em]">
          Probar la voz
        </button>
        <p className="text-[12px] leading-snug text-[var(--color-muted-2)]">
          La velocidad y el tono se aplican desde el siguiente versículo. Las voces con “Natural” u “Online” suenan mejor que las básicas.
        </p>
      </div>
    </Sheet>
  );
}
