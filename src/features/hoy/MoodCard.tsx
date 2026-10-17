import { useState } from "react";
import { useMood } from "@/hooks/useMood";
import { todayISO } from "@/lib/date";
import { MOODS } from "@/lib/mood";
import { Card, CardTitle } from "@/ui";
import { MoodFace } from "@/ui/MoodFace";

/** One tap a day: how you feel. Over time it shows what sleep and training do to it.
 * Once answered it shrinks to a single line, so it stops taking up the screen. */
export function MoodCard() {
  const { mood, ready, set } = useMood();
  const [changing, setChanging] = useState(false);
  const today = todayISO();
  if (!ready) return null;
  const current = mood[today];
  const answered = MOODS.find((m) => m.value === current);

  if (answered && !changing) {
    return (
      <div className="glass enter flex items-center gap-3 rounded-2xl px-4 py-3" role="status">
        <MoodFace level={answered.value} size={24} className="flex-none text-[var(--color-ink)]" />
        <span className="min-w-0 flex-1 text-[13px]">
          Hoy te sientes <span className="font-semibold">{answered.label.toLowerCase()}</span>
        </span>
        <button onClick={() => setChanging(true)} className="flex-none text-[12px] text-[var(--color-muted)] underline">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <Card className="enter">
      <CardTitle>¿Cómo te sientes hoy?</CardTitle>
      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Ánimo de hoy">
        {MOODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={current === m.value}
            aria-label={m.label}
            onClick={() => {
              void set(today, current === m.value ? null : m.value);
              setChanging(false);
            }}
            className={`tap-target flex flex-col items-center gap-1 rounded-2xl py-2.5 ${current === m.value ? "glass-on" : "glass"}`}
          >
            <MoodFace level={m.value} size={26} className={current === m.value ? "text-white" : "text-[var(--color-muted)]"} />
            <span className={`text-[12px] uppercase tracking-wide ${current === m.value ? "text-white/90" : "text-[var(--color-muted)]"}`}>{m.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
