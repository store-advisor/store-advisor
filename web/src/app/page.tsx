'use client';

import { useState } from 'react';
import { useFindings } from '@/lib/hooks/useFindings';
import { FindingCard } from '@/components/FindingCard';
import { FindingDetail } from '@/components/FindingDetail';
import { formatMoney } from '@/lib/format';

/**
 * The findings dashboard.
 *
 * Auth is a stub on the API, so there is no session to read a merchant from
 * yet. Until there is, the merchant is an input - which also makes the demo
 * reproducible by anyone with the repo.
 */
const DEFAULT_MERCHANT = 'demo_merchant';

export default function DashboardPage() {
  const [merchantId, setMerchantId] = useState(DEFAULT_MERCHANT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: findings, isLoading, error } = useFindings(merchantId);

  const open = findings?.filter((f) => f.status === 'OPEN') ?? [];
  const weeklyTotal = open.reduce((sum, f) => sum + f.estimatedCost, 0);
  const selected =
    findings?.find((f) => f.id === selectedId) ?? findings?.[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-50">Store Advisor</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Money leaking out of your store, and what to do about it.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="merchant" className="text-xs text-zinc-500">
            Merchant
          </label>
          <input
            id="merchant"
            value={merchantId}
            onChange={(e) => {
              setMerchantId(e.target.value);
              setSelectedId(null);
            }}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200"
          />
        </div>
      </header>

      {open.length > 0 && (
        <p className="mb-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">
          You are losing{' '}
          <strong className="font-semibold">{formatMoney(weeklyTotal)}</strong>{' '}
          a week across {open.length}{' '}
          {open.length === 1 ? 'finding' : 'findings'}.
        </p>
      )}

      {isLoading && <p className="text-sm text-zinc-400">Loading findings…</p>}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </p>
      )}

      {findings && findings.length === 0 && (
        <div className="rounded-lg bg-zinc-900/60 px-4 py-8 text-center ring-1 ring-zinc-800">
          <p className="text-sm text-zinc-300">Nothing leaking right now.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Seed the demo fixture and run the check engine to see a finding
            here.
          </p>
        </div>
      )}

      {findings && findings.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <div className="flex flex-col gap-3">
            {findings.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                selected={selected?.id === f.id}
                onSelect={setSelectedId}
              />
            ))}
          </div>
          {selected && <FindingDetail finding={selected} />}
        </div>
      )}
    </main>
  );
}
