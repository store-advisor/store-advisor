import type { Metadata } from 'next';

/**
 * Per-route metadata, so the root layout stays exactly as the web branch
 * wrote it. Next merges this over the root export for /dashboard only,
 * which is the cheapest way to let one app carry two product names.
 */
export const metadata: Metadata = {
  title: 'Store Advisor — Findings',
  description:
    'Money leaking out of your store, and what to do about it.',
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
