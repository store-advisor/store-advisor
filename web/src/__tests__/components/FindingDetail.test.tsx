import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FindingDetail } from '@/components/FindingDetail';
import type { Finding } from '@/lib/api/findings';

/**
 * FindingDetail now contains the approve button, which is a mutation, so it
 * needs a client in context. A fresh one per render keeps tests isolated,
 * and retries are off so a failed request surfaces immediately instead of
 * being retried past the assertion.
 */
function renderDetail(f: Finding) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FindingDetail finding={f} />
    </QueryClientProvider>,
  );
}

const finding: Finding = {
  id: 'f1',
  merchantId: 'demo_merchant',
  checkId: 'ad_spend_on_oos',
  status: 'OPEN',
  estimatedCost: 283.5,
  llmExplanation: null,
  llmConfidence: null,
  llmSeverity: null,
  createdAt: '2026-08-29T23:23:22.905Z',
  evidence: {
    product_title: 'Blue Hoodie',
    campaign_name: 'Spring Sale',
    stock_out_at: '2026-03-04T09:12:00.000Z',
    spend_since_stockout: 243,
    average_daily_spend: 40.5,
    clicks_since_stockout: 1200,
    conversions_since_stockout: 0,
    days_with_spend: 6,
    campaign_id: 'c1',
    dedupe_key: 'p1:c1',
  },
};

describe('FindingDetail', () => {
  it('shows the headline figure the demo card promises', () => {
    renderDetail(finding);
    expect(screen.getByText('$284')).toBeInTheDocument();
  });

  it('shows the evidence a merchant reacts to', () => {
    renderDetail(finding);
    expect(screen.getByText('Blue Hoodie · Spring Sale')).toBeInTheDocument();
    expect(screen.getByText('$243.00')).toBeInTheDocument();
    expect(screen.getByText('$40.50')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });

  it('says plainly when the AI has not explained it yet', () => {
    renderDetail(finding);
    expect(screen.getByText(/No explanation yet/)).toBeInTheDocument();
    // The point of the message: an unexplained finding is still a finding,
    // because the figures were computed rather than written by the model.
    expect(screen.getByText(/computed from the evidence/i)).toBeInTheDocument();
  });

  it('shows the explanation and confidence once they exist', () => {
    renderDetail({
          ...finding,
          llmExplanation: 'You are paying for clicks nobody can convert.',
          llmConfidence: 0.95,
        });
    expect(
      screen.getByText('You are paying for clicks nobody can convert.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Confidence 95%/)).toBeInTheDocument();
  });

  it('hides the internal dedupe key from the evidence table', () => {
    renderDetail(finding);
    expect(screen.queryByText('Dedupe Key')).not.toBeInTheDocument();
  });

  it('renders an unknown check readably instead of breaking', () => {
    renderDetail({
          ...finding,
          checkId: 'dead_stock',
          evidence: { sku: 'ABC-1', units_unsold: 40 },
        });
    expect(screen.getByText('dead stock')).toBeInTheDocument();
    expect(screen.getByText('Units Unsold')).toBeInTheDocument();
  });

  it('shows the severity the AI service ranked it at', () => {
    renderDetail({
          ...finding,
          llmExplanation: 'You are paying for clicks nobody can convert.',
          llmConfidence: 0.95,
          llmSeverity: 'critical',
        });
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders a severity it has never seen rather than dropping it', () => {
    // Severity is free text by design, so an unrecognised word must still
    // reach the merchant instead of silently vanishing.
    renderDetail({ ...finding, llmSeverity: 'urgent' });
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('shows no severity badge when the finding has not been explained', () => {
    renderDetail(finding);
    expect(screen.queryByTitle(/ranked by the AI service/i)).toBeNull();
  });
});
