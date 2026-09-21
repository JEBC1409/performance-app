import { describe, expect, it } from "vitest";
import { HORARIO, HORARIO_TIMES, applyHorario, defaultHorario, sanitizeHorario } from "@/data/horario";
import type { HorarioConfig } from "@/data/horario";
import { clearBlock, insertRow, removeRow, renameRow, resizeBlock, segAt, setBlock, validTimeLabel } from "../horarioEdit";

const base = (): HorarioConfig => defaultHorario();
const valid = (c: HorarioConfig | null) => expect(sanitizeHorario(c)).not.toBeNull();

describe("horarioEdit", () => {
  it("validates row labels", () => {
    expect(validTimeLabel("5:00")).toBe(true);
    expect(validTimeLabel("16:35-17:30")).toBe(true);
    expect(validTimeLabel("25:00")).toBe(false);
    expect(validTimeLabel("nada")).toBe(false);
  });

  it("edits the block covering a slot, or creates one in an empty slot", () => {
    const cfg = base();
    const sat = 5;
    const row = HORARIO_TIMES.indexOf("6:00-7:30"); // Saturday class spans 2 rows
    const cell = { ...segAt(cfg, sat, row)!.cell, text: "Clase nueva" };
    const edited = setBlock(cfg, sat, row + 1, cell); // edit via the second row of the span
    expect(segAt(edited, sat, row)!.cell.text).toBe("Clase nueva");
    expect(segAt(edited, sat, row)!.to - segAt(edited, sat, row)!.from).toBe(1);

    const emptyRow = HORARIO_TIMES.indexOf("5:00");
    expect(segAt(cfg, 6, emptyRow)).toBeNull(); // Sunday 5:00 is empty
    const made = setBlock(cfg, 6, emptyRow, { text: "Correr", type: "otro" });
    expect(segAt(made, 6, emptyRow)!.cell.text).toBe("Correr");
    valid(made);
  });

  it("clears and resizes blocks", () => {
    const cfg = base();
    const row = HORARIO_TIMES.indexOf("6:00-7:30");
    expect(segAt(clearBlock(cfg, 5, row), 5, row)).toBeNull();
    const shorter = resizeBlock(cfg, 5, row, -1)!;
    expect(segAt(shorter, 5, row + 1)).toBeNull();
    expect(resizeBlock(shorter, 5, row, -1)).toBeNull(); // already one row
    const longer = resizeBlock(shorter, 5, row, 1)!;
    expect(segAt(longer, 5, row + 1)).not.toBeNull();
    // a taken next row cannot be absorbed
    expect(resizeBlock(cfg, 0, HORARIO_TIMES.indexOf("8:30"), 1)).toBeNull();
  });

  it("inserts a row in time order and keeps every block where it was", () => {
    const cfg = base();
    const res = insertRow(cfg, "9:55")!;
    expect(res.cfg.times[res.index]).toBe("9:55");
    expect(res.index).toBe(HORARIO_TIMES.indexOf("10:00-12:20"));
    valid(res.cfg);
    applyHorario(res.cfg);
    const gym = HORARIO_TIMES.indexOf("10:00-12:20");
    expect(HORARIO[gym].cells[0].text).toBe("Gym");
    applyHorario(defaultHorario());
    expect(insertRow(cfg, "5:00")).toBeNull(); // duplicate
    expect(insertRow(cfg, "xx")).toBeNull();
  });

  it("a block that straddles an inserted row just grows", () => {
    const cfg = base();
    const res = insertRow(cfg, "7:00")!; // inside Saturday 6:00-8:20 class
    const sat = res.cfg.days[5].find((s) => s.cell.text === "Pruebas y Calidad ★")!;
    expect(sat.to - sat.from).toBe(2);
    valid(res.cfg);
  });

  it("removes a row, dropping single-row blocks and shrinking longer ones", () => {
    const cfg = base();
    const r = HORARIO_TIMES.indexOf("7:30-8:20");
    const out = removeRow(cfg, r)!;
    expect(out.times).not.toContain("7:30-8:20");
    valid(out);
    expect(removeRow({ ...cfg, times: ["5:00"], days: cfg.days.map(() => []) }, 0)).toBeNull(); // keep at least one row
  });

  it("renames a row only if it stays in order", () => {
    const cfg = base();
    const r = HORARIO_TIMES.indexOf("6:00-7:30");
    expect(renameRow(cfg, r, "6:10-7:30")!.times[r]).toBe("6:10-7:30");
    expect(renameRow(cfg, r, "5:10-7:30")).toBeNull(); // before the previous row
    expect(renameRow(cfg, r, "7:40-8:00")).toBeNull(); // after the next row
    expect(renameRow(cfg, r, "??")).toBeNull();
  });
});
