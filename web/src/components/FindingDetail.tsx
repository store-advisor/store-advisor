'use client';

import type { Finding } from '@/lib/api/findings';
import {
  formatMoney,
  formatMoneyExact,
  formatDateTime,
  humanizeCheckId,
  humanizeKey,
} from '@/lib/format';
import { SeverityBadge } from './SeverityBadge';

/**
 * Keys rendered as headline stats rather than in the evidence table, and how
 * to format each. Anything not listed still shows up below - a new check
 * gets a readable detail view with no change here.
 */
const HIGHLIGHTS: {
  key: string;
  label: string;
  format: (v: unknown) => string;
}[] = [
  {
    key: 'spend_since_stockout',
    label: 'Spent since stock-out',
    format: (v) => formatMoneyExact(Number(v)),
  },
  {
    key: 'average_daily_spend',
    label: 'Per day',
    format: (v) => formatMoneyExact(Number(v)),
  },
  {
    key: 'clicks_since_stockout',
    label: 'Clicks to a dead page',
    format: (v) => Number(v).toLocaleString('en-US'),
  },
  {
    key: 'conversions_since_stockout',
    label: 'Sales',
    format: (v) => Number(v).toLocaleString('en-US'),
  },
];

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return `${formatDateTime(value)} UTC`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function FindingDetail({ finding }: { finding: Finding }) {
  const evidence = finding.evidence;
  const highlighted = HIGHLIGHTS.filter((h) => h.key in evidence);
  const highlightKeys = new Set(highlighted.map((h) => h.key));

  return (
    <article className="rounded-lg bg-zinc-900/60 p-6 ring-1 ring-zinc-800">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          {humanizeCheckId(finding.checkId)}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-50">
          {formatMoney(finding.estimatedCost)}
          <span className="ml-2 text-base font-normal text-zinc-400">
            per week
          </span>
        </h2>
        {typeof evidence.product_title === 'string' && (
          <p className="mt-1 text-zinc-300">
            {String(evidence.product_title)}
            {typeof evidence.campaign_name === 'string' &&
              ` · ${String(evidence.campaign_name)}`}
          </p>
        )}
      </header>

      {highlighted.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {highlighted.map((h) => (
            <div key={h.key}>
              <dt className="text-xs text-zinc-500">{h.label}</dt>
              <dd className="mt-1 text-lg font-medium text-zinc-100">
                {h.format(evidence[h.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-6">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Explanation</h3>
          <SeverityBadge severity={finding.llmSeverity} />
        </div>
        {finding.llmExplanation ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {finding.llmExplanation}
            </p>
            {finding.llmConfidence !== null && (
              <p className="mt-1 text-xs text-zinc-500">
                Confidence {Math.round(finding.llmConfidence * 100)}% - the
                model&rsquo;s own estimate, not a measurement
              </p>
            )}
          </>
        ) : (
          // Explicit rather than hidden: a blank space would read as a bug.
          //
          // The wording matters. Every figure above is proved and stays on
          // screen whether or not this paragraph arrives, so the absence of
          // prose is not the absence of a finding. An explanation is also
          // withheld on purpose when the model puts a number in it that the
          // evidence does not account for - see ExplainService.
          <p className="mt-2 text-sm text-zinc-500">
            No explanation yet. The figures above are unaffected: they were
            computed from the evidence, not written by the model.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-medium text-zinc-300">Evidence</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Every figure above is computed from these rows. The explanation
          describes them and never produces its own numbers.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-800">
              {Object.entries(evidence)
                .filter(
                  ([k]) => !highlightKeys.has(k) && k !== 'dedupe_key',
                )
                .map(([key, value]) => (
                  <tr key={key}>
                    <th
                      scope="row"
                      className="py-2 pr-4 text-left font-normal text-zinc-500"
                    >
                      {humanizeKey(key)}
                    </th>
                    <td className="py-2 font-mono text-xs text-zinc-300">
                      {renderValue(value)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
