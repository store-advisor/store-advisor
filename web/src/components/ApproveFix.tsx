'use client';

import { useApproveFinding } from '@/lib/hooks/useApproveFinding';
import type { Finding } from '@/lib/api/findings';

/**
 * Stage 5, and the honest half of stage 6.
 *
 * The button pauses the campaign. It deliberately does not colour the card
 * green, because approving is not proof: the finding turns green when a
 * later check run re-observes the sources and sees the spend has actually
 * stopped. Saying "Fixed" at the moment of the click would be the exact
 * claim HANDBOOK.md section 2 argues every other product makes and we do
 * not. The success message says what happened and what has not happened yet.
 */
export function ApproveFix({ finding }: { finding: Finding }) {
  const approve = useApproveFinding(finding.merchantId);
  const campaign = finding.evidence.campaign_name;
  const hasCampaign = typeof finding.evidence.campaign_id === 'string';

  if (finding.status === 'FIXED') {
    return (
      <section className="mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
        <p className="text-sm font-medium text-emerald-200">
          Fixed. A later check run confirmed the spend stopped.
        </p>
      </section>
    );
  }

  if (finding.status === 'DISMISSED') {
    return (
      <section className="mt-6 rounded-lg bg-zinc-800/60 px-4 py-3 ring-1 ring-zinc-700">
        <p className="text-sm text-zinc-400">Dismissed. No action taken.</p>
      </section>
    );
  }

  return (
    <section className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => approve.mutate(finding.id)}
          disabled={approve.isPending || !hasCampaign || approve.isSuccess}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {approve.isPending
            ? 'Pausing…'
            : approve.isSuccess
              ? 'Paused'
              : 'Pause campaign'}
        </button>
        {typeof campaign === 'string' && !approve.isSuccess && (
          <span className="text-xs text-zinc-500">
            Pauses {campaign} through the ad platform.
          </span>
        )}
      </div>

      {!hasCampaign && (
        <p className="mt-2 text-xs text-zinc-500">
          This finding names no campaign, so there is nothing to pause.
        </p>
      )}

      {approve.isSuccess && (
        <p className="mt-3 text-sm text-emerald-300">
          {approve.data.replayed
            ? 'Already paused. The original request stands; nothing ran twice.'
            : 'Campaign paused.'}{' '}
          <span className="text-zinc-400">
            This card turns green when the next check run confirms the spend
            stopped, not before.
          </span>
        </p>
      )}

      {approve.isError && (
        <p className="mt-3 text-sm text-red-300">
          {approve.error instanceof Error
            ? approve.error.message
            : 'Could not approve the fix.'}
        </p>
      )}
    </section>
  );
}
