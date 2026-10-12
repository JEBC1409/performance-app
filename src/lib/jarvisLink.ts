import { db } from "@/db/db";
import type { SetRecord } from "@/db/db";
import { currentRoutineConfig } from "@/data/gym";
import type { GymDay } from "@/lib/cycle";
import { todayISO } from "@/lib/date";
import { epley1RM, roundKg } from "@/lib/epley";
import { getFocusState, pauseFocus, remainingSeconds, resumeFocus, startFocus, stopFocus, validFocusMin } from "@/lib/focusTimer";
import { getMusicState, nextMusic, pauseMusic, playMusic, prevMusic } from "@/lib/focusMusic";
import { toggleHabitDay } from "@/lib/habits";

/**
 * A voice link between this app and JARVIS, the assistant running on the same
 * computer (bridge on ws://127.0.0.1:8787).
 *
 * Direction matters: JARVIS sends a request, this app answers it. Nothing here
 * lets JARVIS run code or reach data the app does not choose to return — every
 * request is one of a fixed set of operations below, with its arguments
 * validated, and the data never leaves the machine (the socket is loopback).
 *
 * Outside a desktop with JARVIS running the connection simply fails and retries
 * quietly; it can be switched off with localStorage "performance_jarvis" = "off".
 */

export type JarvisTab = "hoy" | "entreno" | "habitos" | "datos" | "horario" | "focus" | "kairos" | "mouredev" | "perfil";
const TABS: readonly JarvisTab[] = ["hoy", "entreno", "habitos", "datos", "horario", "focus", "kairos", "mouredev", "perfil"];

export interface JarvisContext {
  navigate: (tab: JarvisTab) => void;
}

type Args = Record<string, unknown>;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const str = (v: unknown, max = 80): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function focusStatus() {
  const s = getFocusState();
  return {
    status: s.status,
    phase: s.phase,
    task: s.task,
    focusMin: s.focusMin,
    remainingMin: s.status === "idle" ? 0 : Math.ceil(remainingSeconds(s, Date.now()) / 60),
  };
}

/** Finds the routine exercise (and the gym day it belongs to) for a spoken name. */
function findExercise(name: string): { name: string; day: GymDay } | null {
  const wanted = norm(name);
  if (!wanted) return null;
  const routine = currentRoutineConfig();
  const all = (Object.keys(routine) as GymDay[]).flatMap((day) => routine[day].ex.map((ex) => ({ name: ex.name, day, n: norm(ex.name) })));
  const hit = all.find((e) => e.n === wanted) ?? all.filter((e) => e.n.includes(wanted) || wanted.includes(e.n)).sort((a, b) => a.n.length - b.n.length)[0];
  return hit ? { name: hit.name, day: hit.day } : null;
}

async function findHabit(name: string) {
  const wanted = norm(name);
  const defs = await db.habitDefs.toArray();
  return defs.find((d) => norm(d.key) === wanted || norm(d.label) === wanted) ?? defs.find((d) => norm(d.label).includes(wanted) || wanted.includes(norm(d.label))) ?? null;
}

