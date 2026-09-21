import { useEffect, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { closePip, getPip, subscribePip } from "@/lib/focusPip";
import { pauseFocus, remainingSeconds, resumeFocus, stopFocus } from "@/lib/focusTimer";
import type { FocusTimerState } from "@/lib/focusTimer";
import { fmtClock, useFocusTimer, useNow } from "@/hooks/useFocusTimer";

const FONT = "'Space Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";

function roundBtn(size: number, style: CSSProperties): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    ...style,
  };
}

function MiniTimer({ timer, now }: { timer: FocusTimerState; now: number }) {
  const isBreak = timer.phase === "break";
  const paused = timer.status === "paused";
  const accent = isBreak ? "#2fae66" : "#df2531";
  const left = Math.min(remainingSeconds(timer, now), timer.totalSec);
  const progress = timer.totalSec > 0 ? 1 - left / timer.totalSec : 0;
  const label = isBreak ? "Descanso" : paused ? "En pausa" : "Enfocado";

  return (
    <div
      style={{
        height: "100%",
        containerType: "size",
        boxSizing: "border-box",
        padding: "14px 16px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#fff",
        fontFamily: FONT,
        background: `radial-gradient(120% 90% at 50% 40%, ${isBreak ? "rgba(47,174,102,0.2)" : "rgb(var(--accent-rgb)/0.22)"}, #050506 70%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, fontWeight: 600, flex: "none" }}>{label}</span>
        <span style={{ fontSize: 12, color: "rgb(var(--fg-rgb)/0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {isBreak ? "" : timer.task}
        </span>
      </div>

      <div style={{ textAlign: "center", fontSize: "min(26cqw, 30cqh)", fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
        {fmtClock(left)}
      </div>

      <div>
        <div style={{ height: 3, borderRadius: 3, background: "rgb(var(--fg-rgb)/0.1)", overflow: "hidden" }}>
          <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: accent, boxShadow: `0 0 8px ${accent}`, transition: "width 1s linear" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 12 }}>
          <button
            onClick={stopFocus}
            aria-label={isBreak ? "Saltar descanso" : "Cancelar bloque"}
            style={roundBtn(34, { border: "1px solid rgb(var(--fg-rgb)/0.16)", background: "rgb(var(--fg-rgb)/0.04)", color: "rgb(var(--fg-rgb)/0.7)" })}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
              <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={paused ? resumeFocus : pauseFocus}
            aria-label={paused ? "Reanudar" : "Pausar"}
            style={roundBtn(46, {
              border: "none",
              color: "#fff",
              background: isBreak ? "linear-gradient(145deg,#3ddc84,#1f8a4c)" : "linear-gradient(145deg,#ff4a55,#b81c27)",
              boxShadow: `0 8px 20px -6px ${isBreak ? "rgba(47,174,102,0.8)" : "rgb(var(--accent-rgb)/0.8)"}`,
            })}
          >
            {paused ? (
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                <path d="M6 3.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L6.9 3.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                <rect x="5" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
                <rect x="11.4" y="3.5" width="3.6" height="13" rx="1.2" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Lives at the app root (not in the Focus screen) so the floating window
 * survives switching tabs. Renders the mini timer into the Picture-in-Picture
 * window and closes it once there's nothing left to time. */
export function FocusPipHost() {
  const pip = useSyncExternalStore(subscribePip, getPip, getPip);
  const timer = useFocusTimer();
  const open = pip.kind !== null;
  const now = useNow(open && timer.status === "running");

  useEffect(() => {
    if (open && timer.status === "idle") closePip();
  }, [open, timer.status]);

  if (pip.kind !== "document" || !pip.win || pip.win.closed) return null;
  return createPortal(<MiniTimer timer={timer} now={now} />, pip.win.document.body);
}
