import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("lights up Más when the current screen lives there", () => {
    render(<NavDock active="perfil" tabs={[...tabs]} more={[...more]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Más secciones" })).toHaveAttribute("aria-current", "page");
  });

  it("has no Más button when everything is pinned", () => {
    render(<NavDock active="hoy" tabs={[...tabs]} more={[]} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Más secciones" })).toBeNull();
  });
});
