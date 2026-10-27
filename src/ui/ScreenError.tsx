import { useEffect, useRef, useState } from "react";
import { isDbConnectionError, reopenDb } from "@/db/recover";
import { checkCloud, restoreFromCloud, type CloudCheck } from "@/db/restore";
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
  // "Restaurar desde mi cuenta": null = not started, "checking", or what the cloud holds (or why it can't be used).
  const [restore, setRestore] = useState<null | "checking" | CloudCheck>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  // With changes that never reached the cloud (or when that can't be checked), restoring needs a second tap.
  const [armed, setArmed] = useState(false);

  async function startRestore() {
    setRestore("checking");
    setRestoreError(null);
    setArmed(false);
    setRestore(await checkCloud());
  }

  async function confirmRestore(force: boolean) {
    setRestoreError(null);
    try {
      await restoreFromCloud(force ? { force: true } : undefined);
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : String(e));
    }
  }

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
        {dbProblem && restore === null ? (
          <button onClick={() => void startRestore()} className="glass tap-target rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.1em]">
            Restaurar desde mi cuenta
          </button>
        ) : null}
      </div>

      {restore === "checking" ? <p className="mt-3 text-[12px] text-[var(--color-muted)]">Revisando tu cuenta…</p> : null}
      {restore && restore !== "checking" && !restore.ok ? <p className="mt-3 text-[12px] text-[var(--color-warn)]">{restore.why} No se borró nada.</p> : null}
      {restore && restore !== "checking" && restore.ok ? (
        <div className="mt-4 rounded-2xl border border-[var(--color-line-strong)] p-3 text-left" role="group" aria-label="Confirmar restauración">
          {restore.pending === 0 ? null : (
            <p className="mb-1.5 text-[13px] font-semibold text-[var(--color-warn)]" role="alert">
              {restore.pending == null
                ? "No pude comprobar si tienes cambios sin subir; si los hay, se perderían."
                : `Tienes ${restore.pending} ${restore.pending === 1 ? "cambio sin subir; se perdería" : "cambios sin subir; se perderían"}.`}
            </p>
          )}
          <p className="text-[13px] text-[var(--color-ink)]">
            En tu cuenta hay {restore.sets} series y {restore.days} días de hábitos.
          </p>
          <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
            Esto borra los datos guardados en este celular y los vuelve a bajar de tu cuenta. Lo que hayas anotado aquí y no se haya subido se perdería.
          </p>
          {armed ? (
            <p className="mt-1.5 text-[12px] text-[var(--color-warn)]">
              Toca de nuevo para confirmar. Se borrará lo guardado en este celular{restore.pending == null ? ", incluido lo que no se haya subido" : " y no podrás recuperar esos cambios"}.
            </p>
          ) : null}
          {restoreError ? (
            <p className="mt-1.5 text-[12px] text-[var(--color-warn)]">
              No se pudo: {restoreError}. Si sigue igual, borra los datos del sitio en los ajustes del navegador (en el iPhone: Ajustes → Safari → Avanzado → Datos de sitios web).
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setArmed(false);
                setRestore(null);
              }}
              className="glass tap-target flex-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.1em]"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (restore.pending === 0) void confirmRestore(false);
                else if (!armed) setArmed(true);
                else void confirmRestore(true);
              }}
              className="glass-on tap-target flex-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.1em]"
            >
              {armed ? "Sí, borrar y restaurar" : "Restaurar"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
