import { beforeEach, describe, expect, it } from "vitest";
import { logError, readErrors } from "../errorLog";

beforeEach(() => localStorage.clear());

describe("errorLog", () => {
  it("keeps the message and where it came from", () => {
    logError(new Error("boom"), "pantalla");
    expect(readErrors()[0].msg).toBe("pantalla: boom");
  });

  it("keeps only the last few", () => {
    for (let i = 0; i < 10; i++) logError(new Error("e" + i));
    const list = readErrors();
    expect(list).toHaveLength(6);
    expect(list[5].msg).toBe("e9");
  });

  it("copes with junk in storage", () => {
    localStorage.setItem("performance_error_log", "{nope");
    expect(readErrors()).toEqual([]);
    logError("texto suelto");
    expect(readErrors()[0].msg).toBe("texto suelto");
  });
});
