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

/** A row's time label is "start-end" or just "start". Either way a row lasts
 * until the next one starts (the last one until midnight), so the short gaps
 * between labelled blocks belong to the block before them. */
export function currentBlockInfo(now: Date = new Date()): BlockInfo {
  const col = jsDowToIndex(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  let rowIndex = -1;
  for (let i = 0; i < HORARIO.length; i++) {
    if (mins >= toMin(HORARIO[i].time.split("-")[0])) rowIndex = i;
    else break;
  }
  return { col, rowIndex };
}
