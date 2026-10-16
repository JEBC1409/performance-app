import { useMood } from "@/hooks/useMood";
import { todayISO } from "@/lib/date";
import { MOODS } from "@/lib/mood";
import { Card, CardTitle } from "@/ui";

/** One tap a day: how you feel. Over time it shows what sleep and training do to it. */
export function MoodCard() {
  const { mood, ready, set } = useMood();
  const today = todayISO();
  if (!ready) return null;
  const current = mood[today];
  return (
    <Card className="enter">
      <CardTitle right={current ? "Anotado" : undefined}>¿Cómo te sientes hoy?</CardTitle>
      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Ánimo de hoy">
        {MOODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={current === m.value}
            aria-label={m.label}
            onClick={() => void set(today, current === m.value ? null : m.value)}
            className={`tap-target flex flex-col items-center gap-1 rounded-2xl py-2.5 ${current === m.value ? "glass-on" : "glass"}`}
          >
            <span className="text-[22px] leading-none" aria-hidden>
              {m.emoji}
            </span>
            <span className={`text-[10px] uppercase tracking-wide ${current === m.value ? "text-white/90" : "text-[var(--color-muted)]"}`}>{m.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
