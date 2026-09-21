import { GYM_DAY_ORDER } from "@/data/gym";
import type { RoutineConfig } from "@/data/gym";

/** Problems that would stop a routine from being saved, in plain words. */
export function routineProblems(cfg: RoutineConfig): string[] {
  const out: string[] = [];
  for (const d of GYM_DAY_ORDER) {
    const day = cfg[d];
    if (!day.nombre.trim()) out.push(`Día ${d}: falta el nombre.`);
    if (day.ex.length === 0) out.push(`Día ${d}: agrega al menos un ejercicio.`);
    const seen = new Set<string>();
    day.ex.forEach((e, i) => {
      const n = e.name.trim();
      if (!n) out.push(`Día ${d}, ejercicio ${i + 1}: falta el nombre.`);
      else if (seen.has(n)) out.push(`Día ${d}: "${n}" está repetido.`);
      seen.add(n);
      if (!e.repsLabel.trim()) out.push(`Día ${d}, "${n || i + 1}": falta el rango de repeticiones.`);
    });
  }
  return out;
}

/** For every exercise whose starting weight or reps changed (matched by name),
 * stamps `startAsOf` with `today`, so the new value drives the suggestion from
 * today on instead of being outranked by older sessions. */
export function stampChangedStarts(before: RoutineConfig, after: RoutineConfig, today: string): RoutineConfig {
  const old = new Map<string, { kg?: number; reps?: number }>();
  for (const d of GYM_DAY_ORDER) for (const e of before[d].ex) old.set(e.name, { kg: e.startKg, reps: e.startReps });
  const out = JSON.parse(JSON.stringify(after)) as RoutineConfig;
  for (const d of GYM_DAY_ORDER) {
    for (const e of out[d].ex) {
      const prev = old.get(e.name);
      const hasStart = e.startKg != null || e.startReps != null;
      if (hasStart && (!prev || prev.kg !== e.startKg || prev.reps !== e.startReps)) e.startAsOf = today;
    }
  }
  return out;
}
