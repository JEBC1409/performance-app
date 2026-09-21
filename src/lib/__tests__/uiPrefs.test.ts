import { describe, expect, it } from "vitest";
import { DEFAULT_NAV, HOME_CARDS, normalizeNav, normalizeOrder, parseUiPrefs } from "../uiPrefs";

describe("uiPrefs", () => {
  it("falls back to defaults for missing or broken storage", () => {
    for (const raw of [null, "", "{nope", "42"]) {
      expect(parseUiPrefs(raw)).toMatchObject({ accent: "red", calm: false });
    }
    expect(parseUiPrefs(null).homeOrder).toEqual(HOME_CARDS.map((c) => c.key));
  });
  it("keeps valid choices and drops unknown accents", () => {
    expect(parseUiPrefs(JSON.stringify({ accent: "gold", calm: true }))).toMatchObject({ accent: "gold", calm: true });
    expect(parseUiPrefs(JSON.stringify({ accent: "neon" })).accent).toBe("red");
  });
  it("normalizes the card order: known cards once, new ones appended", () => {
    const all = HOME_CARDS.map((c) => c.key);
    expect(normalizeOrder(["stats", "rings", "stats", "bogus"])).toEqual(["stats", "rings", ...all.filter((k) => k !== "stats" && k !== "rings")]);
    expect(normalizeOrder(undefined)).toEqual(all);
    expect(normalizeOrder(all).length).toBe(all.length);
  });

  it("keeps the bottom bar to known screens, at most four, at least two", () => {
    expect(normalizeNav(["focus", "hoy", "focus", "nada", "entreno", "datos", "perfil"])).toEqual(["focus", "hoy", "entreno", "datos"]);
    expect(normalizeNav(["focus"])).toEqual(DEFAULT_NAV);
    expect(normalizeNav(undefined)).toEqual(DEFAULT_NAV);
    expect(parseUiPrefs(JSON.stringify({ navTabs: ["hoy", "focus"] })).navTabs).toEqual(["hoy", "focus"]);
  });
});
