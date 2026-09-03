import { describe, expect, it } from "vitest";
import { parseNum } from "../parseNum";

describe("parseNum", () => {
  it("passes numbers through unchanged", () => {
    expect(parseNum(72.5)).toEqual({ value: 72.5, extra: "" });
  });

  it("parses a plain numeric string", () => {
    expect(parseNum("19")).toEqual({ value: 19, extra: "" });
  });

  it("accepts a comma as the decimal separator", () => {
    expect(parseNum("14,5")).toEqual({ value: 14.5, extra: "" });
  });

  it("extracts a leading number and keeps the remainder as extra", () => {
    expect(parseNum("100 (calent.)")).toEqual({ value: 100, extra: "(calent.)" });
    expect(parseNum("25/lado")).toEqual({ value: 25, extra: "/lado" });
  });

  it("returns null with the original text when there is no leading number", () => {
    expect(parseNum("peso corporal")).toEqual({ value: null, extra: "peso corporal" });
  });

  it("returns null extra for null/undefined input", () => {
    expect(parseNum(null)).toEqual({ value: null, extra: "" });
    expect(parseNum(undefined)).toEqual({ value: null, extra: "" });
  });
});
