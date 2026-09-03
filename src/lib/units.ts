import type { Unit } from "@/db/db";

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Converts a canonical kg value into the given display unit, rounded to 1 decimal. */
export function fromKg(kg: number, unit: Unit): number {
  const v = unit === "lb" ? kgToLb(kg) : kg;
  return Math.round(v * 10) / 10;
}

/** Converts a value typed in the given unit back into canonical kg for storage. */
export function toKg(value: number, unit: Unit): number {
  return unit === "lb" ? lbToKg(value) : value;
}

export function unitLabel(unit: Unit): string {
  return unit === "lb" ? "lb" : "kg";
}
