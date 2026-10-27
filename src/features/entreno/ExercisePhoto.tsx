import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { resolvePhoto } from "./photos";
import { resizeImageToDataUrl } from "@/lib/image";
import { showToast } from "@/ui/Toast";

function CameraGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </svg>
  );
}

/** In the exercise sheet: a small preview of the exercise photo and an icon button
 * to choose or replace your own. The photo is reference, not the task, so it stays
 * a thumbnail in the header and leaves the screen to the weight and reps. */
export function ExercisePhotoThumb({ name, children }: { name: string; children?: ReactNode }) {
  const custom = useLiveQuery(() => db.exercisePhotos.get(name), [name]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { src } = resolvePhoto(name, custom);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 900);
      await db.exercisePhotos.put({ name, dataUrl, caption: custom?.caption });
      showToast("Foto actualizada");
    } catch {
      showToast("No se pudo procesar la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="relative h-16 w-[5.5rem] flex-none overflow-hidden rounded-xl [@media(max-height:700px)]:hidden border border-[var(--color-line)] bg-[var(--color-surface-2)]">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} aria-label="Elegir foto del ejercicio" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={custom ? "Cambiar mi foto" : "Poner mi foto"}
        title={custom ? "Cambiar mi foto" : "Poner mi foto"}
        className="glass hit flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] disabled:opacity-50"
      >
        <CameraGlyph />
      </button>
    </>
  );
}

/** Caption and remove, only once you have put your own photo. Below the form, out of the way. */
export function ExercisePhotoOptions({ name }: { name: string }) {
  const custom = useLiveQuery(() => db.exercisePhotos.get(name), [name]);
  if (!custom) return null;

  async function setCaption(caption: string) {
    if (!custom) return;
    await db.exercisePhotos.put({ ...custom, caption: caption.trim() || undefined });
  }

  return (
    <div className="flex items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[length:var(--fs-meta)] font-medium text-[var(--color-muted)]">Título de tu foto</span>
        <input
          defaultValue={custom.caption ?? ""}
          onBlur={(e) => setCaption(e.target.value)}
          maxLength={40}
          placeholder="Ej. Dorian Yates"
          className="w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-[length:var(--fs-sm)] placeholder:text-[var(--color-muted-2)]"
        />
      </label>
      <button onClick={() => db.exercisePhotos.delete(name)} className="glass btn flex-none rounded-full px-4 text-[length:var(--fs-sm)] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        Quitar foto
      </button>
    </div>
  );
}
