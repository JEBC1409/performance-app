import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/ui", () => ({
  NavGlyph: () => null,
  AmbientBackground: () => null,
  JourneyTicker: () => <span data-testid="ticker" />,
  SyncStatusDot: () => <span data-testid="sync" />,
}));
vi.mock("@/ui/OfflineBanner", () => ({ OfflineBanner: () => null }));
vi.mock("@/hooks/useUiPrefs", () => ({ useUiPrefs: () => ({ navTabs: ["hoy", "entreno", "habitos", "datos"] }) }));

const { Shell } = await import("../Shell");

function mockViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop && query.includes("900px"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  // @ts-expect-error jsdom has no matchMedia by default
  delete window.matchMedia;
});

describe("Shell", () => {
  it("on desktop mounts a single header (one ticker, one sync dot) and the top pill, not the dock", () => {
    mockViewport(true);
    const onChange = vi.fn();
    render(
      <Shell active="hoy" onChange={onChange}>
        <p>contenido</p>
      </Shell>,
    );
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByTestId("ticker")).toHaveLength(1);
    expect(screen.getAllByTestId("sync")).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Navegación" });
    expect(nav.querySelectorAll("button")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Perfil" }));
    expect(onChange).toHaveBeenCalledWith("perfil");
    expect(screen.queryByRole("button", { name: /Más secciones/ })).toBeNull();
  });

  it("on a phone mounts a single header and the dock", () => {
    mockViewport(false);
    render(
      <Shell active="hoy" onChange={() => {}}>
        <p>contenido</p>
      </Shell>,
    );
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByTestId("ticker")).toHaveLength(1);
    expect(screen.getAllByTestId("sync")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Más secciones" })).toBeInTheDocument();
  });

  it("falls back to the phone layout where matchMedia does not exist", () => {
    render(
      <Shell active="hoy" onChange={() => {}}>
        <p>contenido</p>
      </Shell>,
    );
    expect(screen.getAllByTestId("ticker")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Más secciones" })).toBeInTheDocument();
  });
});
