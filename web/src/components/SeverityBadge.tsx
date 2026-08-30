import { cn } from '@/lib/utils';

/**
 * The model's urgency ranking.
 *
 * Deliberately separate from the money and from the status badge, because it
 * is a different kind of claim. The dollar figure is proved: deterministic
 * code derived it from real rows. Severity is a judgement the LLM made about
 * that figure. Showing them in the same visual language would tell the
 * merchant both carry the same weight, and they do not.
 *
 * Unknown values render rather than disappear. Severity is free text on
 * purpose — widening the model's vocabulary must not need a migration — so
 * this has to survive a word it has never seen.
 */
const STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-300 ring-red-500/30',
  high: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-200 ring-yellow-500/30',
  low: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
};

const FALLBACK = 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30';

export function SeverityBadge({
  severity,
  className,
}: {
  severity: string | null;
  className?: string;
}) {
  if (!severity) return null;

  return (
    <span
      className={cn(
        'rounded px-2 py-0.5 text-xs capitalize ring-1',
        STYLES[severity.toLowerCase()] ?? FALLBACK,
        className,
      )}
      title="Urgency ranked by the AI service, not a measured value"
    >
      {severity}
    </span>
  );
}
