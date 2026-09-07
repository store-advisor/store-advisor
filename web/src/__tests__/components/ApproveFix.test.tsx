import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApproveFix } from '@/components/ApproveFix';
import type { Finding } from '@/lib/api/findings';

const open: Finding = {
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
    campaign_id: 'c1',
  },
};

function renderFix(finding: Finding) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ApproveFix finding={finding} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

function respond(body: unknown, status = 201) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

describe('ApproveFix', () => {
  it('posts an approval with an idempotency key', async () => {
    respond({ id: 'a1', status: 'SUCCEEDED', replayed: false });
    renderFix(open);

    await userEvent.click(screen.getByRole('button', { name: 'Pause campaign' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/findings/f1/actions');
    expect(init.method).toBe('POST');
    // The key is what stops a double-tap pausing twice. Its value does not
    // matter here; its presence does.
    expect(JSON.parse(init.body).idempotency_key).toEqual(expect.any(String));
    expect(JSON.parse(init.body).idempotency_key.length).toBeGreaterThan(7);
  });

  it('does not claim the finding is fixed just because the pause succeeded', async () => {
    respond({ id: 'a1', status: 'SUCCEEDED', replayed: false });
    renderFix(open);

    await userEvent.click(screen.getByRole('button', { name: 'Pause campaign' }));

    expect(await screen.findByText(/Campaign paused/)).toBeInTheDocument();
    expect(
      screen.getByText(/turns green when the next check run confirms/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Fixed\./)).not.toBeInTheDocument();
  });

  it('says so when the key was already used, rather than implying a second pause', async () => {
    respond({ id: 'a1', status: 'SUCCEEDED', replayed: true });
    renderFix(open);

    await userEvent.click(screen.getByRole('button', { name: 'Pause campaign' }));

    expect(await screen.findByText(/nothing ran twice/)).toBeInTheDocument();
  });

  it('disables the button once the pause has gone through', async () => {
    respond({ id: 'a1', status: 'SUCCEEDED', replayed: false });
    renderFix(open);

    await userEvent.click(screen.getByRole('button', { name: 'Pause campaign' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Paused' })).toBeDisabled(),
    );
  });

  it('surfaces the API error instead of failing silently', async () => {
    respond({}, 404);
    renderFix(open);

    await userEvent.click(screen.getByRole('button', { name: 'Pause campaign' }));

    expect(
      await screen.findByText('That finding no longer exists.'),
    ).toBeInTheDocument();
  });

  it('offers nothing to press when the finding names no campaign', () => {
    renderFix({ ...open, evidence: { product_title: 'Blue Hoodie' } });

    expect(screen.getByRole('button', { name: 'Pause campaign' })).toBeDisabled();
    expect(screen.getByText(/names no campaign/)).toBeInTheDocument();
  });

  it('shows a fixed finding as confirmed by a later run, not by the click', () => {
    renderFix({ ...open, status: 'FIXED' });

    expect(
      screen.getByText(/A later check run confirmed the spend stopped/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
