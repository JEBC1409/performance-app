import { afterEach, describe, expect, it } from "vitest";
import { GYM_DIAS, applyRoutine, currentRoutineConfig, defaultRoutine, sanitizeRoutine } from "@/data/gym";
import { HORARIO, HORARIO_TIMES, applyHorario, defaultHorario, labelStartMin, sanitizeHorario } from "@/data/horario";
import { groupForExercise } from "@/data/muscleGroups";
import { applyStoredConfig } from "../appConfig";

afterEach(() => {
  applyRoutine(defaultRoutine());
  applyHorario(defaultHorario());
});

describe("routine config", () => {
  it("the built-in routine is valid and round-trips", () => {
    const d = defaultRoutine();
    expect(sanitizeRoutine(d)).toEqual(d);
    expect(sanitizeRoutine(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it("rejects anything malformed instead of half-applying it", () => {
    const bad = defaultRoutine();
    bad.A.ex[1].name = bad.A.ex[0].name; // duplicate name
    expect(sanitizeRoutine(bad)).toBeNull();
    const noSeries = defaultRoutine();
    (noSeries.B.ex[0] as { series: unknown }).series = 0;
    expect(sanitizeRoutine(noSeries)).toBeNull();
    expect(sanitizeRoutine(null)).toBeNull();
    expect(sanitizeRoutine({ A: {} })).toBeNull();
  });

  it("applying a routine updates the live GYM_DIAS in place, and registers muscle groups", () => {
    const ref = GYM_DIAS.A.ex; // an importer holding the array must see the change
    const cfg = defaultRoutine();
    cfg.A.nombre = "TIRÓN";
    cfg.A.ex.push({ name: "Dominadas lastradas", series: 4, repsLabel: "5-8", group: "espalda" });
    applyRoutine(cfg);
    expect(GYM_DIAS.A.nombre).toBe("TIRÓN");
    expect(ref).toBe(GYM_DIAS.A.ex);
    expect(ref[ref.length - 1].name).toBe("Dominadas lastradas");
    expect(groupForExercise("Dominadas lastradas")).toBe("espalda");
    expect(currentRoutineConfig().A.ex).toHaveLength(cfg.A.ex.length);
  });
});

describe("schedule config", () => {
  it("the built-in schedule is valid and rebuilds the same grid", () => {
    const before = JSON.stringify(HORARIO);
    const cfg = defaultHorario();
    expect(sanitizeHorario(cfg)).toEqual(cfg);
    applyHorario(cfg);
    expect(JSON.stringify(HORARIO)).toBe(before);
  });

  it("rejects overlapping blocks, bad labels and out-of-range rows", () => {
    const overlap = defaultHorario();
    overlap.days[0][1].from = overlap.days[0][0].to; // touches the previous block
    expect(sanitizeHorario(overlap)).toBeNull();
    const badLabel = defaultHorario();
    badLabel.times[0] = "cinco";
    expect(sanitizeHorario(badLabel)).toBeNull();
    const outOfRange = defaultHorario();
    outOfRange.days[2][0].to = 999;
    expect(sanitizeHorario(outOfRange)).toBeNull();
    expect(sanitizeHorario({ times: ["5:00"], days: [] })).toBeNull();
  });

  it("editing a block's text shows up across all rows it spans", () => {
    const cfg = defaultHorario();
    const sat = cfg.days[5].find((sg) => sg.to > sg.from)!;
    sat.cell.text = "Otra cosa";
    applyHorario(cfg);
    const rows = HORARIO.map((r) => r.cells[5]).filter((c) => c.text === "Otra cosa");
    expect(rows).toHaveLength(sat.to - sat.from + 1);
    expect(rows[0].span).toBe(sat.to - sat.from + 1);
    expect(rows.slice(1).every((c) => c.cont)).toBe(true);
  });

  it("orders labels by their start time", () => {
    expect(labelStartMin("5:15-5:40")).toBe(315);
    expect(labelStartMin("22:00")).toBe(1320);
    expect(HORARIO_TIMES.length).toBe(HORARIO.length);
  });
});

describe("applyStoredConfig", () => {
  it("applies stored config and falls back to defaults when it's missing or invalid", () => {
    const cfg = defaultRoutine();
    cfg.C.nombre = "PIERNAS";
    applyStoredConfig([{ key: "routine", value: cfg, updatedAt: 1 }]);
    expect(GYM_DIAS.C.nombre).toBe("PIERNAS");

    applyStoredConfig([{ key: "routine", value: { nope: true }, updatedAt: 2 }]);
    expect(GYM_DIAS.C.nombre).toBe("PIERNAS + CORE");

    applyStoredConfig([]);
    expect(GYM_DIAS.C.nombre).toBe("PIERNAS + CORE");
  });
});
