import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Check, CheckResult } from './check.interface';

/**
 * Row shape returned by the correlation query below. Kept explicit because
 * $queryRaw cannot infer it.
 */
interface AdSpendOnOosRow {
  product_id: string;
  product_title: string;
  campaign_id: string;
  campaign_name: string;
  campaign_external_id: string;
  stock_out_at: Date;
  spend_since_stockout: string;
  clicks_since_stockout: number;
  conversions_since_stockout: number;
  days_with_spend: number;
}

/**
 * The flagship check: money spent advertising a product nobody can buy.
 *
 * This is the join the whole project exists for. The store knows the hoodie
 * is out of stock. The ad account knows the campaign is running. Neither
 * knows both, and the waste lives in between.
 *
 * Raw SQL on purpose, per docs/STACK.md: the correlation is a five-table
 * join with an aggregate over a time range, which an ORM expresses badly.
 */
@Injectable()
export class AdSpendOnOosCheck implements Check {
  readonly id = 'ad_spend_on_oos';

  /**
   * Below this, a finding is noise rather than news. A merchant does not
   * want a push notification about $1.20.
   */
  private static readonly MIN_SPEND_USD = 10;

  private static readonly DAYS_PER_WEEK = 7;

  constructor(private readonly prisma: PrismaService) {}

  async run(merchantId: string): Promise<CheckResult[]> {
    const rows = await this.prisma.$queryRaw<AdSpendOnOosRow[]>`
      WITH stock_out AS (
        -- The most recent stock-out per product. MAX, not the first: a
        -- product that sold out, restocked and sold out again is only
        -- leaking money since the latest one.
        SELECT e.entity_id AS product_id, MAX(e.occurred_at) AS stock_out_at
        FROM events e
        WHERE e.merchant_id = ${merchantId}
          AND e.entity_type = 'product'
          AND e.event_type = 'stock_out'
        GROUP BY e.entity_id
      )
      SELECT
        p.id                        AS product_id,
        p.title                     AS product_title,
        c.id                        AS campaign_id,
        c.name                      AS campaign_name,
        c.external_id               AS campaign_external_id,
        s.stock_out_at              AS stock_out_at,
        SUM(a.spend)::text          AS spend_since_stockout,
        SUM(a.clicks)::int          AS clicks_since_stockout,
        SUM(a.conversions)::int     AS conversions_since_stockout,
        COUNT(DISTINCT a.date)::int AS days_with_spend
      FROM products p
      JOIN stock_out s        ON s.product_id = p.id
      JOIN campaign_products cp ON cp.product_id = p.id
      JOIN campaigns c        ON c.id = cp.campaign_id
                             AND c.merchant_id = p.merchant_id
      JOIN ad_spend a         ON a.campaign_id = c.id
                             AND a.merchant_id = p.merchant_id
                             -- Time alignment, and the subtlest line here.
                             -- ad_spend.date is a calendar DATE because ad
                             -- platforms report by day; stock_out_at is a
                             -- precise instant. There is no way to split the
                             -- stock-out day's spend at 09:12, so the whole
                             -- day is counted. That over-states by at most
                             -- one day, which we accept and disclose rather
                             -- than inventing an intra-day apportionment we
                             -- could not defend. See docs/decisions.
                             AND a.date >= s.stock_out_at::date
      WHERE p.merchant_id = ${merchantId}
        AND p.inventory_qty = 0
        -- Only campaigns still running. A paused campaign is the fix we
        -- recommend, so counting one would stop the finding ever clearing.
        AND c.status = 'active'
      GROUP BY p.id, p.title, c.id, c.name, c.external_id, s.stock_out_at
      HAVING SUM(a.spend) >= ${AdSpendOnOosCheck.MIN_SPEND_USD}
      ORDER BY SUM(a.spend) DESC
    `;

    return rows.map((row) => this.toFinding(row));
  }

  private toFinding(row: AdSpendOnOosRow): CheckResult {
    // Decimal arrives as text so no precision is lost in transit; parse once,
    // here, where the rounding rule is visible.
    const spendSinceStockout = Number(row.spend_since_stockout);
    const days = Math.max(row.days_with_spend, 1);
    const averageDailySpend = spendSinceStockout / days;

    // The headline figure is a weekly run rate, matching the "dollars per
    // week" the findings table stores and the demo card shows. It answers
    // "what will this cost me if nothing changes", which is the question a
    // merchant is actually asking. The cumulative spend so far is in the
    // evidence below, so the AI can cite either without computing either.
    const estimatedCost = this.round2(
      averageDailySpend * AdSpendOnOosCheck.DAYS_PER_WEEK,
    );

    return {
      dedupeKey: `${row.product_id}:${row.campaign_id}`,
      estimatedCost,
      evidence: {
        product_id: row.product_id,
        product_title: row.product_title,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        campaign_external_id: row.campaign_external_id,
        stock_out_at: row.stock_out_at.toISOString(),
        days_with_spend: row.days_with_spend,
        spend_since_stockout: this.round2(spendSinceStockout),
        average_daily_spend: this.round2(averageDailySpend),
        clicks_since_stockout: row.clicks_since_stockout,
        conversions_since_stockout: row.conversions_since_stockout,
        weekly_run_rate: estimatedCost,
      },
    };
  }

  /** Money, so two decimal places. Kept in one place so every figure rounds identically. */
  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
