import { useMemo, useSyncExternalStore } from "react";
import { liveQuery } from "dexie";
import { db } from "@/db/db";
import type { WeightRecord } from "@/db/db";
import { logError } from "@/lib/errorLog";
import { todayISO } from "@/lib/date";
import { CONFIG_MOOD } from "@/lib/mood";
import { combineActivity, loadFirstDates, loadHistory, loadToday } from "@/lib/recentActivity";
import type { FirstDates, HistoryActivity, RecentActivity, TodayActivity } from "@/lib/recentActivity";

/** Shared live reads. Every hook below hands the same snapshot to however many
 * components ask for it: the first one to mount starts ONE Dexie liveQuery, the
 * last one to leave stops it. That is what turns "each card re-reads four tables on
 * every write" into "one small read per write, for the whole screen". */

class Shared<T> {
  value: T | undefined;
  error: unknown;
  private listeners = new Set<() => void>();
  private sub: { unsubscribe(): void } | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly load: (previous: T | undefined) => Promise<T>;
  private readonly onIdle: () => void;

  constructor(load: (previous: T | undefined) => Promise<T>, onIdle: () => void) {
    this.load = load;
    this.onIdle = onIdle;
  }

  get idle(): boolean {
    return this.listeners.size === 0 && !this.sub;
  }

  getSnapshot = (): T | undefined => this.value;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (!this.sub) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size) return;
      // Not right away: a screen swap (or StrictMode's remount) unsubscribes and
      // resubscribes in the same tick, and must not restart the read.
      this.stopTimer = setTimeout(() => {
        this.stopTimer = null;
        if (!this.listeners.size) this.stop();
      }, 0);
    };
  };

  private start() {
    this.error = undefined;
    this.sub = liveQuery(() => this.load(this.value)).subscribe({
      next: (v) => {
        this.value = v;
        this.listeners.forEach((l) => l());
      },
      error: (e) => {
        logError(e, "recent activity");
        this.error = e;
        this.listeners.forEach((l) => l());
      },
    });
  }

  private stop() {
    this.sub?.unsubscribe();
    this.sub = null;
    this.value = undefined;
    this.onIdle();
  }
}

/** One Shared per key (the key is today's date for the day-split reads, so a new
 * day starts a fresh read and the old one retires when its last screen re-renders). */
function sharedFamily<T>(load: (key: string, previous: T | undefined) => Promise<T>) {
  const byKey = new Map<string, Shared<T>>();
  return (key: string): Shared<T> => {
    let s = byKey.get(key);
    if (!s) {
      for (const [k, other] of byKey) if (other.idle) byKey.delete(k);
      const created: Shared<T> = new Shared<T>(
        (prev) => load(key, prev),
        () => {
          if (byKey.get(key) === created) byKey.delete(key);
        },
      );
      s = created;
      byKey.set(key, s);
    }
    return s;
  };
}

const noSubscribe = () => () => {};
const noSnapshot = () => undefined;

function useShared<T>(s: Shared<T>, enabled = true): T | undefined {
  const v = useSyncExternalStore(enabled ? s.subscribe : noSubscribe, enabled ? s.getSnapshot : noSnapshot);
  if (enabled && s.error) throw s.error; // same as useLiveQuery: a failed read surfaces to the error boundary
  return v;
}

const historyFor = sharedFamily<HistoryActivity>((today) => loadHistory(today));
const todayFor = sharedFamily<TodayActivity>((today) => loadToday(today));
const firstDatesFor = sharedFamily<FirstDates>((_k, prev) => loadFirstDates(prev));

/** Synced setting: how far the user has moved the cycle from the logged-session count. */
export const CONFIG_CYCLE_OFFSET = "cycle_offset";
export interface SharedConfig {
  cycleOffset: number;
  /** Raw mood value (run it through `sanitizeMood`). */
  mood: unknown;
}
const configFor = sharedFamily<SharedConfig>(async () => {
  const [offset, mood] = await db.appConfig.bulkGet([CONFIG_CYCLE_OFFSET, CONFIG_MOOD]);
  return { cycleOffset: typeof offset?.value === "number" ? offset.value : 0, mood: mood?.value };
});

/** Everything before today: read once, re-read only if the past changes. */
export function useHistoryActivity(): HistoryActivity | undefined {
  return useShared(historyFor(todayISO()));
}

/** Everything from today on: small, re-read on each write you make today. */
export function useTodayActivity(enabled = true): TodayActivity | undefined {
  return useShared(todayFor(todayISO()), enabled);
}

// Every component that asks gets the same combined object for the same pair of reads.
let combined: { h: HistoryActivity; t: TodayActivity; value: RecentActivity } | null = null;
function combineOnce(h: HistoryActivity, t: TodayActivity): RecentActivity {
  if (combined && combined.h === h && combined.t === t) return combined.value;
  const value = combineActivity(h, t);
  combined = { h, t, value };
  return value;
}

/** The last ~90 days plus lifetime counts (undefined while loading). */
export function useRecentActivity(): RecentActivity | undefined {
  const h = useHistoryActivity();
  const t = useTodayActivity();
  return useMemo(() => (h && t ? combineOnce(h, t) : undefined), [h, t]);
}

/** The newest weight ever logged (undefined while loading, or if none). */
export function useLastWeight(): WeightRecord | undefined {
  const h = useHistoryActivity();
  const t = useTodayActivity();
  return h && t ? (t.weights[t.weights.length - 1] ?? h.lastWeight) : undefined;
}

/** The cycle offset and the mood log: the two config rows several cards read. */
export function useSharedConfig(): SharedConfig | undefined {
  return useShared(configFor(""));
}

/** Earliest set / weight / habit day. Costs a re-read only when something is
 * logged at or before the earliest known date. */
export function useFirstDates(): FirstDates | undefined {
  return useShared(firstDatesFor(""));
}
