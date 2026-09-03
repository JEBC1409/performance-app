import * as XLSX from "xlsx";
import { db, type SetRecord } from "@/db/db";
import type { GymDay } from "./cycle";
import { parseNum } from "./parseNum";
import { pad2 } from "./date";

export interface ImportSummary {
  sets: number;
  weights: number;
  moureWeeks: number;
  errors: string[];
}

function dayFromSheetName(name: string): GymDay | null {
  const m = name.trim().match(/d[ií]a\s*([abc])\s*$/i);
  return m ? (m[1].toUpperCase() as GymDay) : null;
}

function cellToISODate(v: unknown): string | null {
  // SheetJS's cellDates option always encodes the parsed calendar date in the UTC fields,
  // regardless of the runtime's local timezone — so this must read back via the UTC getters.
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad2(v.getUTCMonth() + 1)}-${pad2(v.getUTCDate())}`;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) return `${dmy[3]}-${pad2(Number(dmy[1]))}-${pad2(Number(dmy[2]))}`;
  }
  return null;
}

function parseGymLogSheet(rows: unknown[][], day: GymDay): SetRecord[] {
  const out: SetRecord[] = [];
  let currentExercise = "";
  let mode: "seek-label" | "seek-header" | "data" = "seek-label";

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const a = row[0];
    const isBlankRow = row.every((c) => c === undefined || c === "");
    if (isBlankRow) continue;

    if (typeof a === "string" && a.trim() === "FECHA") {
      mode = "data";
      continue;
    }
    if ((typeof a === "string" && a.trim() && row[1] === undefined) || mode === "seek-label") {
      if (typeof a === "string" && a.trim()) {
        currentExercise = a.trim();
        mode = "seek-header";
        continue;
      }
    }
    if (mode !== "data" || !currentExercise) continue;

    const date = cellToISODate(a);
    const rawSets = [
      { kg: row[1], reps: row[2] },
      { kg: row[3], reps: row[4] },
      { kg: row[5], reps: row[6] },
      { kg: row[7], reps: row[8] },
    ].filter((s) => s.kg !== undefined || s.reps !== undefined);
    if (!rawSets.length) continue;

    const failedRaw = String(row[9] ?? "").trim().toLowerCase();
    const failedLast = failedRaw.startsWith("s") ? true : failedRaw.startsWith("n") ? false : null;
    const note = String(row[11] ?? "").trim();
    const createdAt = (date ? new Date(date).getTime() : Date.now()) || Date.now();

    rawSets.forEach((s, i) => {
      const w = parseNum(s.kg);
      const rp = parseNum(s.reps);
      out.push({
        date: date ?? "",
        day,
        exercise: currentExercise,
        setIndex: i + 1,
        weight: w.value,
        reps: rp.value,
        toFailure: i === rawSets.length - 1 ? failedLast : null,
        rpe: null,
        note: [note, w.extra, rp.extra].filter(Boolean).join(" · "),
        createdAt: createdAt + i,
      });
    });
  }
  return out.filter((s) => s.date);
}

export async function importExcelFile(file: File): Promise<ImportSummary> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const summary: ImportSummary = { sets: 0, weights: 0, moureWeeks: 0, errors: [] };

  for (const name of wb.SheetNames) {
    const day = dayFromSheetName(name);
    if (day) {
      try {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true });
        const sets = parseGymLogSheet(rows, day);
        if (sets.length) {
          await db.sets.bulkAdd(sets);
          summary.sets += sets.length;
        }
      } catch (e) {
        summary.errors.push(`${name}: ${(e as Error).message}`);
      }
      continue;
    }

    if (/progreso\s*f[ií]sico/i.test(name)) {
      try {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true });
        for (let r = 3; r < rows.length; r++) {
          const row = rows[r] ?? [];
          const date = cellToISODate(row[1]);
          const weight = parseNum(row[2]).value;
          if (!date || weight == null) continue;
          const pecho = parseNum(row[4]).value;
          const brazo = parseNum(row[5]).value;
          const note = String(row[6] ?? "");
          const existing = await db.weights.where("date").equals(date).first();
          if (existing) await db.weights.update(existing.id!, { weightKg: weight, pechoCm: pecho, brazoCm: brazo, note });
          else await db.weights.add({ date, weightKg: weight, pechoCm: pecho, brazoCm: brazo, note });
          summary.weights++;
        }
      } catch (e) {
        summary.errors.push(`${name}: ${(e as Error).message}`);
      }
      continue;
    }

    if (/mouredev/i.test(name)) {
      try {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true });
        for (let r = 3; r < rows.length; r++) {
          const row = rows[r] ?? [];
          const week = parseNum(row[0]).value;
          if (week == null) continue;
          const date = cellToISODate(row[1]) ?? "";
          const topic = String(row[2] ?? "");
          const hours = parseNum(row[3]).value;
          const project = String(row[4] ?? "");
          const done = String(row[5] ?? "").includes("✓");
          if (!topic && !date && hours == null) continue;
          await db.moureWeeks.put({ week, date, topic, hours, project, done });
          summary.moureWeeks++;
        }
      } catch (e) {
        summary.errors.push(`${name}: ${(e as Error).message}`);
      }
    }
  }

  return summary;
}
