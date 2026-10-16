import { describe, expect, it } from "vitest";
import { ISOLATION_REST_SEC, isCompound, restSecondsFor } from "../restFor";
import { GYM_DIAS } from "../../data/gym";

describe("restSecondsFor", () => {
  it("classifies the routine's lifts", () => {
    for (const name of ["Press plano en máquina", "Remo en máquina Hammer", "Jalón al pecho agarre ancho", "Sentadilla libre / Prensa", "Peso muerto rumano", "Fondos en máquina"]) {
      expect(isCompound(name), name).toBe(true);
    }
    for (const name of ["Curl barra Z", "Laterales con mancuerna", "Face pulls", "Extensión trícep cuerda", "Pec deck", "Curl martillo en polea con cuerda", "Extensión pantorrilla"]) {
      expect(isCompound(name), name).toBe(false);
    }
  });

  it("keeps the usual rest for compounds and shortens isolation to 90 s", () => {
    expect(restSecondsFor("Press plano en máquina", 210, true)).toBe(210);
    expect(restSecondsFor("Curl barra Z", 210, true)).toBe(ISOLATION_REST_SEC);
  });

  it("never lengthens a rest that was already short, and does nothing when off", () => {
    expect(restSecondsFor("Curl barra Z", 60, true)).toBe(60);
    expect(restSecondsFor("Curl barra Z", 210, false)).toBe(210);
  });

  it("every routine exercise gets a sensible answer", () => {
    for (const d of Object.values(GYM_DIAS)) for (const e of d.ex) expect(restSecondsFor(e.name, 180, true)).toBeGreaterThan(0);
  });
});
