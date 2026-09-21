import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { registerConfirmHost } from "@/lib/confirm";
import type { ConfirmPending } from "@/lib/confirm";

export function ConfirmHost() {
  const [pending, setPending] = useState<ConfirmPending | null>(null);

  useEffect(() => registerConfirmHost((p) => setPending(p)), []);

  function finish(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <Sheet open={pending != null} onClose={() => finish(false)} title={pending?.title}>
      {pending ? (
        <div className="flex flex-col gap-4">
          {pending.message ? <p className="text-[13px] leading-snug text-[var(--color-muted)]">{pending.message}</p> : null}
          <div className="flex gap-2">
            <button onClick={() => finish(false)} className="glass tap-target flex-1 rounded-full text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
              Cancelar
            </button>
            <Button variant="primary" className="flex-1" onClick={() => finish(true)}>
              {pending.confirmLabel ?? "Confirmar"}
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
