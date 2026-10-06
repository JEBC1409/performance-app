import { addDays, DIAS_SEMANA, jsDowToIndex, parseISODate } from "./date";

/** "Descubrimientos": patterns in your own data, shown only when there's enough
 * of it to mean something. Every insight needs a minimum number of days on each
 * side of the comparison and a clear gap; anything weaker is left unsaid. */

export interface InsightData {
  sleep: { date: string; hours: number | null }[];
  focus: { date: string; minutes: number }[];
  /** Dates with at least one logged set. */
  trained: string[];
  habitDays: { date: string; done: string[] }[];
}

export interface Insight {
  id: string;
  text: string;
  /** Larger = more striking; used to pick the best few. */
  strength: number;
}

export const WINDOW_DAYS = 90;
const MIN_PER_GROUP = 6;
export const GOOD_SLEEP_H = 7;

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number) => `${Math.round(n)} %`;

function datesBack(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, -i));
}

export function computeInsights(data: InsightData, today: string): Insight[] {
  const window = new Set(datesBack(today, WINDOW_DAYS));
  const focusByDate = new Map<string, number>();
  for (const f of data.focus) if (window.has(f.date)) focusByDate.set(f.date, (focusByDate.get(f.date) ?? 0) + f.minutes);
  const trained = new Set(data.trained.filter((d) => window.has(d)));
  const sleepByDate = new Map<string, number>();
  for (const s of data.sleep) if (s.hours != null && window.has(s.date)) sleepByDate.set(s.date, s.hours);

  const out: Insight[] = [];

  // Sleep ↔ focus: minutes of focus on days after good vs short sleep.
  const good = [...sleepByDate].filter(([, h]) => h >= GOOD_SLEEP_H).map(([d]) => focusByDate.get(d) ?? 0);
  const short = [...sleepByDate].filter(([, h]) => h < GOOD_SLEEP_H).map(([d]) => focusByDate.get(d) ?? 0);
  if (good.length >= MIN_PER_GROUP && short.length >= MIN_PER_GROUP) {
    const a = avg(good);
    const b = avg(short);
    if (b > 0 && a / b >= 1.25) {
      out.push({ id: "sleep-focus", strength: a / b, text: `Los días que duermes ${GOOD_SLEEP_H} h o más enfocas ${pct((a / b - 1) * 100)} más (${Math.round(a)} min contra ${Math.round(b)}).` });
    } else if (a > 0 && b / a >= 1.25) {
      out.push({ id: "sleep-focus", strength: b / a, text: `Curioso: enfocas más los días que duermes menos de ${GOOD_SLEEP_H} h (${Math.round(b)} min contra ${Math.round(a)}).` });
    }
  }

  // Sleep ↔ training: how often you train after good vs short sleep.
  const goodTrain = [...sleepByDate].filter(([, h]) => h >= GOOD_SLEEP_H).map(([d]) => (trained.has(d) ? 1 : 0));
  const shortTrain = [...sleepByDate].filter(([, h]) => h < GOOD_SLEEP_H).map(([d]) => (trained.has(d) ? 1 : 0));
  if (goodTrain.length >= MIN_PER_GROUP && shortTrain.length >= MIN_PER_GROUP) {
    const a = avg(goodTrain) * 100;
    const b = avg(shortTrain) * 100;
    if (a - b >= 20) {
      const rest = b === 0 ? "y ninguno de los días que duermes poco" : `y solo el ${pct(b)} cuando duermes poco`;
      out.push({ id: "sleep-train", strength: (a - b) / 20, text: `Entrenas el ${pct(a)} de los días que duermes bien, ${rest}.` });
    }
  }

  // Habits ↔ focus: days with more habits done than usual.
  const habitCount = new Map(data.habitDays.filter((h) => window.has(h.date)).map((h) => [h.date, h.done.length]));
  if (habitCount.size >= MIN_PER_GROUP * 2) {
    const counts = [...habitCount.values()].sort((x, y) => x - y);
    const median = counts[Math.floor(counts.length / 2)];
    const high = [...habitCount].filter(([, c]) => c > median).map(([d]) => focusByDate.get(d) ?? 0);
    const low = [...habitCount].filter(([, c]) => c <= median).map(([d]) => focusByDate.get(d) ?? 0);
    if (high.length >= MIN_PER_GROUP && low.length >= MIN_PER_GROUP) {
      const a = avg(high);
      const b = avg(low);
      if (b > 0 && a / b >= 1.3) out.push({ id: "habits-focus", strength: a / b, text: `Cuando cumples más hábitos de lo normal, enfocas ${pct((a / b - 1) * 100)} más.` });
    }
  }

  // Best weekday for training (needs a few weeks of it, and a clear favourite).
  if (trained.size >= 10) {
    const days = datesBack(today, WINDOW_DAYS);
    const per = Array.from({ length: 7 }, () => ({ trained: 0, total: 0 }));
    for (const d of days) {
      const i = jsDowToIndex(parseISODate(d).getDay());
      per[i].total++;
      if (trained.has(d)) per[i].trained++;
    }
    const overall = trained.size / days.length;
    const best = per.map((p, i) => ({ i, rate: p.total ? p.trained / p.total : 0, ...p })).sort((x, y) => y.rate - x.rate)[0];
    if (best.total >= 8 && best.rate >= overall * 1.6 && best.trained >= 5) {
      const name = DIAS_SEMANA[best.i === 6 ? 0 : best.i + 1];
      out.push({ id: "best-train-day", strength: best.rate / overall, text: `Tu día fuerte para entrenar es el ${name}: has ido ${best.trained} de ${best.total}.` });
    }
  }

  // Best weekday for focus.
  if (focusByDate.size >= 10) {
    const days = datesBack(today, WINDOW_DAYS);
    const per = Array.from({ length: 7 }, () => ({ min: 0, total: 0 }));
    for (const d of days) {
      const i = jsDowToIndex(parseISODate(d).getDay());
      per[i].total++;
      per[i].min += focusByDate.get(d) ?? 0;
    }
    const overall = avg([...focusByDate.values()].concat(Array(days.length - focusByDate.size).fill(0)));
    const best = per.map((p, i) => ({ i, avg: p.total ? p.min / p.total : 0, total: p.total })).sort((x, y) => y.avg - x.avg)[0];
    if (best.total >= 8 && overall > 0 && best.avg >= overall * 1.5) {
      const name = DIAS_SEMANA[best.i === 6 ? 0 : best.i + 1];
      out.push({ id: "best-focus-day", strength: best.avg / overall, text: `El ${name} es tu mejor día de Focus: ${Math.round(best.avg)} min de media.` });
    }
  }

  return out.sort((a, b) => b.strength - a.strength).slice(0, 3);
}
