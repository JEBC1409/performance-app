import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { BackupError, importBackup, importBackupData, previewBackup, validateBackup } from "../jsonBackup";

const set = (extra: Record<string, unknown> = {}) => ({ date: "2026-09-05", day: "A", exercise: "Press", setIndex: 1, weight: 60, reps: 8, toFailure: null, rpe: null, note: "", createdAt: 1000, ...extra });
const backup = (extra: Record<string, unknown> = {}) => ({ v: 1, exportedAt: "2026-09-06T00:00:00.000Z", sets: [set()], habitDays: [{ date: "2026-09-05", done: ["sleep"] }], ...extra });

beforeEach(async () => {
  await Promise.all([db.sets.clear(), db.habitDays.clear(), db.weights.clear(), db.focusSessions.clear(), db.sleep.clear(), db.savedVerses.clear(), db.outbox.clear()]);
});

describe("validateBackup", () => {
  it("accepts a well-formed backup", () => {
    const res = validateBackup(backup());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.v).toBe(1);
      expect(Object.keys(res.backup.tables).sort()).toEqual(["habitDays", "sets"]);
    }
  });

  it("rejects things that aren't a backup, in Spanish", () => {
    for (const bad of [null, "x", 42, [], [backup()]]) {
      const res = validateBackup(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors[0]).toMatch(/no es una copia de PERFORMANCE/);
    }
  });

  it("rejects a newer version and an invalid one", () => {
    const newer = validateBackup(backup({ v: 2 }));
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.errors[0]).toMatch(/versión más nueva/);
    expect(validateBackup(backup({ v: "1" })).ok).toBe(false);
  });

  it("a file with no version is accepted as v1 with a warning; one with no known table is rejected", () => {
    const { v: _v, ...noVersion } = backup();
    const res = validateBackup(noVersion);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.warnings[0]).toMatch(/no indica su versión/);
    const empty = validateBackup({ v: 1, algo: [] });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors[0]).toMatch(/ninguna tabla conocida/);
  });

  it("rejects tables that aren't lists and rows with wrong or missing fields", () => {
    const notList = validateBackup(backup({ sets: { a: 1 } }));
    expect(notList.ok).toBe(false);
    if (!notList.ok) expect(notList.errors).toContain("«sets» debería ser una lista.");

    const res = validateBackup(backup({ sets: [set(), set({ reps: "ocho" }), set({ date: "ayer" }), { exercise: "x" }, 7] }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toContain("«sets», fila 2: «reps» debería ser un número.");
      expect(res.errors).toContain("«sets», fila 3: «date» debería ser una fecha AAAA-MM-DD.");
      expect(res.errors).toContain("«sets», fila 4: falta «date».");
      expect(res.errors).toContain("«sets», fila 5: no es un registro válido.");
    }
  });

  it("caps the number of messages", () => {
    const res = validateBackup(backup({ sets: Array.from({ length: 100 }, () => ({})) }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeLessThanOrEqual(10);
  });

  it("warns about unknown top-level data but accepts the file", () => {
    const res = validateBackup(backup({ extra: [1] }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.warnings.join(" ")).toMatch(/extra/);
  });
});

describe("previewBackup", () => {
  it("counts rows per table and says which tables get replaced", () => {
    const p = previewBackup(backup({ sets: [set(), set({ setIndex: 2 })], weights: [{ date: "2026-09-05", weightKg: 80 }] }));
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.counts.sets).toBe(2);
      expect(p.counts.habitDays).toBe(1);
      expect(p.counts.weights).toBe(1);
      expect(p.counts.sleep).toBe(0);
      expect(p.total).toBe(4);
      expect(p.replaces).toEqual(["sets", "weights"]);
    }
  });

  it("returns the errors for a bad file", () => {
    const p = previewBackup({ v: 1, sets: "no" });
    expect(p.ok).toBe(false);
  });
});

describe("importBackupData", () => {
  it("rejects a malformed backup without touching the data", async () => {
    await db.sets.add({ ...set({ exercise: "Existente" }), remoteId: "keep-1" } as never);
    await db.habitDays.put({ date: "2026-01-01", done: ["a"] });
    await expect(importBackupData(backup({ sets: [set(), set({ setIndex: "x" })] }))).rejects.toBeInstanceOf(BackupError);
    expect((await db.sets.toArray()).map((s) => s.exercise)).toEqual(["Existente"]);
    expect(await db.habitDays.count()).toBe(1);
  });

  it("keeps existing remoteIds", async () => {
    await importBackupData(backup({ sets: [set({ remoteId: "r-1" }), set({ setIndex: 2, remoteId: "r-2" })] }));
    expect((await db.sets.toArray()).sort((a, b) => a.setIndex - b.setIndex).map((s) => s.remoteId)).toEqual(["r-1", "r-2"]);
  });

  it("replaces id-keyed tables and merges keyed ones", async () => {
    await db.sets.add({ ...set({ exercise: "Viejo" }), remoteId: "old" } as never);
    await db.habitDays.put({ date: "2026-01-01", done: ["a"] });
    await importBackupData(backup());
    expect((await db.sets.toArray()).map((s) => s.exercise)).toEqual(["Press"]);
    expect((await db.habitDays.toArray()).map((h) => h.date).sort()).toEqual(["2026-01-01", "2026-09-05"]);
  });

  it("rows without remoteId reuse the id of the matching local row, so the cloud isn't duplicated", async () => {
    await db.sets.add({ ...set(), remoteId: "cloud-id-1" } as never);
    await db.sets.add({ ...set({ setIndex: 2, createdAt: 2000 }), remoteId: "cloud-id-2" } as never);
    // An old backup: same sets, no remoteId, plus a brand new one.
    await importBackupData(backup({ sets: [set(), set({ setIndex: 2, createdAt: 2000 }), set({ setIndex: 3, createdAt: 3000 })] }));
    const rows = (await db.sets.toArray()).sort((a, b) => a.setIndex - b.setIndex);
    expect(rows.map((r) => r.remoteId).slice(0, 2)).toEqual(["cloud-id-1", "cloud-id-2"]);
    expect(rows[2].remoteId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Set(rows.map((r) => r.remoteId)).size).toBe(3);
  });

  it("two identical rows in the file never share a reused id", async () => {
    await db.sets.add({ ...set(), remoteId: "only-one" } as never);
    await importBackupData(backup({ sets: [set(), set()] }));
    const ids = (await db.sets.toArray()).map((r) => r.remoteId);
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain("only-one");
  });

  it("importBackup reads a File and reports unreadable JSON in Spanish", async () => {
    await importBackup(new File([JSON.stringify(backup())], "b.json", { type: "application/json" }));
    expect(await db.sets.count()).toBe(1);
    await expect(importBackup(new File(["{ no es json"], "b.json"))).rejects.toThrow(/no es un JSON válido/);
    expect(await db.sets.count()).toBe(1);
  });
});
