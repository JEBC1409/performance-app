import "fake-indexeddb/auto";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useBible", () => ({ useBible: () => ({ bible: null, loading: true }) }));

const { db } = await import("@/db/db");
const { todayISO } = await import("@/lib/date");
const { Hoy } = await import("@/features/hoy/Hoy");
const { Sheet } = await import("@/ui/Sheet");
const { RoutineEditor } = await import("@/features/perfil/RoutineEditor");
const { applyRoutine, defaultRoutine, GYM_DIAS } = await import("@/data/gym");

beforeEach(async () => {
  await Promise.all([db.habitDefs.clear(), db.habitDays.clear(), db.sets.clear(), db.appConfig.clear(), db.focusSessions.clear(), db.moureWeeks.clear(), db.weights.clear()]);
});

afterEach(() => {
  cleanup();
  applyRoutine(defaultRoutine());
});

describe("Hoy", () => {
  it("marks a habit with one tap and reflects it in the counters", async () => {
    await db.habitDefs.bulkAdd([
      { key: "agua", label: "Agua 2L+", icon: "bars", order: 0 },
      { key: "moure", label: "MoureDev", icon: "square", order: 1 },
    ]);
    render(<Hoy onStartEntreno={() => {}} onNavigate={() => {}} />);

    const tile = await screen.findByRole("button", { name: /Agua 2L\+/i });
    expect(tile).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(tile);

    await waitFor(async () => expect((await db.habitDays.get(todayISO()))?.done).toEqual(["agua"]));
    await waitFor(() => expect(screen.getByRole("button", { name: /Agua 2L\+/i })).toHaveAttribute("aria-pressed", "true"));

    // and it toggles back off
    fireEvent.click(screen.getByRole("button", { name: /Agua 2L\+/i }));
    await waitFor(async () => expect((await db.habitDays.get(todayISO()))?.done).toEqual([]));
  });

  it("shows the three day rings and the routine's day", async () => {
    render(<Hoy onStartEntreno={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByLabelText(/Anillos del día/i)).toBeInTheDocument();
    expect(screen.getByText(/Sesión del día/i)).toBeInTheDocument();
  });
});

describe("Sheet (modal behaviour)", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir</button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Prueba">
          <button>Uno</button>
          <button>Dos</button>
        </Sheet>
      </>
    );
  }

  it("moves focus in, keeps Tab inside, closes on Escape and returns focus", async () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Abrir" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole("dialog", { name: "Prueba" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.contains(document.activeElement)).toBe(true);

    const two = within(dialog).getByRole("button", { name: "Dos" });
    two.focus();
    fireEvent.keyDown(window, { key: "Tab" }); // past the last control → wraps to the first
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});

describe("RoutineEditor", () => {
  it("saves an edited routine to the account and applies it live", async () => {
    render(<RoutineEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    // open the first exercise and give it 5 sets
    const first = (await screen.findAllByRole("button", { expanded: false }))[0];
    fireEvent.click(first);
    const plus = await screen.findByRole("button", { name: /Aumentar/i });
    fireEvent.click(plus); // 3 → 4
    fireEvent.click(plus); // 4 → 5

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar rutina/i }));
    });

    await waitFor(async () => {
      const row = await db.appConfig.get("routine");
      expect((row?.value as { A: { ex: { series: number }[] } }).A.ex[0].series).toBe(5);
    });
  });

  it("refuses to save duplicate names and says why", async () => {
    render(<RoutineEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const [a, b] = await screen.findAllByRole("button", { expanded: false });
    fireEvent.click(a);
    const nameInput = (await screen.findAllByDisplayValue(GYM_DIAS.A.ex[0].name))[0];
    fireEvent.change(nameInput, { target: { value: GYM_DIAS.A.ex[1].name } }); // now equals the second
    void b;

    fireEvent.click(screen.getByRole("button", { name: /Guardar rutina/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/repetido/i);
    expect(await db.appConfig.get("routine")).toBeUndefined();
  });
});
