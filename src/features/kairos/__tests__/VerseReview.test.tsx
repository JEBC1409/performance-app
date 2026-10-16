import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import type { SavedVerseRecord } from "@/db/db";
import { VerseReview } from "../VerseReview";

const SAVED: SavedVerseRecord[] = [{ id: 1, abbrev: "jo", bookName: "Juan", chapter: 3, verse: 16, text: "Porque de tal manera amó Dios al mundo", note: "", createdAt: 1 }];

beforeEach(async () => {
  await db.appConfig.clear();
});
afterEach(cleanup);

describe("VerseReview", () => {
  it("shows nothing when no verse is being memorised", async () => {
    const { container } = render(<VerseReview saved={SAVED} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(container.textContent).toBe("");
  });

  it("asks for the verse from memory, reveals it, and records that you knew it", async () => {
    await db.appConfig.put({ key: "verse_review", value: { "jo.3.16": { step: 0, due: "2000-01-01" } }, updatedAt: 1 });
    render(<VerseReview saved={SAVED} />);

    expect(await screen.findByText(/Juan 3:16/)).toBeInTheDocument();
    expect(screen.queryByText(/amó Dios al mundo/)).toBeNull(); // hidden until asked
    fireEvent.click(screen.getByRole("button", { name: /Ver el versículo/i }));
    expect(screen.getByText(/amó Dios al mundo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lo sabía/i }));
    await waitFor(async () => {
      const row = await db.appConfig.get("verse_review");
      const v = (row?.value as Record<string, { step: number; due: string }>)["jo.3.16"];
      expect(v.step).toBe(1);
      expect(v.due > "2000-01-01").toBe(true);
    });
    expect(await screen.findByText(/Listo por hoy/i)).toBeInTheDocument();
  });
});
