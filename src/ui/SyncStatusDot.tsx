import { useEffect, useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { fmtRelativeTime } from "@/lib/date";
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

  let label: string;
  if (status.state === "syncing") label = "Sincronizando…";
  else if (status.state === "offline") label = "Sin conexión";
  else if (status.state === "error") label = "Error de sync";
  else label = status.lastSyncedAt ? `Sincronizado ${fmtRelativeTime(status.lastSyncedAt)}` : "Sincronizado";

  return (
    <button
      type="button"
      onClick={() => {
        if (status.state === "error" && status.lastError) showToast(status.lastError);
      }}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-none ${status.state === "syncing" ? "animate-pulse" : ""}`}
        style={{ background: DOT_COLOR[status.state], boxShadow: status.state !== "offline" ? `0 0 6px ${DOT_COLOR[status.state]}` : "none" }}
      />
      <span className="text-[9px] uppercase tracking-wide text-[var(--color-muted-2)]">{label}</span>
    </button>
  );
}
