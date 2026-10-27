import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { previewBackup } from "@/lib/jsonBackup";
import { ImportBackupSheet, type PendingImport } from "../ImportBackupSheet";

afterEach(cleanup);

function pendingFrom(json: unknown, current: PendingImport["current"] = {}): PendingImport {
  const preview = previewBackup(json);
  if (!preview.ok) throw new Error("fixture must be valid");
  return { fileName: "copia.json", preview, current };
}

const FILE = {
  v: 1,
  exportedAt: "2026-10-01T10:00:00.000Z",
  sets: [{ date: "2026-10-01", exercise: "Press", setIndex: 1, createdAt: 1 }],
  habitDays: [{ date: "2026-10-01", done: ["a"] }],
  extra: true,
};

function setup(overrides: Partial<Parameters<typeof ImportBackupSheet>[0]> = {}) {
  const props = { pending: pendingFrom(FILE, { sets: 670 }), onClose: vi.fn(), onConfirm: vi.fn(), onExport: vi.fn(), ...overrides };
  render(<ImportBackupSheet {...props} />);
  return props;
}

describe("ImportBackupSheet", () => {
  it("renders nothing without a pending file", () => {
    setup({ pending: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says which tables are replaced, with what you have now and what the file brings", () => {
    setup();
    const replaced = screen.getByRole("region", { name: "Se reemplazan" });
    expect(within(replaced).getByText("Series de entreno")).toBeTruthy();
    expect(replaced.textContent).toContain("670 →");
    expect(replaced.textContent).toContain("se borra");
    // habitDays is merged, not replaced
    expect(within(replaced).queryByText("Días de hábitos")).toBeNull();
    const merged = screen.getByRole("region", { name: "Se combinan" });
    expect(within(merged).getByText("Días de hábitos")).toBeTruthy();
  });

  it("shows the warnings of the file and invites to export first", () => {
    const props = setup();
    expect(screen.getByText(/Se ignorarán datos que esta app no conoce: extra/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Exportar copia actual/ }));
    expect(props.onExport).toHaveBeenCalledOnce();
  });

  it("only confirms through the explicit button, and can be cancelled", () => {
    const props = setup();
    expect(props.onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reemplazar e importar" }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("disables both actions while importing", () => {
    setup({ busy: true });
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Importando…" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not list a replaced table that is empty on both sides", () => {
    setup({ pending: pendingFrom({ v: 1, weights: [], habitDays: [{ date: "2026-10-01", done: [] }] }, { weights: 0 }) });
    expect(screen.queryByRole("region", { name: "Se reemplazan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Importar" })).toBeTruthy();
  });
});
