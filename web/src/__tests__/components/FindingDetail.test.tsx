import { render, screen } from '@testing-library/react';
import { FindingDetail } from '@/components/FindingDetail';
import type { Finding } from '@/lib/api/findings';

const finding: Finding = {
  id: 'f1',
  merchantId: 'demo_merchant',
  checkId: 'ad_spend_on_oos',
  status: 'OPEN',
  estimatedCost: 283.5,
  llmExplanation: null,
  llmConfidence: null,
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
    dedupe_key: 'p1:c1',
  },
};

describe('FindingDetail', () => {
  it('shows the headline figure the demo card promises', () => {
    render(<FindingDetail finding={finding} />);
    expect(screen.getByText('$284')).toBeInTheDocument();
  });

  it('shows the evidence a merchant reacts to', () => {
    render(<FindingDetail finding={finding} />);
    expect(screen.getByText('Blue Hoodie · Spring Sale')).toBeInTheDocument();
    expect(screen.getByText('$243.00')).toBeInTheDocument();
    expect(screen.getByText('$40.50')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });

  it('says plainly when the AI has not explained it yet', () => {
    render(<FindingDetail finding={finding} />);
    expect(screen.getByText(/Not explained yet/)).toBeInTheDocument();
  });

  it('shows the explanation and confidence once they exist', () => {
    render(
      <FindingDetail
        finding={{
          ...finding,
          llmExplanation: 'You are paying for clicks nobody can convert.',
          llmConfidence: 0.95,
        }}
      />,
    );
    expect(
      screen.getByText('You are paying for clicks nobody can convert.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confidence 95%')).toBeInTheDocument();
  });

  it('hides the internal dedupe key from the evidence table', () => {
    render(<FindingDetail finding={finding} />);
    expect(screen.queryByText('Dedupe Key')).not.toBeInTheDocument();
  });

  it('renders an unknown check readably instead of breaking', () => {
    render(
      <FindingDetail
        finding={{
          ...finding,
          checkId: 'dead_stock',
          evidence: { sku: 'ABC-1', units_unsold: 40 },
        }}
      />,
    );
    expect(screen.getByText('dead stock')).toBeInTheDocument();
    expect(screen.getByText('Units Unsold')).toBeInTheDocument();
  });
});
