import type { SetRecord } from "@/db/db";
import { GYM_DIAS } from "@/data/gym";
import type { GymDay } from "./cycle";
import { fmtDateHuman } from "./date";

function fmtSet(s: Pick<SetRecord, "weight" | "reps" | "toFailure">): string {
  const w = s.weight != null ? `${s.weight}kg` : "—";
  const r = s.reps != null ? `${s.reps}` : "—";
  return `${w}×${r}${s.toFailure ? " AF" : ""}`;
}

/** A copy-paste-ready recap of one training session — today's sets per
 * exercise next to the most recent prior session for that same exercise —
 * meant for pasting into a separate chat tracking long-term progress,
 * since training here isn't logged on a fixed weekly page but session by
 * session. No top-level "PERFORMANCE —" branding line here: this is always
 * nested under dailySummary.ts's own header, which already owns that. */
export function buildSessionSummary(day: GymDay, date: string, sessionSets: SetRecord[], allSets: SetRecord[]): string {
  const lines: string[] = [`ENTRENO — Día ${day} (${GYM_DIAS[day].nombre})`, ""];
  let totalSeries = 0;

  for (const ex of GYM_DIAS[day].ex) {
    const today = sessionSets.filter((s) => s.exercise === ex.name).sort((a, b) => a.setIndex - b.setIndex);
    if (!today.length) continue;
    totalSeries += today.length;

    const prior = allSets
      .filter((s) => s.exercise === ex.name && s.date !== date)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const lastDate = prior[0]?.date;
    const priorSets = lastDate ? prior.filter((s) => s.date === lastDate).sort((a, b) => a.setIndex - b.setIndex) : [];

    lines.push(`${ex.name}: ${today.map(fmtSet).join(", ")}`);
    if (priorSets.length) {
      lines.push(`  antes (${fmtDateHuman(lastDate)}): ${priorSets.map(fmtSet).join(", ")}`);
    }
  }

  lines.push("", `Total: ${totalSeries} series`);
  return lines.join("\n");
}
