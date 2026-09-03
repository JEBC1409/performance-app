import { HORARIO } from "@/data/horario";
import { jsDowToIndex } from "./date";

export interface BlockInfo {
  col: number;
  rowIndex: number; // -1 if outside any block
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function currentBlockInfo(now: Date = new Date()): BlockInfo {
  const col = jsDowToIndex(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  let rowIndex = -1;
  for (let i = 0; i < HORARIO.length; i++) {
    const [start, end] = HORARIO[i].time.split("-");
    if (mins >= toMin(start) && mins < toMin(end)) {
      rowIndex = i;
      break;
    }
  }
  return { col, rowIndex };
}
