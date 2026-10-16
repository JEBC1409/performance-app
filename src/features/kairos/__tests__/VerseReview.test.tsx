import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useBible", () => ({
  useBible: () => ({
    loading: false,
    bible: [{ abbrev: "jo", chapters: [["EN el principio era el Verbo.", "Este era en el principio con Dios."], ["Y al tercer día"]] }],
  }),
}));

const { db } = await import("@/db/db");
const { VerseReview } = await import("../VerseReview");

beforeEach(async () => {
  await db.appConfig.clear();
});
afterEach(cleanup);

describe("VerseReview", () => {
  it("shows nothing when no verse is being memorised", async () => {
    const { container } = render(<VerseReview />);
    await new Promise((r) => setTimeout(r, 30));
    expect(container.textContent).toBe("");
  });

  it("works for any verse of the Bible, saved or not: recall it, reveal it, record that you knew it", async () => {
    await db.appConfig.put({ key: "verse_review", value: { "jo.1.2": { step: 0, due: "2000-01-01" } }, updatedAt: 1 });
    render(<VerseReview />);

    expect(await screen.findByText(/Juan 1:2/)).toBeInTheDocument();
    expect(screen.queryByText(/con Dios/)).toBeNull(); // hidden until asked
    fireEvent.click(screen.getByRole("button", { name: /Ver el versículo/i }));
    expect(screen.getByText(/con Dios/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lo sabía/i }));
    await waitFor(async () => {
      const row = await db.appConfig.get("verse_review");
      const v = (row!.value as Record<string, { step: number; due: string }>)["jo.1.2"];
      expect(v.step).toBe(1);
      expect(v.due > "2000-01-01").toBe(true);
    });
    expect(await screen.findByText(/Listo por hoy/i)).toBeInTheDocument();
  });

  it("skips a stored verse that does not exist in the Bible", async () => {
    await db.appConfig.put({ key: "verse_review", value: { "jo.9.9": { step: 0, due: "2000-01-01" } }, updatedAt: 1 });
    render(<VerseReview />);
    expect(await screen.findByText(/Listo por hoy/i)).toBeInTheDocument();
  });
});
