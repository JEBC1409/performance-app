import { useEffect, useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { fmtRelativeTime } from "@/lib/date";
import { retrySync } from "@/db/cloudSync";
import { showToast } from "./Toast";

const DOT_COLOR: Record<string, string> = {
  idle: "var(--color-good)",
  syncing: "var(--color-red)",
  offline: "var(--color-muted-2)",
  error: "var(--color-red)",
};

/** Small always-visible sync indicator — cloud sync used to be entirely
 * silent, so a failed push or a stretch offline gave no signal at all.
 * Tapping it while in error state surfaces the actual error via a toast. */
export function SyncStatusDot() {
  const status = useSyncStatus();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const n = status.queued;
  const changes = `${n} ${n === 1 ? "cambio" : "cambios"}`;
  let label: string;
  if (status.state === "offline") label = n ? `Sin conexión · ${changes} por subir` : "Sin conexión";
  else if (status.state === "syncing") label = n ? `Subiendo ${changes}…` : "Sincronizando…";
  else if (status.state === "error") label = n ? `Error de sync · ${changes} por subir` : "Error de sync";
  else if (n) label = `${changes} por subir`;
  else label = status.lastSyncedAt ? `Sincronizado ${fmtRelativeTime(status.lastSyncedAt)}` : "Sincronizado";
  // Anything waiting (or failed) can be retried with a tap.
  const dotColor = n > 0 && status.state !== "syncing" && status.state !== "error" ? "#e0a030" : DOT_COLOR[status.state];
  const canRetry = status.state !== "offline" && status.state !== "syncing" && (n > 0 || status.state === "error");

  return (
    <button
      type="button"
      onClick={() => {
        if (status.state === "error" && status.lastError) showToast(status.lastError);
        else if (status.state === "offline" && n) showToast("Tus cambios están guardados aquí; se suben al volver la conexión");
        if (canRetry) retrySync();
      }}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-none ${status.state === "syncing" ? "animate-pulse" : ""}`}
        style={{ background: dotColor, boxShadow: status.state !== "offline" || n > 0 ? `0 0 6px ${dotColor}` : "none" }}
      />
      <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted-2)]">{label}</span>
    </button>
  );
}
