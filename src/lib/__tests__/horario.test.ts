import { describe, expect, it } from "vitest";
import { HORARIO, HORARIO_TIMES } from "@/data/horario";
import { currentBlockInfo } from "../scheduleBlock";

describe("horario", () => {
  it("has a cell for every day in every row, and spans stay inside the table", () => {
    HORARIO.forEach((row) => expect(row.cells).toHaveLength(7));
    for (let day = 0; day < 7; day++) {
      HORARIO.forEach((row, r) => {
        const cell = row.cells[day];
        if (cell.span) {
          expect(r + cell.span).toBeLessThanOrEqual(HORARIO.length);
          for (let k = 1; k < cell.span; k++) expect(HORARIO[r + k].cells[day].cont).toBe(true);
        }
      });
    }
  });

  it("marks the morning MoureDev block Mon-Fri as key and the evening one as soft", () => {
    for (let day = 0; day < 5; day++) {
      expect(HORARIO[4].cells[day]).toMatchObject({ type: "mouredev", key: true });
    }
    for (let day = 0; day < 4; day++) {
      expect(HORARIO[13].cells[day]).toMatchObject({ type: "mouredev", soft: true });
    }
    expect(HORARIO[13].cells[4].soft).toBeUndefined();
  });

  it("resolves the current block, including gaps and single-time rows", () => {
    const monday = (h: number, m: number) => new Date(2026, 8, 21, h, m);
    expect(currentBlockInfo(monday(4, 59)).rowIndex).toBe(-1);
    expect(currentBlockInfo(monday(5, 0)).rowIndex).toBe(0);
    expect(currentBlockInfo(monday(9, 0)).rowIndex).toBe(HORARIO_TIMES.indexOf("8:50-9:50"));
    expect(currentBlockInfo(monday(12, 25)).rowIndex).toBe(HORARIO_TIMES.indexOf("10:00-12:20"));
    expect(currentBlockInfo(monday(22, 30)).rowIndex).toBe(HORARIO_TIMES.indexOf("22:00"));
  });
});
