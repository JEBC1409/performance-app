import { db, DEFAULT_SETTINGS, DEFAULT_HABIT_DEFS, type SetRecord } from "./db";
import type { GymDay } from "@/lib/cycle";
import { seedMouredev } from "@/data/mouredev";
import { parseNum } from "@/lib/parseNum";

interface RawSet {
  kg: number | string;
  reps: number | string;
}

function expandSession(
  day: GymDay,
  exercise: string,
  date: string,
  rawSets: RawSet[],
  rpeRaw: string,
  failedLast: boolean | null,
  baseNote: string,
): SetRecord[] {
  const rpeParts = rpeRaw ? rpeRaw.split("-").map((s) => s.trim()) : [];
  const createdAt = new Date(date).getTime() || Date.now();
  return rawSets.map((s, i) => {
    const w = parseNum(s.kg);
    const r = parseNum(s.reps);
    const noteParts = [baseNote, w.extra, r.extra].filter(Boolean);
    const rpeVal = rpeParts[i] !== undefined ? parseNum(rpeParts[i]).value : null;
    return {
      date,
      day,
      exercise,
      setIndex: i + 1,
      weight: w.value,
      reps: r.value,
      toFailure: i === rawSets.length - 1 ? failedLast : null,
      rpe: rpeVal,
      note: noteParts.join(" · "),
      createdAt: createdAt + i,
    };
  });
}

function seedSets(): SetRecord[] {
  const out: SetRecord[] = [];
  const add = (day: GymDay, exercise: string, date: string, sets: RawSet[], rpe: string, failedLast: boolean | null, note: string) => {
    out.push(...expandSession(day, exercise, date, sets, rpe, failedLast, note));
  };

  // Día A
  add("A", "Pullover en polea", "2026-08-04", [{ kg: 19, reps: 10 }], "10", false, "Adaptación");
  add("A", "Pullover en polea", "2026-08-08", [{ kg: 14.5, reps: 12 }, { kg: 23.5, reps: 8 }], "10", true, "");
  add("A", "Jalón al pecho agarre ancho", "2026-08-04", [{ kg: 52, reps: 10 }, { kg: 59, reps: 8 }, { kg: 59, reps: 7 }], "9-8-7", true, "Adaptación");
  add("A", "Jalón al pecho agarre ancho", "2026-08-11", [{ kg: 39, reps: 6 }, { kg: 66, reps: 6 }, { kg: 59, reps: 8 }, { kg: 59, reps: 7 }], "4-10-9-10", true, "Fuerza en avance");
  add("A", "Remo en máquina o barra", "2026-08-04", [{ kg: 60, reps: 10 }, { kg: 70, reps: 10 }, { kg: 70, reps: 8 }], "7-7-8", false, "Adaptación");
  add("A", "Remo en máquina o barra", "2026-08-08", [{ kg: 60, reps: 10 }, { kg: 60, reps: 10 }, { kg: 70, reps: 8 }], "10-7-7", true, "Mejor técnica");
  add("A", "Remo unilateral mancuerna", "2026-08-04", [{ kg: 110, reps: 8 }, { kg: 110, reps: 8 }], "8-7", true, "Adaptación");
  add("A", "Face pulls", "2026-08-04", [{ kg: 19, reps: 20 }, { kg: 19, reps: 15 }, { kg: 19, reps: 15 }], "8-7-7", false, "Adaptación");
  add("A", "Curl barra Z", "2026-08-04", [{ kg: 20, reps: 8 }, { kg: 20, reps: 8 }, { kg: 20, reps: 5 }], "10-8-8", true, "Adaptación");
  add("A", "Curl martillo", "2026-08-04", [{ kg: 14, reps: 5 }, { kg: 12, reps: 6 }, { kg: 12, reps: 4 }], "10-10-10", true, "Adaptación");

  // Día B
  add("B", "Aperturas mancuerna inclinado", "2026-08-05", [{ kg: 10, reps: 25 }], "10", true, "Adaptación");
  add("B", "Press inclinado mancuernas", "2026-08-05", [{ kg: 28, reps: 6 }, { kg: 28, reps: 6 }, { kg: 28, reps: 5 }], "7-9-10", true, "Adaptación");
  add("B", "Press plano en máquina", "2026-08-05", [{ kg: 41, reps: 10 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }], "10-8-7", true, "Adaptación");
  add("B", "Pec deck", "2026-08-05", [{ kg: 59, reps: 10 }, { kg: 59, reps: 10 }, { kg: 59, reps: 8 }], "10-8-7", true, "Adaptación");
  add("B", "Press militar mancuernas sentado", "2026-08-05", [{ kg: 20, reps: 10 }, { kg: 30, reps: 5 }, { kg: 30, reps: 5 }, { kg: 20, reps: 5 }], "8-10-10-10", true, "Adaptación");
  add("B", "Laterales mancuerna", "2026-08-05", [{ kg: 9, reps: 10 }, { kg: 9, reps: 10 }, { kg: 9, reps: 7 }, { kg: 3.5, reps: "25/lado" }], "10-8-7-9", true, "Dropset final 50%");
  add("B", "Fondos en paralelas", "2026-08-05", [{ kg: "peso corporal", reps: 8 }, { kg: "peso corporal", reps: 5 }], "26-10", true, "Solo dos series para no fatigarme");
  add("B", "Extensión trícep cuerda", "2026-08-05", [{ kg: 23.5, reps: 10 }, { kg: 23.5, reps: 10 }, { kg: 23.5, reps: 7 }, { kg: 14.5, reps: "dropset 10" }], "9-7-7-8", true, "Serie dropset extra");

  // Día C
  add("C", "Extensiones de piernas", "2026-08-06", [{ kg: 32, reps: 10 }, { kg: 45, reps: 10 }, { kg: 72, reps: 12 }], "10-6-6", true, "Adaptación");
  add("C", "Prensa / Hack squat", "2026-08-06", [{ kg: "100 (calent.)", reps: 10 }, { kg: 140, reps: 10 }, { kg: 180, reps: 10 }, { kg: 180, reps: 8 }], "9-8-7", true, "Adaptación");
  add("C", "Peso muerto rumano", "2026-08-06", [{ kg: 60, reps: 10 }, { kg: 80, reps: 8 }, { kg: 80, reps: 7 }], "8-7-7", false, "No se llevó al fallo, para evitar lesión");
  add("C", "Curl femoral acostado", "2026-08-06", [{ kg: 27, reps: 10 }, { kg: 36, reps: 8 }, { kg: 36, reps: 7 }, { kg: 36, reps: 7 }], "9-9-8", false, "Adaptación");
  add("C", "Extensión pantorrilla", "2026-08-06", [{ kg: 38, reps: 12 }, { kg: 45, reps: 10 }, { kg: 45, reps: 12 }], "8-8-8", false, "Adaptación");

  return out;
}

