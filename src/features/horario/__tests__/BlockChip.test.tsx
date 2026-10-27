import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BLOCK_TEXT } from "@/data/horario";
import type { HorarioCell } from "@/data/horario";
import { BlockChip } from "../BlockChip";

afterEach(cleanup);

const chip = (cell: HorarioCell) => render(<BlockChip cell={cell} />).container.firstElementChild as HTMLElement;

describe("BlockChip", () => {
  it("never paints block text in the accent colour (it failed contrast on the light theme)", () => {
    for (const color of Object.values(BLOCK_TEXT)) expect(color).not.toMatch(/red|accent|gold/);
  });

  it("a regular block reads in ink, with its type colour only on the border and the dot", () => {
    const el = chip({ text: "INGLÉS Blendex", type: "ingles" });
    expect(el.style.color).toBe("var(--color-ink)");
    expect(el.style.border).toContain("1px solid");
    expect(el.querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("the must-do block has a firmer border but no glow", () => {
    const el = chip({ text: "Pruebas y Calidad ★", type: "clase", key: true });
    expect(el.style.border).toContain("2px solid");
    expect(el.style.boxShadow).toBe("");
    expect(el.style.color).toBe("var(--color-ink)");
  });

  it("an optional block is dashed and muted, not faded with opacity", () => {
    const el = chip({ text: "Repaso", type: "mouredev", soft: true });
    expect(el.style.border).toContain("dashed");
    expect(el.style.color).toBe("var(--color-muted)");
    expect(el.style.opacity).toBe("");
  });
});
