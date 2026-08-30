import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Action, ActionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AD_PLATFORMS, AdPlatform } from './ad-platform.interface';

/** The only action we support today. A second one is a new branch here, not a new service. */
export const PAUSE_CAMPAIGN = 'pause_campaign';

@Injectable()
export class ActionsService {
  private readonly logger = new Logger(ActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AD_PLATFORMS) private readonly platforms: AdPlatform[],
  ) {}

  /**
   * Approve and execute an action against a finding.
   *
   * The idempotency key is the whole point of this method. HANDBOOK.md
   * section 4, stage 5: a retried request or a double-tapped button must
   * never pause a campaign twice. The guarantee is a UNIQUE constraint in
   * Postgres, not a check-then-insert in application code — two concurrent
   * requests can both pass a check before either inserts, and only the
   * database can settle that race.
   */
  async approve(
    findingId: string,
    idempotencyKey: string,
  ): Promise<{ id: string; status: ActionStatus; replayed: boolean }> {
    const finding = await this.prisma.finding.findUnique({
      where: { id: findingId },
    });
    if (!finding) {
      throw new NotFoundException(`No finding ${findingId}`);
    }

    const campaignId = (finding.evidence as Record<string, unknown>)
      ?.campaign_id;
    if (typeof campaignId !== 'string') {
      throw new BadRequestException('This finding has no campaign to pause.');
    }

    const request = { action: PAUSE_CAMPAIGN, campaign_id: campaignId };

    let action: Action;
    try {
      action = await this.prisma.action.create({
        data: {
          merchantId: finding.merchantId,
          findingId: finding.id,
          actionType: PAUSE_CAMPAIGN,
          status: ActionStatus.PENDING,
          idempotencyKey,
          request: request,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // This merchant already claimed this key. Return what that attempt
        // did rather than doing the work again — this is the double-tap, and
        // it must be a no-op with a truthful answer, not an error.
        //
        // Scoped by merchant: keys are caller-supplied, so two merchants can
        // and will pick the same string. An unscoped lookup would hand one
        // merchant another's action id and status, and silently never pause
        // the campaign they asked about.
        const existing = await this.prisma.action.findUnique({
          where: {
            merchantId_idempotencyKey: {
              merchantId: finding.merchantId,
              idempotencyKey,
            },
          },
        });
        if (existing) {
          this.logger.log(`Replayed idempotent action ${idempotencyKey}`);
          return {
            id: existing.id,
            status: existing.status,
            replayed: true,
          };
        }
      }
      throw error;
    }

    return {
      ...(await this.execute(action.id, finding.merchantId, campaignId)),
      replayed: false,
    };
  }

  private async execute(
    actionId: string,
    merchantId: string,
    campaignId: string,
  ): Promise<{ id: string; status: ActionStatus }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, merchantId },
    });

    const platform = campaign
      ? this.platforms.find((p) => p.source === campaign.source)
      : undefined;

    if (!campaign || !platform) {
      return this.finish(actionId, ActionStatus.FAILED, {
        error: campaign ? 'no_platform_for_source' : 'campaign_not_found',
        source: campaign?.source,
      });
    }

    try {
      const result = await platform.pauseCampaign(
        merchantId,
        campaign.externalId,
      );
      return this.finish(
        actionId,
        result.paused ? ActionStatus.SUCCEEDED : ActionStatus.FAILED,
        result.raw,
      );
    } catch (error) {
      // A failed action is a fact worth keeping, not an exception to swallow.
      // The merchant needs to be told it did not work, and we need the
      // response body to find out why.
      this.logger.error(
        `Action ${actionId} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      return this.finish(actionId, ActionStatus.FAILED, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async finish(
    actionId: string,
    status: ActionStatus,
    response: Record<string, unknown>,
  ): Promise<{ id: string; status: ActionStatus }> {
    const updated = await this.prisma.action.update({
      where: { id: actionId },
      data: {
        status,
        response: response as Prisma.InputJsonValue,
        executedAt: new Date(),
      },
    });
    return { id: updated.id, status: updated.status };
  }
}
