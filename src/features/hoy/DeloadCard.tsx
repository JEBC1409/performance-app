import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { addDays, todayISO } from "@/lib/date";
import { deloadDue } from "@/lib/deload";
import type { DeloadState } from "@/lib/deload";
import { Card, CardTitle } from "@/ui";
import { showToast } from "@/ui/Toast";

const KEY = "performance_deload_v1";

function readState(): DeloadState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as DeloadState;
    return { doneAt: typeof raw.doneAt === "string" ? raw.doneAt : undefined, snoozeUntil: typeof raw.snoozeUntil === "string" ? raw.snoozeUntil : undefined };
  } catch {
    return {};
  }
}

/** Suggests a lighter week after several hard ones in a row. */
export function DeloadCard() {
  const [state, setState] = useState<DeloadState>(readState);
  const trained = useLiveQuery(async () => (await db.sets.orderBy("date").uniqueKeys()) as string[], []);
  const today = todayISO();
  const weeks = trained ? deloadDue(trained, today, state) : null;
  if (weeks == null) return null;

  function save(next: DeloadState) {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* it just comes back next time */
    }
  }

  return (
    <Card className="enter">
      <CardTitle>Semana de descarga</CardTitle>
      <p className="mt-2 text-[13px] leading-snug">
        Llevas <span className="num font-semibold">{weeks}</span> semanas seguidas entrenando fuerte. Una semana más suave (los mismos ejercicios con ~60 % del peso, o la mitad de las series) te ayuda a recuperar y a seguir subiendo después.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            save({ doneAt: today });
            showToast("Anotado — a recuperar");
          }}
          className="glass-on tap-target rounded-full px-4 text-[12px] font-semibold uppercase tracking-wide"
        >
          Hago la descarga
        </button>
        <button onClick={() => save({ ...state, snoozeUntil: addDays(today, 7) })} className="glass tap-target rounded-full px-4 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          En una semana
        </button>
      </div>
    </Card>
  );
}
