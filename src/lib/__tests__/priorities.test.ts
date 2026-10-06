import { describe, expect, it } from "vitest";
import { addItem, closeDay, planFor, progress, prune, removeItem, sanitizePriorities, toggleItem } from "../priorities";

const D = "2026-10-06";

describe("priorities", () => {
  it("adds up to three, trimmed, with no empties or duplicates", () => {
    let s = addItem({}, D, "  Estudiar React  ");
    s = addItem(s, D, "");
    s = addItem(s, D, "estudiar react");
    s = addItem(s, D, "Gym");
    s = addItem(s, D, "Llamar a mamá");
    s = addItem(s, D, "Cuarta cosa");
    expect(planFor(s, D).items.map((i) => i.text)).toEqual(["Estudiar React", "Gym", "Llamar a mamá"]);
  });

  it("ticks and removes", () => {
    let s = addItem(addItem({}, D, "A"), D, "B");
    const [a, b] = planFor(s, D).items;
    s = toggleItem(s, D, a.id);
    expect(progress(planFor(s, D))).toEqual({ done: 1, total: 2 });
    s = removeItem(s, D, b.id);
    expect(progress(planFor(s, D))).toEqual({ done: 1, total: 1 });
  });

  it("closing the day keeps the note and hands unfinished priorities to tomorrow", () => {
    let s = addItem(addItem(addItem({}, D, "Hecha"), D, "Pendiente 1"), D, "Pendiente 2");
    s = toggleItem(s, D, planFor(s, D).items[0].id);
    s = closeDay(s, D, "  Buen enfoque  ", true, 123);
    expect(planFor(s, D).close).toEqual({ note: "Buen enfoque", at: 123 });
    expect(planFor(s, "2026-10-07").items.map((i) => i.text)).toEqual(["Pendiente 1", "Pendiente 2"]);
    expect(planFor(s, "2026-10-07").items.every((i) => !i.done)).toBe(true);
  });

  it("can close without carrying over", () => {
    const s = closeDay(addItem({}, D, "Pendiente"), D, "", false);
    expect(planFor(s, "2026-10-07").items).toEqual([]);
  });

  it("only carries what fits in tomorrow's three", () => {
    let s = addItem(addItem({}, "2026-10-07", "X"), "2026-10-07", "Y");
    s = addItem(addItem(s, D, "P1"), D, "P2");
    s = closeDay(s, D, "", true);
    expect(planFor(s, "2026-10-07").items.map((i) => i.text)).toEqual(["X", "Y", "P1"]);
  });

  it("prunes old days and sanitises junk from sync", () => {
    const s = { "2026-09-01": { items: [] }, [D]: { items: [] } };
    expect(Object.keys(prune(s, D))).toEqual([D]);
    expect(sanitizePriorities(null)).toEqual({});
    const clean = sanitizePriorities({ [D]: { items: [{ id: "1", text: "ok", done: true }, { id: 2, text: "bad" }, { id: "3", text: " " }] }, mañana: { items: [] } });
    expect(Object.keys(clean)).toEqual([D]);
    expect(clean[D].items).toEqual([{ id: "1", text: "ok", done: true }]);
  });
});
