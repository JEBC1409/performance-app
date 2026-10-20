import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reopenDb = vi.fn();
vi.mock("@/db/recover", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/db/recover")>()), reopenDb: () => reopenDb() }));

const { ScreenError } = await import("../ScreenError");
const { isDbConnectionError } = await import("@/db/recover");

beforeEach(() => {
  reopenDb.mockReset();
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

  it("an ordinary error just shows the message", () => {
    render(<ScreenError error={new Error("algo raro")} reset={() => {}} />);
    expect(screen.getByText("No se pudo cargar esta pantalla")).toBeInTheDocument();
    expect(screen.getByText("algo raro")).toBeInTheDocument();
    expect(reopenDb).not.toHaveBeenCalled();
  });
});