/** Runs one operation. Pure of any socket code so it can be tested directly. */
export async function handleJarvisOp(op: string, args: Args, ctx: JarvisContext): Promise<unknown> {
  switch (op) {
    case "ping":
      return { app: "performance", today: todayISO() };

    case "nav": {
      const tab = str(args.tab, 20) as JarvisTab;
      if (!TABS.includes(tab)) throw new Error(`Pantalla desconocida: ${tab}`);
      ctx.navigate(tab);
      return { tab };
    }

    case "focus.start": {
      const min = validFocusMin(Math.round(num(args.minutes) ?? 25));
      if (min === null) throw new Error("Los minutos deben estar entre 1 y 240.");
      startFocus(str(args.task, 60), min);
      ctx.navigate("focus");
      return focusStatus();
    }
    case "focus.pause":
      pauseFocus();
      return focusStatus();
    case "focus.resume":
      resumeFocus();
      return focusStatus();
    case "focus.stop":
      stopFocus();
      return focusStatus();
    case "focus.status":
      return focusStatus();

    case "music.play":
    case "music.pause":
    case "music.next":
    case "music.prev": {
      // The Focus music player (a playlist the user configured in the app).
      if (!getMusicState().source) throw new Error("No hay música configurada en Focus.");
      if (op === "music.play") playMusic();
      else if (op === "music.pause") pauseMusic();
      else if (op === "music.next") nextMusic();
      else prevMusic();
      return { music: op.slice(6) };
    }

    case "habit.list": {
      const [defs, day] = await Promise.all([db.habitDefs.orderBy("order").toArray(), db.habitDays.get(todayISO())]);
      const done = new Set(day?.done ?? []);
      return defs.map((d) => ({ habit: d.label, done: done.has(d.key) }));
    }
    case "habit.set": {
      const def = await findHabit(str(args.habit));
      if (!def) throw new Error(`No encuentro el hábito "${str(args.habit)}".`);
      const want = args.done !== false;
      const today = todayISO();
      const row = await db.habitDays.get(today);
      const isDone = row?.done.includes(def.key) ?? false;
      if (isDone !== want) await toggleHabitDay(today, def.key);
      return { habit: def.label, done: want };
    }

    case "set.log": {
      const ex = findExercise(str(args.exercise));
      if (!ex) throw new Error(`No encuentro el ejercicio "${str(args.exercise)}" en su rutina.`);
      const weight = num(args.weight);
      const reps = num(args.reps);
      if (reps === null || reps < 1 || reps > 100) throw new Error("Faltan las repeticiones.");
      if (weight !== null && (weight < 0 || weight > 1000)) throw new Error("Peso fuera de rango.");
      const count = Math.max(1, Math.min(10, Math.round(num(args.sets) ?? 1)));
      const date = todayISO();
      const existing = await db.sets.where("date").equals(date).filter((s) => s.exercise === ex.name && s.day === ex.day).count();
      for (let i = 1; i <= count; i++) {
        const row: SetRecord = {
          date,
          day: ex.day,
          exercise: ex.name,
          setIndex: existing + i,
          weight,
          reps: Math.round(reps),
          toFailure: null,
          rpe: null,
          note: "",
          createdAt: Date.now() + i,
        };
        await db.sets.add(row);
      }
      return { exercise: ex.name, day: ex.day, sets: count, weight, reps: Math.round(reps) };
    }

    case "stats.exercise": {
      const ex = findExercise(str(args.exercise));
      if (!ex) throw new Error(`No encuentro el ejercicio "${str(args.exercise)}" en su rutina.`);
      const rows = await db.sets.where("exercise").equals(ex.name).toArray();
      if (!rows.length) return { exercise: ex.name, sets: 0 };
      const lifted = rows.filter((r) => r.weight !== null && r.reps !== null);
      const best = lifted.reduce<SetRecord | null>((a, r) => (!a || epley1RM(r.weight!, r.reps!) > epley1RM(a.weight!, a.reps!) ? r : a), null);
      const lastDate = rows.reduce((d, r) => (r.date > d ? r.date : d), "");
      const last = rows.filter((r) => r.date === lastDate);
      return {
        exercise: ex.name,
        sets: rows.length,
        lastDate,
        lastSets: last.map((r) => ({ weight: r.weight, reps: r.reps })),
        best: best ? { weight: best.weight, reps: best.reps, date: best.date, est1RM: roundKg(epley1RM(best.weight!, best.reps!)) } : null,
      };
    }

    case "stats.today": {
      const today = todayISO();
      const [focus, sets, defs, day] = await Promise.all([
        db.focusSessions.where("date").equals(today).toArray(),
        db.sets.where("date").equals(today).count(),
        db.habitDefs.toArray(),
        db.habitDays.get(today),
      ]);
      const done = new Set(day?.done ?? []);
      return {
        focusMinutes: focus.reduce((a, s) => a + s.minutes, 0),
        setsLogged: sets,
        habitsDone: defs.filter((d) => done.has(d.key)).map((d) => d.label),
        habitsPending: defs.filter((d) => !done.has(d.key)).map((d) => d.label),
      };
    }

    case "weight.latest": {
      const rows = (await db.weights.toArray()).filter((w) => w.weightKg !== null).sort((a, b) => (a.date < b.date ? 1 : -1));
      const w = rows[0];
      return w ? { date: w.date, weightKg: w.weightKg } : { weightKg: null };
    }

    default:
      throw new Error(`Orden desconocida: ${op}`);
  }
}

// --- Connection ------------------------------------------------------------

const URL_LINK = "ws://127.0.0.1:8787/app";

function eligible(): boolean {
  if (typeof window === "undefined" || typeof WebSocket === "undefined") return false;
  try {
    if (window.localStorage.getItem("performance_jarvis") === "off") return false;
  } catch {
    /* storage blocked: carry on */
  }
  // JARVIS runs on a desktop; do not even try from a phone.
  return !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
}

let started = false;

/** Opens the link and keeps it alive, retrying quietly with a growing delay. */
export function startJarvisLink(ctx: JarvisContext): () => void {
  if (started || !eligible()) return () => {};
  started = true;
  let socket: WebSocket | null = null;
  let timer: number | undefined;
  let delay = 4000;
  let stopped = false;

  const connect = () => {
    if (stopped) return;
    try {
      socket = new WebSocket(URL_LINK);
    } catch {
      schedule();
      return;
    }
    socket.onopen = () => {
      delay = 4000;
      socket?.send(JSON.stringify({ type: "hello", app: "performance" }));
    };
    socket.onmessage = async (ev) => {
      let msg: { id?: unknown; op?: unknown; args?: unknown };
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (typeof msg.id !== "string" || typeof msg.op !== "string") return;
      const args = msg.args && typeof msg.args === "object" ? (msg.args as Args) : {};
      try {
        const data = await handleJarvisOp(msg.op, args, ctx);
        socket?.send(JSON.stringify({ id: msg.id, ok: true, data }));
      } catch (err) {
        socket?.send(JSON.stringify({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) }));
      }
    };
    socket.onclose = schedule;
    socket.onerror = () => socket?.close();
  };

  function schedule() {
    if (stopped) return;
    socket = null;
    timer = window.setTimeout(connect, delay);
    delay = Math.min(delay * 2, 60000);
  }

  connect();
  return () => {
    stopped = true;
    started = false;
    window.clearTimeout(timer);
    socket?.close();
  };
}
