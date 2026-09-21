import { useSyncStatus } from "@/hooks/useSyncStatus";

/** Shown while there's no connection. The app keeps working fully (data lives
 * on the device); this just says so, and that changes will upload themselves. */
export function OfflineBanner() {
  const { state, queued } = useSyncStatus();
  if (state !== "offline") return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-[rgba(224,160,48,0.35)] bg-[rgba(224,160,48,0.08)] px-4 py-2 text-[11.5px] leading-snug text-[#e8b657]"
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#e0a030]" />
      <span>
        Sin conexión. Sigue usando la app: tus cambios se guardan aquí
        {queued > 0 ? ` (${queued} por subir)` : ""} y se suben solos al volver.
      </span>
    </div>
  );
}
