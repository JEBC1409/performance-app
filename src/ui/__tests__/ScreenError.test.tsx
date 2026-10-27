import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reopenDb = vi.fn();
const checkCloud = vi.fn();
const restoreFromCloud = vi.fn();
vi.mock("@/db/restore", () => ({ checkCloud: () => checkCloud(), restoreFromCloud: (opts?: unknown) => restoreFromCloud(opts) }));
vi.mock("@/db/recover", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/db/recover")>()), reopenDb: () => reopenDb() }));

const { ScreenError } = await import("../ScreenError");
const { isDbConnectionError } = await import("@/db/recover");

beforeEach(() => {
  reopenDb.mockReset();
  checkCloud.mockReset();
  restoreFromCloud.mockReset();
  sessionStorage.clear();
});
afterEach(cleanup);

const idbError = () => Object.assign(new Error("UnknownError: Unable to open cursor"), { name: "UnknownError" });

describe("isDbConnectionError", () => {
  it("spots the phone's database-connection failures", () => {
    expect(isDbConnectionError(idbError())).toBe(true);
    expect(isDbConnectionError(Object.assign(new Error("x"), { name: "DatabaseClosedError" }))).toBe(true);
    expect(isDbConnectionError(Object.assign(new Error("y"), { name: "InvalidStateError" }))).toBe(true);
  });
  it("leaves ordinary bugs alone", () => {
    expect(isDbConnectionError(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(isDbConnectionError(null)).toBe(false);
  });
});

describe("ScreenError", () => {
  it("reopens the database by itself and retries the screen", async () => {
    reopenDb.mockResolvedValue(undefined);
    const reset = vi.fn();
    render(<ScreenError error={idbError()} reset={reset} />);
    await waitFor(() => expect(reset).toHaveBeenCalled());
    expect(reopenDb).toHaveBeenCalledTimes(1);
  });

  it("shows the database message with a manual button when the reopen fails", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    render(<ScreenError error={idbError()} reset={() => {}} />);
    expect(await screen.findByText(/no abre tus datos/i)).toBeInTheDocument();
    expect(screen.getByText(/Sigue sin abrir/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reabrir datos/i })).toBeInTheDocument();
  });

  it("does not loop: a second crash within 20 s waits for the user", async () => {
    reopenDb.mockResolvedValue(undefined);
    const { unmount } = render(<ScreenError error={idbError()} reset={() => {}} />);
    await waitFor(() => expect(reopenDb).toHaveBeenCalledTimes(1));
    unmount();
    render(<ScreenError error={idbError()} reset={() => {}} />);
    expect(await screen.findByRole("button", { name: /Reabrir datos/i })).toBeInTheDocument();
    expect(reopenDb).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Reabrir datos/i }));
    await waitFor(() => expect(reopenDb).toHaveBeenCalledTimes(2));
  });

  it("offers to restore from the account, shows what is there, and only wipes after confirming", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: true, sets: 670, days: 40, pending: 0 });
    restoreFromCloud.mockResolvedValue(undefined);
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByText(/670 series y 40 días/)).toBeInTheDocument();
    expect(restoreFromCloud).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Restaurar$/ }));
    await waitFor(() => expect(restoreFromCloud).toHaveBeenCalledTimes(1));
    expect(restoreFromCloud).toHaveBeenCalledWith(undefined); // nothing pending: no force needed
  });

  it("with changes not uploaded yet, warns how many would be lost and needs a second tap", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: true, sets: 670, days: 40, pending: 3 });
    restoreFromCloud.mockResolvedValue(undefined);
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByText(/Tienes 3 cambios sin subir; se perderían/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Restaurar$/ }));
    expect(restoreFromCloud).not.toHaveBeenCalled();
    expect(screen.getByText(/Toca de nuevo para confirmar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sí, borrar y restaurar/ }));
    await waitFor(() => expect(restoreFromCloud).toHaveBeenCalledTimes(1));
    expect(restoreFromCloud).toHaveBeenCalledWith({ force: true });
  });

  it("says it in the singular for one pending change", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: true, sets: 1, days: 1, pending: 1 });
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByText(/Tienes 1 cambio sin subir; se perdería/)).toBeInTheDocument();
  });

  it("when the pending changes can't be counted, asks for the reinforced confirmation too", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: true, sets: 670, days: 40, pending: null });
    restoreFromCloud.mockResolvedValue(undefined);
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByText(/No pude comprobar si tienes cambios sin subir/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Restaurar$/ }));
    expect(restoreFromCloud).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Sí, borrar y restaurar/ }));
    await waitFor(() => expect(restoreFromCloud).toHaveBeenCalledWith({ force: true }));
  });

  it("cancelling after the first tap resets the confirmation", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: true, sets: 5, days: 5, pending: 2 });
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Restaurar$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByRole("button", { name: /^Restaurar$/ })).toBeInTheDocument();
    expect(restoreFromCloud).not.toHaveBeenCalled();
  });

  it("refuses to restore when the cloud has nothing, and wipes nothing", async () => {
    reopenDb.mockRejectedValue(new Error("still broken"));
    checkCloud.mockResolvedValue({ ok: false, why: "En la nube no hay datos guardados." });
    render(<ScreenError error={idbError()} reset={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restaurar desde mi cuenta/i }));
    expect(await screen.findByText(/no hay datos guardados. No se borró nada/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Restaurar$/ })).toBeNull();
    expect(restoreFromCloud).not.toHaveBeenCalled();
  });

  it("an ordinary error just shows the message", () => {
    render(<ScreenError error={new Error("algo raro")} reset={() => {}} />);
    expect(screen.getByText("No se pudo cargar esta pantalla")).toBeInTheDocument();
    expect(screen.getByText("algo raro")).toBeInTheDocument();
    expect(reopenDb).not.toHaveBeenCalled();
  });
});
