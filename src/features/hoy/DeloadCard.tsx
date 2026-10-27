import { useState } from "react";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { addDays, todayISO } from "@/lib/date";
import { deloadDue } from "@/lib/deload";
import type { DeloadState } from "@/lib/deload";
import { Button, Card, CardTitle } from "@/ui";
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
  const trained = useRecentActivity()?.setDates;
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
      <p className="mt-2 text-sm leading-snug">
        Llevas <span className="num font-semibold">{weeks}</span> semanas seguidas entrenando fuerte. Una semana más suave (los mismos ejercicios con ~60 % del peso, o la mitad de las series) te ayuda a recuperar y a seguir subiendo después.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            save({ doneAt: today });
            showToast("Anotado — a recuperar");
          }}
        >
          Hago la descarga
        </Button>
        <Button variant="ghost" onClick={() => save({ ...state, snoozeUntil: addDays(today, 7) })}>
          En una semana
        </Button>
      </div>
    </Card>
  );
}
