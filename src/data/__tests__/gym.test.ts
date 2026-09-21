import { describe, expect, it } from "vitest";
import { allExerciseNames } from "../gym";
import { exerciseImageUrl } from "../exerciseImages";
import { groupForExercise } from "../muscleGroups";

describe("routine exercises", () => {
  it("every exercise has a photo and a muscle group", () => {
    for (const name of allExerciseNames()) {
      expect(exerciseImageUrl(name), `image for ${name}`).not.toBeNull();
      expect(groupForExercise(name), `muscle group for ${name}`).not.toBeNull();
    }
  });

  it("pull day uses cable pullover and the two new curls, not the old ones", () => {
    const names = allExerciseNames();
    expect(names).toContain("Pullover en polea");
    expect(names).toContain("Curl sentado inclinado");
    expect(names).toContain("Curl en máquina");
    expect(names).not.toContain("Pullover en banco");
    expect(names).not.toContain("Curl martillo");
  });

  it("resolves the second-frame syntax", () => {
    expect(exerciseImageUrl("Remo unilateral en Hammer")).toMatch(/Leverage_Iso_Row\/1\.jpg$/);
    expect(exerciseImageUrl("Curl en máquina")).toMatch(/Machine_Bicep_Curl\/0\.jpg$/);
  });
});
