import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

afterEach(cleanup);

function Boom(): never {
  throw new Error("pantalla rota");
}

describe("ErrorBoundary", () => {
  it("hands the error to a local fallback so it can be shown", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={(_reset, error) => <p>falló: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("falló: pantalla rota")).toBeInTheDocument();
  });

  it("a new key starts clean, so one broken screen doesn't poison the next", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary key="a" fallback={() => <p>error</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("error")).toBeInTheDocument();
    rerender(
      <ErrorBoundary key="b" fallback={() => <p>error</p>}>
        <p>todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("todo bien")).toBeInTheDocument();
  });
});
