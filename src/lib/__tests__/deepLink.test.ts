import { beforeEach, describe, expect, it } from "vitest";
import { readDeepLink } from "../deepLink";

beforeEach(() => localStorage.clear());

describe("readDeepLink", () => {
  it("maps shortcut targets to screens", () => {
    expect(readDeepLink("?enter&go=focus")).toBe("focus");
    expect(readDeepLink("?go=entreno")).toBe("entreno");
    expect(readDeepLink("?enter&go=hoy")).toBe("hoy");
  });
  it("opens Datos on the right sub-tab for weight and the weekly summary", () => {
    expect(readDeepLink("?go=peso")).toBe("datos");
    expect(localStorage.getItem("performance_datos_tab")).toBe("peso");
    expect(readDeepLink("?go=semana")).toBe("datos");
    expect(localStorage.getItem("performance_datos_tab")).toBe("semana");
  });
  it("ignores missing or unknown targets", () => {
    expect(readDeepLink("?enter")).toBeNull();
    expect(readDeepLink("?go=nada")).toBeNull();
    expect(localStorage.getItem("performance_datos_tab")).toBeNull();
  });
});
