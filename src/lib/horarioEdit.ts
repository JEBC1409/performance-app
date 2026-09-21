import { labelStartMin } from "@/data/horario";
import type { BlockCell, HorarioConfig, HorarioSeg } from "@/data/horario";

/** Pure edit operations on a schedule config (Mon..Sun × time rows). Each
 * returns a new config; nothing here touches the live schedule. */

const TIME_LABEL = /^\d{1,2}:\d{2}(-\d{1,2}:\d{2})?$/;

const cloneCfg = (c: HorarioConfig): HorarioConfig => JSON.parse(JSON.stringify(c)) as HorarioConfig;

export function validTimeLabel(label: string): boolean {
  if (!TIME_LABEL.test(label)) return false;
  return label.split("-").every((t) => {
    const [h, m] = t.split(":").map(Number);
    return h >= 0 && h < 24 && m >= 0 && m < 60;
  });
}

/** The block covering `row` on `day`, or null when that slot is empty. */
export function segAt(cfg: HorarioConfig, day: number, row: number): HorarioSeg | null {
  return cfg.days[day].find((s) => s.from <= row && row <= s.to) ?? null;
}

/** Sets the block at (day, row): edits the block that covers it, or creates a new one. */
export function setBlock(cfg: HorarioConfig, day: number, row: number, cell: BlockCell): HorarioConfig {
  const out = cloneCfg(cfg);
  const seg = segAt(out, day, row);
  if (seg) seg.cell = { ...cell };
  else {
    out.days[day].push({ from: row, to: row, cell: { ...cell } });
    out.days[day].sort((a, b) => a.from - b.from);
  }
  return out;
}

/** Empties the block covering (day, row). */
export function clearBlock(cfg: HorarioConfig, day: number, row: number): HorarioConfig {
  const out = cloneCfg(cfg);
  out.days[day] = out.days[day].filter((s) => !(s.from <= row && row <= s.to));
  return out;
}

/** Makes the block covering (day, row) one row longer (if the next row is
 * free) or shorter (if it spans more than one row). Returns null if it cannot. */
export function resizeBlock(cfg: HorarioConfig, day: number, row: number, delta: 1 | -1): HorarioConfig | null {
  const out = cloneCfg(cfg);
  const seg = segAt(out, day, row);
  if (!seg) return null;
  if (delta === 1) {
    if (seg.to + 1 >= out.times.length || segAt(out, day, seg.to + 1)) return null;
    seg.to += 1;
  } else {
    if (seg.to === seg.from) return null;
    seg.to -= 1;
  }
  return out;
}

/** Adds a time row, placed by its start time. Rows that already existed
 * shift down; a block that straddles the new row simply gets longer. */
export function insertRow(cfg: HorarioConfig, label: string): { cfg: HorarioConfig; index: number } | null {
  if (!validTimeLabel(label) || cfg.times.includes(label) || cfg.times.length >= 48) return null;
  const out = cloneCfg(cfg);
  const start = labelStartMin(label);
  let p = out.times.findIndex((t) => labelStartMin(t) > start);
  if (p < 0) p = out.times.length;
  out.times.splice(p, 0, label);
  for (const segs of out.days) {
    for (const s of segs) {
      if (s.from >= p) {
        s.from += 1;
        s.to += 1;
      } else if (s.to >= p) s.to += 1;
    }
  }
  return { cfg: out, index: p };
}

/** Removes a time row; blocks only on that row disappear, longer ones shrink. */
export function removeRow(cfg: HorarioConfig, r: number): HorarioConfig | null {
  if (cfg.times.length <= 1 || r < 0 || r >= cfg.times.length) return null;
  const out = cloneCfg(cfg);
  out.times.splice(r, 1);
  out.days = out.days.map((segs) =>
    segs
      .filter((s) => !(s.from === r && s.to === r))
      .map((s) => {
        const n = { ...s };
        if (s.from > r) n.from -= 1;
        if (s.to >= r) n.to -= 1;
        return n;
      }),
  );
  return out;
}

/** Renames a row's label, keeping rows in time order. Null if the label is invalid or out of order. */
export function renameRow(cfg: HorarioConfig, r: number, label: string): HorarioConfig | null {
  if (!validTimeLabel(label) || (cfg.times.includes(label) && cfg.times[r] !== label)) return null;
  const start = labelStartMin(label);
  const before = r > 0 ? labelStartMin(cfg.times[r - 1]) : -1;
  const after = r < cfg.times.length - 1 ? labelStartMin(cfg.times[r + 1]) : 24 * 60;
  if (start <= before || start >= after) return null;
  const out = cloneCfg(cfg);
  out.times[r] = label;
  return out;
}
