import { useEffect, useRef, useState } from "react";
import { isDbConnectionError, reopenDb } from "@/db/recover";
import { repairAndReload } from "@/lib/repair";

const GUARD_KEY = "performance_db_reopen_at";

/** One automatic reopen per 20 s, so a database that stays broken shows the message instead of looping. */
function claimAutoReopen(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < 20_000) return false;
    sessionStorage.setItem(GUARD_KEY, String(now));
  } catch {
    /* no sessionStorage: allow it once per mount */
  }
  return true;
}

/** What a screen shows when it crashes. If the cause is the phone's database
 * connection, it reopens it by itself and retries before bothering you. */
export function ScreenError({ error, reset }: { error: Error; reset: () => void }) {
  const dbProblem = isDbConnectionError(error);
  const [busy, setBusy] = useState(dbProblem);
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  async function reopen() {
    setBusy(true);
    setFailed(false);
    try {
      await reopenDb();
      reset();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!dbProblem || tried.current) return;
    tried.current = true;
    if (claimAutoReopen()) void reopen();
    else setBusy(false);
    // reopen/reset are stable for this mount; run once per crash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (busy) {
    return (
      <div className="panel-surface p-5 text-center" role="status">
        <div className="eyebrow eyebrow-accent pulse">Reabriendo tus datos…</div>
      </div>
    );
  }

  return (
    <div className="panel-surface p-5 text-center" role="alert">
      <div className="eyebrow eyebrow-accent">{dbProblem ? "El celular no abre tus datos" : "No se pudo cargar esta pantalla"}</div>
      <p className="mt-2 text-[13px] text-[var(--color-muted)]">
        {dbProblem
          ? "Cierra la app por completo (deslízala fuera de las recientes) y ábrela otra vez. Si sigue igual, reinicia el celular. Tus datos siguen guardados."
          : "Puede ser la conexión o una versión vieja guardada. Tus datos están a salvo."}
      </p>
      {failed ? <p className="mt-1.5 text-[12px] text-[var(--color-warn)]">Sigue sin abrir.</p> : null}
      <p className="num mt-2 break-words text-[12px] text-[var(--color-muted-2)]">{error.message}</p>
      <div className="mt-4 flex flex-col items-center gap-2">
        {dbProblem ? (
          <button onClick={() => void reopen()} className="glass-on tap-target rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
            Reabrir datos
          </button>
        ) : null}
        <button onClick={() => void repairAndReload()} className="glass tap-target rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
          Reintentar
        </button>
      </div>
    </div>
  );
}
