import { describe, expect, it } from "vitest";
import { pickHeroAction } from "./heroAction";
import type { HeroInput } from "./heroAction";

const base: HeroInput = {
  hasBlockHabit: false,
  blockType: "libre",
  restDay: false,
  setsDone: 0,
  setsTarget: 25,
  habitsDone: 0,
  habitsTotal: 4,
  dayClosed: false,
};
const pick = (over: Partial<HeroInput>) => pickHeroAction({ ...base, ...over });

describe("pickHeroAction", () => {
  it("offers the habit of the current block first", () => {
    expect(pick({ hasBlockHabit: true, blockType: "gym" })).toBe("block-habit");
  });

  it("starts the training when it is pending, even outside the gym block", () => {
    expect(pick({})).toBe("train");
    expect(pick({ blockType: "gym" })).toBe("train");
    expect(pick({ blockType: "gym", setsDone: 8 })).toBe("train"); // continue
  });

  it("lets a study block offer Focus instead of the pending training", () => {
    expect(pick({ blockType: "mouredev" })).toBe("focus");
    expect(pick({ blockType: "clase", blockQuiet: true })).toBe("train");
  });

  it("on a rest day, picks a day only inside the gym block", () => {
    expect(pick({ restDay: true, blockType: "gym" })).toBe("train");
    expect(pick({ restDay: true })).toBe("habits");
  });

  it("moves on to the habits once the training is done", () => {
    expect(pick({ setsDone: 25 })).toBe("habits");
    expect(pick({ setsDone: 30, habitsDone: 3 })).toBe("habits");
  });

  it("proposes closing the day when everything is done, then rests", () => {
    expect(pick({ setsDone: 25, habitsDone: 4 })).toBe("close");
    expect(pick({ restDay: true, habitsDone: 4 })).toBe("close");
    expect(pick({ setsDone: 25, habitsDone: 4, dayClosed: true })).toBe("done");
  });

  it("does not wait for habits that do not exist", () => {
    expect(pick({ restDay: true, habitsTotal: 0 })).toBe("close");
  });
});
