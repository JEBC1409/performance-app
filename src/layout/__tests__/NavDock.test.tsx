import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavDock } from "../NavDock";

afterEach(cleanup);

const tabs = [
  { key: "hoy", label: "Hoy" },
  { key: "entreno", label: "Entreno" },
] as const;
const more = [
  { key: "horario", label: "Horario" },
  { key: "perfil", label: "Perfil" },
] as const;

describe("NavDock", () => {
  it("shows the pinned screens and marks the current one", () => {
    render(<NavDock active="entreno" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Entreno" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Hoy" })).not.toHaveAttribute("aria-current");
  });

  it("goes to a pinned screen in one tap", () => {
    const onChange = vi.fn();
    render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Entreno" }));
    expect(onChange).toHaveBeenCalledWith("entreno");
  });

  it("opens the rest under Más, navigates and closes", () => {
    const onChange = vi.fn();
    render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={onChange} />);
    expect(screen.queryByText("Horario")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Más secciones" }));
    fireEvent.click(screen.getByText("Perfil"));
    expect(onChange).toHaveBeenCalledWith("perfil");
    expect(screen.queryByText("Horario")).toBeNull();
  });

  it("lights up Más when the current screen lives there, and says which one it is", () => {
    render(<NavDock active="perfil" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
    const button = screen.getByRole("button", { name: /^Más secciones/ });
    expect(button).toHaveAttribute("aria-current", "page");
    expect(button).toHaveTextContent("Perfil");
    expect(button).not.toHaveTextContent("Más");
  });

  it("shows plain 'Más' when the current screen is a pinned one", () => {
    render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
    const button = screen.getByRole("button", { name: "Más secciones" });
    expect(button).not.toHaveAttribute("aria-current");
    expect(button).toHaveTextContent("Más");
  });

  describe("the Más panel as a modal", () => {
    it("moves focus inside on open (to the current screen's tile)", () => {
      render(<NavDock active="perfil" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: /^Más secciones/ }));
      const dialog = screen.getByRole("dialog", { name: "Más secciones" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Perfil" }));
    });

    it("focuses the first tile when the current screen is not in the panel", () => {
      render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: "Más secciones" }));
      expect(document.activeElement).toBe(within(screen.getByRole("dialog")).getByRole("button", { name: "Horario" }));
    });

    it("closes with Escape and gives focus back to the Más button", () => {
      const onChange = vi.fn();
      render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={onChange} />);
      const opener = screen.getByRole("button", { name: "Más secciones" });
      opener.focus();
      fireEvent.click(opener);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(opener);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("returns focus to the Más button even when the tap never focused it (Safari)", () => {
      render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
      const opener = screen.getByRole("button", { name: "Más secciones" });
      (document.activeElement as HTMLElement | null)?.blur();
      fireEvent.click(opener);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(document.activeElement).toBe(opener);
    });

    it("keeps Tab inside the panel (wraps at both ends)", () => {
      render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: "Más secciones" }));
      const dialog = screen.getByRole("dialog");
      const first = within(dialog).getByRole("button", { name: "Horario" });
      const last = within(dialog).getByRole("button", { name: "Perfil" });
      last.focus();
      fireEvent.keyDown(window, { key: "Tab" });
      expect(document.activeElement).toBe(first);
      fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(last);
    });

    it("closes when the scrim is tapped", () => {
      render(<NavDock active="hoy" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: "Más secciones" }));
      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog.firstElementChild as HTMLElement);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("has no Más button when everything is pinned", () => {
    render(<NavDock active="hoy" tabs={[...tabs]} more={[]} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Más secciones" })).toBeNull();
  });
});
