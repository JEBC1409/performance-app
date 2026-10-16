import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn((_url: string) => true);
const play = vi.fn();
const clear = vi.fn();
vi.mock("@/lib/focusMusic", () => ({ saveMusicConfig: (u: string) => save(u), playMusic: () => play(), clearMusic: () => clear() }));

const { MusicLists } = await import("../MusicLists");
const { removeList, useMusicLists } = await import("@/lib/musicLists");

const A = "https://music.youtube.com/playlist?list=PLaaaaaaaaaaaa";
const B = "https://www.youtube.com/playlist?list=PLbbbbbbbbbbbb";

function Harness(props: Partial<Parameters<typeof MusicLists>[0]>) {
  // re-render with the saved lists so removing is reflected
  useMusicLists();
  return <MusicLists current={null} {...props} />;
}

beforeEach(() => {
  save.mockClear();
  play.mockClear();
  clear.mockClear();
  localStorage.removeItem("performance_focus_music_lists_v1");
});
afterEach(() => {
  cleanup();
  for (const u of [A, B]) removeList(u);
});

function addList(name: string, link: string) {
  fireEvent.click(screen.getByRole("button", { name: /\+ Nueva lista/i }));
  fireEvent.change(screen.getByLabelText("Nombre de la lista"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Enlace de la lista"), { target: { value: link } });
  fireEvent.click(screen.getByRole("button", { name: /Guardar lista/i }));
}

describe("MusicLists", () => {
  it("adds several named lists and shows each as a chip", () => {
    render(<Harness current={A} />);
    addList("Enfoque profundo", A);
    addList("Energía", B);
    expect(screen.getByRole("button", { name: "Enfoque profundo" })).toHaveAttribute("aria-pressed", "true"); // the one playing
    expect(screen.getByRole("button", { name: "Energía" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switching to a list selects it and starts the music", () => {
    render(<Harness current={A} />);
    addList("Enfoque profundo", A);
    addList("Energía", B);
    fireEvent.click(screen.getByRole("button", { name: "Energía" }));
    expect(save).toHaveBeenCalledWith(B);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("with playOnSelect off it only selects (the block will start it)", () => {
    render(<Harness current={A} playOnSelect={false} />);
    addList("Calma", B);
    fireEvent.click(screen.getByRole("button", { name: "Calma" }));
    expect(save).toHaveBeenCalledWith(B);
    expect(play).not.toHaveBeenCalled();
  });

  it("refuses an empty name or a link that is not YouTube's", () => {
    render(<Harness />);
    addList("", A);
    expect(screen.getByLabelText("Nombre de la lista")).toBeInTheDocument(); // form still open
    fireEvent.change(screen.getByLabelText("Nombre de la lista"), { target: { value: "Rara" } });
    fireEvent.change(screen.getByLabelText("Enlace de la lista"), { target: { value: "https://example.com/x" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar lista/i }));
    expect(screen.queryByRole("button", { name: "Rara" })).toBeNull();
  });

  it("a list added while nothing is connected becomes the one that plays", () => {
    render(<Harness current={null} />);
    addList("Calma", A);
    expect(save).toHaveBeenCalledWith(A);
    expect(play).toHaveBeenCalled();
  });

  it("can remove a list, and offers 'Sin música' on the start screen", () => {
    render(<Harness current={A} allowNone compact={false} />);
    addList("Calma", A);
    fireEvent.click(screen.getByRole("button", { name: /Quitar la lista Calma/i }));
    expect(screen.queryByRole("button", { name: "Calma" })).toBeNull();

    cleanup();
    render(<Harness current={A} allowNone compact />);
    fireEvent.click(screen.getByRole("button", { name: "Sin música" }));
    expect(clear).toHaveBeenCalled();
    expect(within(document.body).queryByRole("button", { name: /Quitar la lista/i })).toBeNull(); // no × on the start screen
  });
});
