import { Button, Sheet } from "@/ui";
import { BACKUP_TABLES, type BackupPreview, type BackupTable } from "@/lib/jsonBackup";
import { BACKUP_TABLE_LABEL } from "./backupLabels";

export interface PendingImport {
  fileName: string;
  preview: BackupPreview;
  /** Rows the device has today in the tables that would be replaced. */
  current: Partial<Record<BackupTable, number>>;
}

const plural = (n: number) => `${n} ${n === 1 ? "registro" : "registros"}`;

function fmtExported(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

/** Confirmation before a backup file touches the data on this device: what it brings, which
 * tables it REPLACES (and what you lose there), which it only merges, plus the file's warnings.
 * Nothing is written until the person confirms. */
export function ImportBackupSheet({
  pending,
  busy = false,
  onClose,
  onConfirm,
  onExport,
}: {
  pending: PendingImport | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onExport: () => void;
}) {
  const p = pending?.preview;
  // A replaced table that is empty on both sides changes nothing, so it is not worth a line.
  const replaces = p ? BACKUP_TABLES.filter((t) => p.replaces.includes(t) && (p.counts[t] > 0 || (pending?.current[t] ?? 1) > 0)) : [];
  const merges = p ? BACKUP_TABLES.filter((t) => !p.replaces.includes(t) && p.counts[t] > 0) : [];
  const exported = p ? fmtExported(p.exportedAt) : null;

  return (
    <Sheet open={pending != null} onClose={onClose} title="Importar copia de seguridad">
      {pending && p ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-snug text-[var(--color-muted)]">
            <span className="break-all font-medium text-[var(--color-ink)]">{pending.fileName}</span>
            {exported ? ` · copia del ${exported}` : ""} · {plural(p.total)}
          </p>

          {replaces.length ? (
            <section aria-label="Se reemplazan" className="rounded-xl border border-[var(--color-line-strong)] p-3">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Se reemplazan por completo</h3>
              <p className="mt-0.5 text-meta leading-snug text-[var(--color-muted)]">Lo que tienes ahora en estas tablas se borra y queda lo que trae el archivo.</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {replaces.map((t) => (
                  <li key={t} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{BACKUP_TABLE_LABEL[t]}</span>
                    <span className="num text-right text-[var(--color-muted)]">
                      {pending.current[t] != null ? `${pending.current[t]} → ` : ""}
                      <span className="font-semibold text-[var(--color-ink)]">{p.counts[t]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {merges.length ? (
            <section aria-label="Se combinan" className="rounded-xl border border-[var(--color-line)] p-3">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Se combinan con lo que ya tienes</h3>
              <p className="mt-0.5 text-meta leading-snug text-[var(--color-muted)]">Se añaden o actualizan; lo que no esté en el archivo se queda.</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {merges.map((t) => (
                  <li key={t} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{BACKUP_TABLE_LABEL[t]}</span>
                    <span className="num font-semibold">{p.counts[t]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {p.warnings.length ? (
            <ul className="flex flex-col gap-1 text-meta leading-snug text-[var(--color-ink)]" aria-label="Avisos">
              {p.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-xl bg-[rgb(var(--fg-rgb)/0.05)] p-3">
            <p className="text-sm leading-snug">Antes de importar, guarda una copia de lo que tienes ahora: así puedes volver atrás.</p>
            <Button className="mt-2 w-full" onClick={onExport}>
              Exportar copia actual (.json)
            </Button>
          </div>

          <div className="flex gap-2">
            <Button className="flex-none px-5" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={onConfirm} disabled={busy}>
              {busy ? "Importando…" : replaces.length ? "Reemplazar e importar" : "Importar"}
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
