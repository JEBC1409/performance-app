import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RAW_BIBLE = [
  {
    abbrev: "jo",
    chapters: [
      ["En el principio era el Verbo.", "Este vino á Jesús de noche.", "De cierto, de cierto te digo."],
    ],
  },
];

vi.mock("@/hooks/useBible", () => ({ useBible: () => ({ bible: RAW_BIBLE, loading: false }) }));

const { db } = await import("@/db/db");
const { todayISO } = await import("@/lib/date");
const { Kairos } = await import("../Kairos");

beforeEach(async () => {
  await Promise.all([db.savedVerses.clear(), db.settings.clear(), db.bibleReadDays.clear()]);
});

afterEach(() => cleanup());

describe("Kairos · Leer", () => {
  it("marks today as a read day once the chapter is on screen, without duplicating it", async () => {
    render(<Kairos />);

    await waitFor(async () => expect(await db.bibleReadDays.get(todayISO())).toBeTruthy());
    expect(await db.bibleReadDays.count()).toBe(1);
    // The count itself sits in its own styled <span>, so match on the label text.
    expect(await screen.findByText(/día seguido leyendo/i)).toBeInTheDocument();
  });

  it("lets you pin the bookmark to one exact verse, not just the chapter", async () => {
    render(<Kairos />);

    const verseTwo = await screen.findByText(/Este vino á Jesús de noche\./);
    fireEvent.click(verseTwo);

    const dialog = await screen.findByRole("dialog", { name: /Guardar versículo/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /Marcar aquí/i }));

    await waitFor(async () => {
      const settings = await db.settings.get("app");
      expect(settings?.readingProgress).toEqual({ abbrev: "jo", chapter: 1, verse: 2 });
    });
    // The sheet closes and the marked verse now reads as the current position.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(/· aquí vas/i)).toBeInTheDocument();
  });
});
