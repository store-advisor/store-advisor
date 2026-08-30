import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdPlatform, PauseResult } from './ad-platform.interface';

/**
 * The demo ad platform.
 *
 * We have no real Meta or Google Ads credentials, and HANDBOOK.md section 9
 * rules out real merchant data. This stands in for a live platform by doing
 * to our own tables what the real API would do to theirs: it flips the
 * campaign to paused, which is exactly the state change the next check run
 * looks for.
 *
 * That matters more than it sounds. Stage 6 is only meaningful if the fix is
 * observable in the data the check reads — so the demo path exercises the
 * same code, the same idempotency guard and the same verification as a real
 * platform would. Swapping in Meta later means adding a class next to this
 * one, not changing the executor.
 */
@Injectable()
export class DemoAdPlatform implements AdPlatform {
  readonly source = 'demo_ads';
  private readonly logger = new Logger(DemoAdPlatform.name);

  constructor(private readonly prisma: PrismaService) {}

  async pauseCampaign(
    merchantId: string,
    externalId: string,
  ): Promise<PauseResult> {
    // Scoped by merchant, and via the composite unique key rather than a
    // findFirst. External ids are only unique within a merchant, so looking
    // one up on (source, externalId) alone can resolve to a different
    // merchant's campaign and pause the wrong thing.
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        merchantId_source_externalId: {
          merchantId,
          source: this.source,
          externalId,
        },
      },
    });

    if (!campaign) {
      return {
        paused: false,
        raw: { error: 'campaign_not_found', external_id: externalId },
      };
    }

    // Already paused is success, not an error. A merchant double-tapping
    // Pause should see it work the second time too.
    if (campaign.status === 'paused') {
      return {
        paused: true,
        raw: {
          external_id: externalId,
          status: 'paused',
          already_paused: true,
        },
      };
    }

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'paused' },
    });

    this.logger.log(`Paused campaign ${externalId} (${campaign.name})`);

    return {
      paused: true,
      raw: {
        external_id: externalId,
        status: 'paused',
        previous_status: campaign.status,
      },
    };
  }
}