export async function seedIfNeeded(): Promise<void> {
  // Not gated by the `seeded` flag below (that's only for the one-time demo
  // data) — a brand-new install creates the Dexie database straight at the
  // latest schema version and never runs the v3 upgrade callback that seeds
  // habitDefs for an *existing* database, so this is the fresh-install path.
  if ((await db.habitDefs.count()) === 0) {
    await db.habitDefs.bulkAdd(DEFAULT_HABIT_DEFS);
  }

  const existing = await db.settings.get("app");
  if (existing?.seeded) return;

  await db.transaction("rw", db.sets, db.habitDays, db.weights, db.moureWeeks, db.settings, async () => {
    if ((await db.sets.count()) === 0) {
      await db.sets.bulkAdd(seedSets());
    }
    if ((await db.habitDays.count()) === 0) {
      const days = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"];
      await db.habitDays.bulkAdd(
        days.map((date) => ({
          date,
          done: date !== "2026-08-03" ? ["sleep", "water", "meals", "nophone"] : ["sleep", "water", "nophone"],
        })),
      );
    }
    if ((await db.weights.count()) === 0) {
      await db.weights.add({ date: "2026-08-01", weightKg: 72, pechoCm: null, brazoCm: null, note: "Inicio" });
    }
    if ((await db.moureWeeks.count()) === 0) {
      await db.moureWeeks.bulkAdd(seedMouredev());
    }
    await db.settings.put({ ...(existing ?? DEFAULT_SETTINGS), seeded: true });
  });
}
