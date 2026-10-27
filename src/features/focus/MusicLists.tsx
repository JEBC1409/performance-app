import { useState } from "react";
import { clearMusic, playMusic, saveMusicConfig } from "@/lib/focusMusic";
import { MAX_LISTS, removeList, saveList, useMusicLists } from "@/lib/musicLists";
import { showToast } from "@/ui/Toast";

/** Ideas for naming a list by how you want the block to feel. */
const MOODS = ["Enfoque profundo", "Energía", "Calma", "Gimnasio"];

/** Your playlists by mood: tap one to switch the music, add as many as you like
 * (name + YouTube / YouTube Music link). Used on the Música card and on the
 * block's start screen, so the music can follow how you feel before you begin.
 *
 * `current` is the link playing now (to mark the active chip and offer saving it).
 * `playOnSelect` starts the music right when a list is chosen; leave it off to
 * only choose it — with "sonar solo durante el bloque" on, it then starts with
 * the block. `allowNone` adds a "Sin música" chip. */
export function MusicLists({ current, playOnSelect = true, allowNone = false, compact = false }: { current: string | null; playOnSelect?: boolean; allowNone?: boolean; compact?: boolean }) {
  const lists = useMusicLists();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  const currentSaved = current != null && lists.some((l) => l.url === current);

  function choose(url: string) {
    if (url === current) return;
    if (saveMusicConfig(url) && playOnSelect) playMusic();
  }

  function add(url: string = link) {
    if (!name.trim()) {
      showToast("Ponle un nombre a la lista");
      return;
    }
    if (!saveList(name, url)) {
      showToast("Pega un enlace de YouTube o YouTube Music");
      return;
    }
    // A list added while nothing is connected becomes the one to play.
    if (current == null) choose(url.trim());
    showToast(`Lista “${name.trim()}” guardada`);
    setName("");
    setLink("");
    setAdding(false);
  }

  const full = lists.length >= MAX_LISTS;

  return (
    <div>
      <div className="eyebrow mb-2">{compact ? "Música de este bloque" : "Mis listas"}</div>
      <div className="flex flex-wrap items-center gap-2">
        {allowNone ? (
          <button
            onClick={() => clearMusic()}
            aria-pressed={current == null}
            className={`glass tap-target rounded-full px-4 text-sm font-semibold ${current == null ? "" : "text-[var(--color-muted)]"}`}
          >
            Sin música
          </button>
        ) : null}
        {lists.map((l) => {
          const active = l.url === current;
          return (
            <span key={l.url} className={`flex min-h-[var(--control-h)] items-center rounded-full ${active ? "glass-sel" : "glass"}`}>
              <button onClick={() => choose(l.url)} aria-pressed={active} className={`min-h-[var(--control-h)] max-w-[11rem] truncate rounded-full pl-4 text-sm font-semibold ${compact ? "pr-4" : "pr-2"} ${active ? "" : "text-[var(--color-muted)]"}`}>
                {l.name}
              </button>
              {compact ? null : (
                <button onClick={() => removeList(l.url)} aria-label={`Quitar la lista ${l.name}`} className="hit mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-base opacity-70">
                  ×
                </button>
              )}
            </span>
          );
        })}
        {current != null && !currentSaved && !adding && !full ? (
          <button
            onClick={() => {
              setLink(current);
              setAdding(true);
            }}
            className="glass tap-target rounded-full px-4 text-sm font-semibold text-[var(--color-muted)]"
          >
            + Guardar esta lista
          </button>
        ) : null}
        {!adding && !full ? (
          <button
            onClick={() => {
              setLink("");
              setAdding(true);
            }}
            className="glass tap-target rounded-full px-4 text-sm font-semibold text-[var(--color-muted)]"
          >
            + Nueva lista
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-[var(--color-line-strong)] p-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ideas de nombre">
            {MOODS.map((m) => (
              <button key={m} onClick={() => setName(m)} className="glass min-h-9 rounded-full px-3.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                {m}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-medium text-[var(--color-muted)]">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Cómo te sientes o qué vas a hacer"
              aria-label="Nombre de la lista"
              className="rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-base"
            />
          </label>
          {current != null && !currentSaved ? (
            <button onClick={() => setLink(current)} className="tap-target self-start rounded-full pr-3 text-sm text-[var(--color-muted)] underline">
              Usar la lista que suena ahora
            </button>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-meta font-medium text-[var(--color-muted)]">Enlace</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              inputMode="url"
              placeholder="https://music.youtube.com/playlist?list=…"
              aria-label="Enlace de la lista"
              className="rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-base"
            />
          </label>
          <div className="flex gap-2">
            <button onClick={() => add()} className="btn-primary tap-target rounded-full px-5 text-sm font-semibold">
              Guardar lista
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setName("");
                setLink("");
              }}
              className="tap-target rounded-full px-3 text-sm text-[var(--color-muted)] underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {full ? <p className="mt-2 text-meta text-[var(--color-muted)]">Máximo {MAX_LISTS} listas: quita una para agregar otra.</p> : null}
    </div>
  );
}
