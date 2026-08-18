/**
 * Component tests for StrategyDecisionTree
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyDecisionTree } from '@/components/advanced/StrategyDecisionTree';
import type { DatasetProfile } from '@/lib/api/ai';

// Mock thinking-orbs — uses canvas which jsdom doesn't support
jest.mock('thinking-orbs', () => ({
  ThinkingOrb: () => <div data-testid="thinking-orb" />,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const profileWithData: DatasetProfile = {
  filename: 'sales.csv',
  quality_score: 80,
  dataset: { rows: 500, columns: 3, duplicate_rows: 10 },
  columns: [
    {
      name: 'price',
      dtype: 'float64',
      missing_count: 20,
      missing_percentage: 4,
      unique_count: 200,
      quality_flags: ['some-missing'],
    },
    {
      name: 'category',
      dtype: 'object',
      missing_count: 5,
      missing_percentage: 1,
      unique_count: 10,
      quality_flags: [],
    },
    {
      name: 'quantity',
      dtype: 'int64',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 50,
      quality_flags: [],
    },
  ],
};

const profileNoMissing: DatasetProfile = {
  filename: 'clean.csv',
  quality_score: 99,
  dataset: { rows: 100, columns: 1, duplicate_rows: 0 },
  columns: [
    {
      name: 'id',
      dtype: 'int64',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 100,
      quality_flags: [],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<StrategyDecisionTree />', () => {
  const onRun = jest.fn();

  beforeEach(() => {
    onRun.mockClear();
  });

  it('renders the root "Choose Run Mode" node', () => {
    render(
      <StrategyDecisionTree
        profile={profileWithData}
        isRunning={false}
        onRun={onRun}
      />,
    );
    expect(screen.getByText(/choose run mode/i)).toBeInTheDocument();
  });

  it('renders Auto-Advanced and Manual Strategies cards', () => {
    render(
      <StrategyDecisionTree
        profile={profileWithData}
        isRunning={false}
        onRun={onRun}
      />,
    );
    expect(screen.getByText('Auto-Advanced')).toBeInTheDocument();
    expect(screen.getByText('Manual Strategies')).toBeInTheDocument();
  });

  it('does not show run button before a mode is selected', () => {
    render(
      <StrategyDecisionTree
        profile={profileWithData}
        isRunning={false}
        onRun={onRun}
      />,
    );
    expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
  });

  // ── Auto mode ────────────────────────────────────────────────────────────────

  describe('Auto-Advanced mode', () => {
    it('shows the run button after clicking Auto-Advanced', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Auto-Advanced'));
      expect(
        screen.getByRole('button', { name: /run auto-advanced pipeline/i }),
      ).toBeInTheDocument();
    });

    it('calls onRun({ mode: "auto" }) when run button clicked in auto mode', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Auto-Advanced'));
      await userEvent.click(
        screen.getByRole('button', { name: /run auto-advanced pipeline/i }),
      );
      expect(onRun).toHaveBeenCalledWith({ mode: 'auto' });
    });

    it('disables run button and shows loading text when isRunning=true', async () => {
      const { rerender } = render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );

      // Select auto mode
      await userEvent.click(screen.getByText('Auto-Advanced'));

      // The run button should now be present
      const runBtn = screen.getByRole('button', { name: /run auto-advanced pipeline/i });
      expect(runBtn).not.toBeDisabled();

      // Simulate parent setting isRunning=true (e.g. after mutation starts)
      rerender(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={true}
          onRun={onRun}
        />,
      );

      // Button should now be disabled and show loading text
      const loadingBtn = screen.getByRole('button', { name: /running auto-advanced pipeline/i });
      expect(loadingBtn).toBeDisabled();
    });
  });

  // ── Manual mode ───────────────────────────────────────────────────────────────

  describe('Manual Strategies mode', () => {
    it('reveals Duplicates, Missing Values, and Outliers sections', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));

      expect(screen.getByText('Duplicates')).toBeInTheDocument();
      expect(screen.getByText('Missing Values')).toBeInTheDocument();
      expect(screen.getByText('Outliers')).toBeInTheDocument();
    });

    it('shows column names with missing values', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));

      // 'price' appears in both Missing Values and Outliers sections — use getAllByText
      expect(screen.getAllByText('price').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('category').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "No missing values detected" when all columns are clean', async () => {
      render(
        <StrategyDecisionTree
          profile={profileNoMissing}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      expect(screen.getByText(/no missing values detected/i)).toBeInTheDocument();
    });

    it('calls onRun with manual params using defaults', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      await userEvent.click(
        screen.getByRole('button', { name: /run with selected strategies/i }),
      );

      expect(onRun).toHaveBeenCalledTimes(1);
      const args = onRun.mock.calls[0][0];
      expect(args.mode).toBe('manual');
      // Default dup_strategy is 'remove'
      expect(args.dup_strategy).toBe('remove');
      // Numeric col 'price' defaults to Median
      expect(args.missing_strategies?.price).toBe('Median');
      // Categorical col 'category' defaults to Mode
      expect(args.missing_strategies?.category).toBe('Mode');
      // Numeric cols get outlier strategy
      expect(args.outlier_strategies?.price).toBe('Remove');
      expect(args.outlier_strategies?.quantity).toBe('Remove');
    });

    it('passes updated duplicate strategy to onRun', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      // Click "Keep duplicates"
      await userEvent.click(screen.getByText('Keep duplicates'));
      await userEvent.click(
        screen.getByRole('button', { name: /run with selected strategies/i }),
      );

      const args = onRun.mock.calls[0][0];
      expect(args.dup_strategy).toBe('keep');
    });

    it('passes updated missing strategy to onRun when user changes it', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      // Change price missing strategy from Median → Mean
      await userEvent.click(screen.getByText('Mean'));
      await userEvent.click(
        screen.getByRole('button', { name: /run with selected strategies/i }),
      );

      const args = onRun.mock.calls[0][0];
      expect(args.missing_strategies?.price).toBe('Mean');
    });

    it('passes updated outlier strategy to onRun', async () => {
      render(
        <StrategyDecisionTree
          profile={profileWithData}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      // Change price outlier strategy to Cap (Winsorise)
      // There are multiple "Cap (Winsorise)" buttons (one per numeric col), click the first
      const capButtons = screen.getAllByText('Cap (Winsorise)');
      await userEvent.click(capButtons[0]);
      await userEvent.click(
        screen.getByRole('button', { name: /run with selected strategies/i }),
      );

      const args = onRun.mock.calls[0][0];
      // First numeric col is 'price'
      expect(args.outlier_strategies?.price).toBe('Cap (Winsorise)');
    });

    it('shows "No numeric columns found" in Outliers when dataset has no numeric cols', async () => {
      const textOnlyProfile: DatasetProfile = {
        filename: 'text.csv',
        quality_score: 70,
        dataset: { rows: 50, columns: 1, duplicate_rows: 0 },
        columns: [
          {
            name: 'label',
            dtype: 'object',
            missing_count: 2,
            missing_percentage: 4,
            unique_count: 3,
            quality_flags: [],
          },
        ],
      };
      render(
        <StrategyDecisionTree
          profile={textOnlyProfile}
          isRunning={false}
          onRun={onRun}
        />,
      );
      await userEvent.click(screen.getByText('Manual Strategies'));
      expect(screen.getByText(/no numeric columns found/i)).toBeInTheDocument();
    });
  });
});
