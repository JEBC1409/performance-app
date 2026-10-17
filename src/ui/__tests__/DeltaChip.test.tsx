import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DeltaChip } from "../DeltaChip";
import { Headline } from "../Headline";

afterEach(cleanup);

const colorOf = (el: HTMLElement) => el.style.color;

describe("DeltaChip", () => {
  it("shows nothing without a value", () => {
    const { container } = render(<DeltaChip diff={null} />);
    expect(container.textContent).toBe("");
  });

  it("shows the size and direction, with its label and unit", () => {
    render(<DeltaChip diff={0.74} unit="kg" label="en 30 días" />);
    expect(screen.getByText(/▲ 0\.7 kg/)).toBeInTheDocument();
    expect(screen.getByText("en 30 días")).toBeInTheDocument();
  });

  it("colours by whether that direction is the win", () => {
    const { rerender } = render(<DeltaChip diff={1} good="up" />);
    expect(colorOf(screen.getByText(/▲/))).toContain("good");
    rerender(<DeltaChip diff={1} good="down" />);
    expect(colorOf(screen.getByText(/▲/))).toContain("warn");
    rerender(<DeltaChip diff={-1} good="down" />);
    expect(colorOf(screen.getByText(/▼/))).toContain("good");
    rerender(<DeltaChip diff={-1} good="neutral" />);
    expect(colorOf(screen.getByText(/▼/))).toContain("muted");
  });

  it("calls a tiny change 'igual' instead of showing ▲ 0.0", () => {
    render(<DeltaChip diff={0.02} unit="kg" />);
    expect(screen.getByText(/= igual/)).toBeInTheDocument();
    expect(screen.queryByText(/▲/)).toBeNull();
  });

  it("respects the digits it is asked for", () => {
    render(<DeltaChip diff={12} digits={0} flat={1} unit="series" />);
    expect(screen.getByText(/▲ 12 series/)).toBeInTheDocument();
  });
});

describe("Headline", () => {
  it("puts the figure first, with its unit, caption and changes", () => {
    render(<Headline value="72.5" unit="kg" caption="Último registro · 17 oct" deltas={<span>cambios</span>} />);
    expect(screen.getByText("72.5")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.getByText("Último registro · 17 oct")).toBeInTheDocument();
    expect(screen.getByText("cambios")).toBeInTheDocument();
  });
});
