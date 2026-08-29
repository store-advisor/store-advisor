'use client';

import { AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import type { Finding } from '@/lib/api/findings';
import { formatMoney, humanizeCheckId, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  OPEN: {
    icon: AlertTriangle,
    ring: 'ring-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-300',
    label: 'Open',
  },
  FIXED: {
    icon: CheckCircle2,
    ring: 'ring-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-300',
    label: 'Fixed',
  },
  DISMISSED: {
    icon: MinusCircle,
    ring: 'ring-zinc-500/30',
    badge: 'bg-zinc-500/15 text-zinc-400',
    label: 'Dismissed',
  },
} as const;

export function FindingCard({
  finding,
  selected,
  onSelect,
}: {
  finding: Finding;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const style = STATUS_STYLES[finding.status];
  const Icon = style.icon;
  const product = finding.evidence.product_title;

  return (
    <button
      type="button"
      onClick={() => onSelect(finding.id)}
      aria-current={selected}
      className={cn(
        'w-full rounded-lg p-4 text-left ring-1 transition',
        'bg-zinc-900/60 hover:bg-zinc-900',
        style.ring,
        selected && 'ring-2 ring-amber-400/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-zinc-400">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-xs uppercase tracking-wide">
            {humanizeCheckId(finding.checkId)}
          </span>
        </div>
        <span className={cn('rounded px-2 py-0.5 text-xs', style.badge)}>
          {style.label}
        </span>
      </div>

      {/* The number is the headline. It is what the merchant reacts to, and
          it is the thing the check proved from real rows. */}
      <p className="mt-3 text-2xl font-semibold text-zinc-50">
        {formatMoney(finding.estimatedCost)}
        <span className="ml-1 text-sm font-normal text-zinc-400">/week</span>
      </p>

      {typeof product === 'string' && (
        <p className="mt-1 text-sm text-zinc-300">{product}</p>
      )}

      <p className="mt-2 text-xs text-zinc-500">
        Found {formatDate(finding.createdAt)}
      </p>
    </button>
  );
}
