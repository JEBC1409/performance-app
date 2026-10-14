import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let now = 0;
const seek = vi.fn();
vi.mock("@/lib/focusMusic", () => ({ getMusicTime: () => ({ t: now, duration: 200 }), seekMusic: (s: number) => seek(s) }));

const { Lyrics } = await import("../Lyrics");

const LINES = [
  { t: 5, text: "primera" },
  { t: 10, text: "segunda" },
  { t: 15, text: "" },
  { t: 20, text: "tercera" },
];

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  seek.mockClear();
  // jsdom has no layout/scroll
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Lyrics", () => {
  it("highlights the line being sung as the song advances", () => {
    render(<Lyrics lines={LINES} status="found" playing />);
    expect(document.querySelector("[aria-current]")).toBeNull();

    now = 10.1;
    act(() => void vi.advanceTimersByTime(250));
    expect(screen.getByRole("button", { name: "segunda" })).toHaveAttribute("aria-current", "true");

    now = 21;
    act(() => void vi.advanceTimersByTime(250));
    expect(screen.getByRole("button", { name: "tercera" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "segunda" })).not.toHaveAttribute("aria-current");
  });

  it("tapping a line jumps the song to it, and instrumental gaps show a note", () => {
    render(<Lyrics lines={LINES} status="found" playing={false} />);
    fireEvent.click(screen.getByRole("button", { name: "segunda" }));
    expect(seek).toHaveBeenCalledWith(10);
    expect(screen.getByLabelText("Instrumental")).toBeInTheDocument();
  });

  it("says what's going on when there are no lyrics", () => {
    const { rerender } = render(<Lyrics lines={[]} status="loading" playing />);
    expect(screen.getByRole("status")).toHaveTextContent(/Buscando/i);
    rerender(<Lyrics lines={[]} status="none" playing />);
    expect(screen.getByRole("status")).toHaveTextContent(/No encontré la letra/i);
    rerender(<Lyrics lines={[]} status="error" playing />);
    expect(screen.getByRole("status")).toHaveTextContent(/No pude cargar/i);
  });
});
