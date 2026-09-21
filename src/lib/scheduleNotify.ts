import { HORARIO } from "@/data/horario";
import type { BlockType, HorarioCell } from "@/data/horario";
import { jsDowToIndex, pad2, todayISO } from "./date";

/** Reminders driven by the weekly schedule: a notification when each of
 * today's blocks starts (optionally a few minutes before), so "what's next"
 * arrives on its own instead of having to open the app and look.
 *
 * Preferences live in localStorage on purpose: notification permission is
 * per device/browser, so the switch should be too. */

const PREFS_KEY = "performance_schedule_notify_v1";
const FIRED_KEY = "performance_schedule_fired_v1";
/** A due reminder still fires this many minutes late (tab was busy/asleep),
 * but not hours late — a stale "Gym now" is worse than none. */
const GRACE_MIN = 3;

export type Lead = 0 | 5 | 10;
export type Scope = "all" | "main";

export interface NotifyPrefs {
  enabled: boolean;
  lead: Lead;
  /** "main": only uni, gym, MoureDev and English. "all": every block with something to do. */
  scope: Scope;
}

const DEFAULT_PREFS: NotifyPrefs = { enabled: false, lead: 0, scope: "all" };
const MAIN_TYPES: BlockType[] = ["clase", "gym", "mouredev", "ingles"];

function parsePrefs(raw: string | null): NotifyPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const r = JSON.parse(raw) as Partial<NotifyPrefs>;
    return {
      enabled: r.enabled === true,
      lead: r.lead === 5 || r.lead === 10 ? r.lead : 0,
      scope: r.scope === "main" ? "main" : "all",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function readPrefsRaw(): string | null {
  try {
    return localStorage.getItem(PREFS_KEY);
  } catch {
    return null;
  }
}

let prefs: NotifyPrefs = parsePrefs(readPrefsRaw());
const listeners = new Set<() => void>();

export function getNotifyPrefs(): NotifyPrefs {
  return prefs;
}

export function subscribeNotifyPrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setNotifyPrefs(patch: Partial<NotifyPrefs>): void {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* preference just won't persist */
  }
  listeners.forEach((l) => l());
}

// ── schedule → events ─────────────────────────────────────────────────────

export interface ScheduleEvent {
  id: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  cell: HorarioCell;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function rowStart(r: number): number {
  return toMin(HORARIO[r].time.split("-")[0]);
}

/** Today's blocks for one weekday column (0 = Monday), in order. A block
 * that spans several rows is one event, starting at its first row. */
export function eventsForDay(col: number): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];
  for (let r = 0; r < HORARIO.length; r++) {
    const cell = HORARIO[r].cells[col];
    if (!cell || cell.cont) continue;
    const endRow = r + (cell.span ?? 1);
    out.push({
      id: `${col}-${r}`,
      startMin: rowStart(r),
      endMin: endRow < HORARIO.length ? rowStart(endRow) : 24 * 60,
      timeLabel: HORARIO[r].time.split("-")[0],
      cell,
    });
  }
  return out;
}

export function wantsReminder(e: ScheduleEvent, scope: Scope): boolean {
  if (e.cell.quiet) return false;
  return scope === "all" || MAIN_TYPES.includes(e.cell.type);
}

/** Reminders that would go out today under these prefs, with the minute each fires at. */
export function plannedReminders(now: Date, p: NotifyPrefs): { event: ScheduleEvent; fireMin: number }[] {
  const col = jsDowToIndex(now.getDay());
  return eventsForDay(col)
    .filter((e) => wantsReminder(e, p.scope))
    .map((event) => ({ event, fireMin: Math.max(0, event.startMin - p.lead) }));
}

// ── delivery ──────────────────────────────────────────────────────────────

function firedToday(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "null") as { date?: string; ids?: string[] } | null;
    if (raw && raw.date === todayISO() && Array.isArray(raw.ids)) return new Set(raw.ids);
  } catch {
    /* fall through */
  }
  return new Set();
}

function markFired(ids: Set<string>): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ date: todayISO(), ids: [...ids] }));
  } catch {
    /* worst case a reminder repeats after a reload */
  }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== "undefined";
}

/** Shows a system notification. Goes through the service worker when there
 * is one (the only way that works on Android, and it lets a tap re-open the
 * app), and falls back to a plain Notification on desktop/dev. */
export async function sendNotification(title: string, body: string, opts: { tag: string; important?: boolean }): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body,
    tag: opts.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    requireInteraction: opts.important === true,
  };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    /* try the constructor */
  }
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

export function reminderContent(e: ScheduleEvent, lead: Lead, next: ScheduleEvent | undefined): { title: string; body: string; important: boolean } {
  const important = e.cell.key === true;
  const title = lead > 0 ? `En ${lead} min: ${e.cell.text}` : `Toca: ${e.cell.text}`;
  const parts: string[] = [];
  if (important) parts.push("Es el bloque obligatorio del día. Hazlo y marca tu X.");
  else parts.push(`Desde las ${e.timeLabel}`);
  if (next) parts.push(`Después: ${next.cell.text} (${next.timeLabel})`);
  return { title, body: parts.join(" · "), important };
}

/** Fires whatever is due right now and hasn't fired yet. Safe to call as
 * often as you like (every tick): each reminder goes out once per day. */
export async function checkScheduleReminders(now: Date = new Date(), p: NotifyPrefs = prefs): Promise<string[]> {
  if (!p.enabled) return [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fired = firedToday();
  const events = eventsForDay(jsDowToIndex(now.getDay()));
  const sent: string[] = [];

  for (const { event, fireMin } of plannedReminders(now, p)) {
    const key = `${event.id}:${p.lead}`;
    if (fired.has(key) || nowMin < fireMin || nowMin >= fireMin + GRACE_MIN || nowMin >= event.endMin) continue;
    const idx = events.findIndex((x) => x.id === event.id);
    const next = events.slice(idx + 1).find((x) => wantsReminder(x, p.scope));
    const { title, body, important } = reminderContent(event, p.lead, next);
    // Claim it before the async send so overlapping ticks can't double-fire.
    fired.add(key);
    markFired(fired);
    const ok = await sendNotification(title, body, { tag: `performance-block-${todayISO()}-${event.id}`, important });
    if (ok) sent.push(title);
  }
  return sent;
}

export function nextReminder(now: Date, p: NotifyPrefs): { event: ScheduleEvent; fireMin: number } | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fired = firedToday();
  return plannedReminders(now, p).find(({ event, fireMin }) => fireMin + GRACE_MIN > nowMin && !fired.has(`${event.id}:${p.lead}`)) ?? null;
}

export function fmtMin(min: number): string {
  return `${Math.floor(min / 60)}:${pad2(min % 60)}`;
}
