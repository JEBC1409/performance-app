import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { resolvePhoto } from "./photos";
import { resizeImageToDataUrl } from "@/lib/image";
import { showToast } from "@/ui/Toast";

/** In the exercise sheet: preview + choose/replace/remove your own photo. */
export function ExercisePhotoEditor({ name }: { name: string }) {
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

  async function setCaption(caption: string) {
    if (!custom) return;
    await db.exercisePhotos.put({ ...custom, caption: caption.trim() || undefined });
  }

  return (
    <div className="mb-4">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-2)]">
        {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : null}
        {custom?.caption ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink)]">
            {custom.caption}
          </span>
        ) : null}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="glass tap-target flex-1 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink)] hover:text-[var(--color-red)] disabled:opacity-50"
        >
          {custom ? "Cambiar foto" : "Poner mi foto"}
        </button>
        {custom ? (
          <button
            onClick={() => db.exercisePhotos.delete(name)}
            className="glass tap-target rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] hover:text-[var(--color-red)]"
          >
            Quitar
          </button>
        ) : null}
      </div>
      {custom ? (
        <input
          defaultValue={custom.caption ?? ""}
          onBlur={(e) => setCaption(e.target.value)}
          maxLength={40}
          placeholder="¿Quién es? Ej. Dorian Yates"
          className="mt-2 w-full rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
        />
      ) : null}
    </div>
  );
}
