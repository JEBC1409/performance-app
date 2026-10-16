import { describe, expect, it } from "vitest";
import { chooseVoice, DEFAULT_NARRATOR_PREFS, parsePrefs, rankVoices, speakable, voiceScore } from "../narrator";

const v = (name: string, lang: string) => ({ name, lang, voiceURI: name });

describe("voices", () => {
  const voices = [
    v("Microsoft Helena - Spanish (Spain)", "es-ES"),
    v("Google US English", "en-US"),
    v("Microsoft Jorge Online (Natural) - Spanish (Mexico)", "es-MX"),
    v("Google español de Estados Unidos", "es-US"),
    v("Samantha", "en-US"),
  ];

  it("keeps only Spanish voices and puts the natural, male, Latin American one first", () => {
    const ranked = rankVoices(voices).map((x) => x.name);
    expect(ranked[0]).toBe("Microsoft Jorge Online (Natural) - Spanish (Mexico)");
    expect(ranked).not.toContain("Samantha");
    expect(ranked).not.toContain("Google US English");
    expect(ranked).toHaveLength(3);
  });

  it("scores non-Spanish voices out", () => {
    expect(voiceScore(v("Samantha", "en-US"))).toBe(-1);
    expect(voiceScore(v("Cualquiera", "es-ES"))).toBeGreaterThan(0);
  });

  it("uses the saved voice while it exists, else the best one", () => {
    expect(chooseVoice(voices, "Microsoft Helena - Spanish (Spain)")?.name).toBe("Microsoft Helena - Spanish (Spain)");
    expect(chooseVoice(voices, "gone")?.name).toBe("Microsoft Jorge Online (Natural) - Spanish (Mexico)");
    expect(chooseVoice([v("Samantha", "en-US")], null)).toBeNull();
  });
});

describe("prefs and text", () => {
  it("defaults to a slower, deeper voice and clamps bad values", () => {
    expect(DEFAULT_NARRATOR_PREFS.rate).toBeLessThan(1);
    expect(DEFAULT_NARRATOR_PREFS.pitch).toBeLessThan(1);
    expect(parsePrefs(null)).toEqual(DEFAULT_NARRATOR_PREFS);
    expect(parsePrefs({ rate: 99, pitch: -3, voiceURI: "x" })).toEqual({ rate: 1.3, pitch: 0.5, voiceURI: "x" });
    expect(parsePrefs({ rate: "fast" }).rate).toBe(DEFAULT_NARRATOR_PREFS.rate);
  });

  it("cleans a verse for speaking", () => {
    expect(speakable("  En el  principio [era]  el Verbo  ")).toBe("En el principio era el Verbo");
  });
});
