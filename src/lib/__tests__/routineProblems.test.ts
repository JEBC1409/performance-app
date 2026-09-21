import { describe, expect, it } from "vitest";
import { defaultRoutine, sanitizeRoutine, startDate, START_WEIGHTS_AS_OF } from "@/data/gym";
import { routineProblems, stampChangedStarts } from "../routineProblems";

describe("routineProblems", () => {
  it("is empty for the built-in routine", () => {
    expect(routineProblems(defaultRoutine())).toEqual([]);
  });
  it("explains what's wrong in plain words", () => {
    const r = defaultRoutine();
    r.A.ex[0].name = "  ";
    r.B.ex[1].name = r.B.ex[0].name;
    r.C.ex = [];
    const p = routineProblems(r);
    expect(p.some((x) => x.includes("Día A") && x.includes("falta el nombre"))).toBe(true);
    expect(p.some((x) => x.includes("repetido"))).toBe(true);
    expect(p.some((x) => x.includes("Día C") && x.includes("al menos un ejercicio"))).toBe(true);
  });
});

describe("stampChangedStarts", () => {
  it("dates only the exercises whose starting weight or reps changed", () => {
    const before = defaultRoutine();
    const after = defaultRoutine();
    after.A.ex[0].startKg = 25; // changed
    after.A.ex.push({ name: "Nuevo", series: 3, repsLabel: "8-10", startKg: 40 }); // new with a weight
    const out = stampChangedStarts(before, after, "2026-10-05");
    expect(out.A.ex[0].startAsOf).toBe("2026-10-05");
    expect(out.A.ex.at(-1)!.startAsOf).toBe("2026-10-05");
    expect(out.A.ex[1].startAsOf).toBeUndefined(); // untouched
    expect(startDate(out.A.ex[1])).toBe(START_WEIGHTS_AS_OF);
    expect(startDate(out.A.ex[0])).toBe("2026-10-05");
  });
  it("survives validation with the stamp", () => {
    const before = defaultRoutine();
    const after = defaultRoutine();
    after.B.ex[0].startKg = 20;
    const clean = sanitizeRoutine(stampChangedStarts(before, after, "2026-10-05"))!;
    expect(clean.B.ex[0].startAsOf).toBe("2026-10-05");
  });
});
