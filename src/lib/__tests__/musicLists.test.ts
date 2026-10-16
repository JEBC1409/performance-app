import { describe, expect, it } from "vitest";
import { MAX_LISTS, removeList, sanitizeLists, saveList, withList } from "../musicLists";

const URL_A = "https://music.youtube.com/playlist?list=PLaaaaaaaaaaaa";
const URL_B = "https://www.youtube.com/playlist?list=PLbbbbbbbbbbbb";

describe("music lists", () => {
  it("keeps only named YouTube links, once each", () => {
    expect(sanitizeLists([{ name: "Estudio", url: URL_A }, { name: "", url: URL_B }, { name: "Raro", url: "https://example.com/x" }, { name: "Repetida", url: URL_A }, null])).toEqual([{ name: "Estudio", url: URL_A }]);
    expect(sanitizeLists("nope")).toEqual([]);
  });

  it("adds a list, renames when the link is already there, and refuses bad input", () => {
    const a = withList([], "Estudio", URL_A)!;
    expect(withList(a, "Foco", URL_A)).toEqual([{ name: "Foco", url: URL_A }]);
    expect(withList(a, "  ", URL_B)).toBeNull();
    expect(withList(a, "Gym", "https://example.com")).toBeNull();
  });

  it("caps how many it keeps (the oldest go first)", () => {
    let l: ReturnType<typeof withList> = [];
    for (let i = 0; i < MAX_LISTS + 3; i++) l = withList(l!, `L${i}`, `https://www.youtube.com/playlist?list=PL${String(i).padStart(12, "x")}`);
    expect(l).toHaveLength(MAX_LISTS);
    expect(l![0].name).toBe("L3");
  });

  it("saves and removes through the store", () => {
    expect(saveList("Estudio", URL_A)).toBe(true);
    expect(saveList("Gym", "no")).toBe(false);
    expect(JSON.parse(localStorage.getItem("performance_focus_music_lists_v1") ?? "[]")).toEqual([{ name: "Estudio", url: URL_A }]);
    removeList(URL_A);
    expect(JSON.parse(localStorage.getItem("performance_focus_music_lists_v1") ?? "[]")).toEqual([]);
  });
});
