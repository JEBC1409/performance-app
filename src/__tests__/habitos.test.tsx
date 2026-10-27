import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const { db } = await import("@/db/db");
const { addDays, todayISO } = await import("@/lib/date");
const { Habitos } = await import("@/features/habitos/Habitos");

beforeEach(async () => {
  await Promise.all([db.habitDefs.clear(), db.habitDays.clear()]);
  await db.habitDefs.bulkAdd([
    { key: "agua", label: "Agua 2L+", icon: "bars", order: 0 },
    { key: "moure", label: "MoureDev", icon: "square", order: 1 },
  ]);
});
afterEach(() => cleanup());

describe("Hábitos", () => {
  it("opens on the week to tick, with one line for streaks and the chart folded while there is no data", async () => {
    render(<Habitos />);
    expect(await screen.findByRole("heading", { level: 1, name: "Hábitos" })).toBeInTheDocument();
    expect(await screen.findByText(/Ninguna activa todavía/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Consistencia del mes/i })).toHaveAttribute("aria-expanded", "false");
    // week navigation is touch-sized and labelled
    expect(screen.getByRole("button", { name: "Semana anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semana siguiente" })).toBeInTheDocument();
  });

  it("ticks today's habit from the week grid and shows the streak once there is one", async () => {
    const today = todayISO();
    await db.habitDays.bulkAdd([{ date: addDays(today, -1), done: ["agua"] }]);
    render(<Habitos />);
    const cells = await screen.findAllByRole("button", { name: /^Agua 2L\+, / });
    expect(cells).toHaveLength(7);
    const todayCell = cells.find((c) => c.className.includes("accent-text"));
    expect(todayCell).toBeDefined();
    fireEvent.click(todayCell!);
    await waitFor(async () => expect((await db.habitDays.get(today))?.done).toEqual(["agua"]));
    await waitFor(() => expect(screen.getByText(/Hoy:/).textContent).toMatch(/1\s*de 2 marcados/));
    // yesterday + today → a running streak, so the four-zeros line is gone
    await waitFor(() => expect(screen.queryByText(/Ninguna activa todavía/i)).not.toBeInTheDocument());
  });

  it("unfolds the chart on demand", async () => {
    render(<Habitos />);
    const toggle = await screen.findByRole("button", { name: /Consistencia del mes/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
