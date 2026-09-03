import { useEffect } from "react";
import type { SettingsRecord } from "@/db/db";
import { pad2, todayISO } from "@/lib/date";

const FIRED_KEY_PREFIX = "performance_reminder_fired_";

function alreadyFiredToday(kind: string): boolean {
  try {
    return localStorage.getItem(FIRED_KEY_PREFIX + kind) === todayISO();
  } catch {
    return false;
  }
}

function markFiredToday(kind: string): void {
  try {
    localStorage.setItem(FIRED_KEY_PREFIX + kind, todayISO());
  } catch {
    /* ignore */
  }
}

function fire(kind: string, title: string, body: string): void {
  if (alreadyFiredToday(kind)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  markFiredToday(kind);
  try {
    new Notification(title, { body, tag: `performance-${kind}-${todayISO()}` });
  } catch {
    /* Notification constructor can throw on some mobile browsers; safe to ignore. */
  }
}

/** Polls once a minute while the app is open and fires a local notification at the configured times. */
export function useReminders(settings: SettingsRecord | undefined): void {
  useEffect(() => {
    if (!settings?.remindersEnabled) return;

    function check() {
      const now = new Date();
      const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      if (settings!.noPhoneTime && hhmm === settings!.noPhoneTime) {
        fire("nophone", "Sin celular", "Guardá el teléfono — hora de desconectar antes de dormir.");
      }
      if (settings!.sleepTime && hhmm === settings!.sleepTime) {
        fire("sleep", "Hora de dormir", "Apagá las pantallas — hora de dormir para cumplir tu meta de sueño.");
      }
    }

    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [settings]);
}
