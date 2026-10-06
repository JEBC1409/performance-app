import { useInsights } from "@/hooks/useInsights";
import { Card, Eyebrow } from "@/ui";

/** What your own data says about you. Appears only once there's enough of it to say something true. */
export function InsightsCard() {
  const insights = useInsights();
  if (!insights?.length) return null;
  return (
    <Card className="enter">
      <Eyebrow accent>Descubrimientos</Eyebrow>
      <ul className="mt-3 flex flex-col gap-2.5">
        {insights.map((i) => (
          <li key={i.id} className="flex gap-2.5 text-[13px] leading-snug">
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-gold)]" />
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10.5px] text-[var(--color-muted-2)]">Calculado con tus últimos 90 días. Son patrones, no causas.</p>
    </Card>
  );
}
