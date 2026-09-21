import { describe, expect, it } from "vitest";
import { HORARIO, HORARIO_TIMES } from "@/data/horario";
import type { HabitDefRecord } from "@/db/db";
import { habitForBlock } from "../habits";

const defs: HabitDefRecord[] = [
  { key: "moure", label: "MoureDev", icon: "square", order: 0 },
  { key: "biblia", label: "Biblia", icon: "circle", order: 1 },
  { key: "agua", label: "Agua 2L+", icon: "bars", order: 2 },
];
const cell = (time: string, day = 0) => HORARIO[HORARIO_TIMES.indexOf(time)].cells[day];

describe("habitForBlock", () => {
  it("links the morning MoureDev block to the MoureDev habit", () => {
    expect(habitForBlock(cell("8:50-9:50"), defs)?.key).toBe("moure");
  });
  it("links Bible blocks (weekday and weekend) to the Biblia habit", () => {
    expect(habitForBlock(cell("5:15-5:40"), defs)?.key).toBe("biblia");
    expect(habitForBlock(cell("5:15-5:40", 5), defs)?.key).toBe("biblia");
  });
  it("does nothing for the optional evening MoureDev, other blocks, or a missing habit", () => {
    expect(habitForBlock(cell("20:30-21:15"), defs)).toBeNull(); // soft
    expect(habitForBlock(cell("10:00-12:20"), defs)).toBeNull(); // gym
    expect(habitForBlock(null, defs)).toBeNull();
    expect(habitForBlock(cell("8:50-9:50"), defs.filter((d) => d.key !== "moure"))).toBeNull();
  });
});
