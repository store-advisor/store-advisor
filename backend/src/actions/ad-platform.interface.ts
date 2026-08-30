/**
 * What an ad platform must be able to do for us to act on its behalf.
 *
 * Per rule 1 in ROLES.md, a new source is a new implementation of this
 * interface, never a change to the executor. Meta, Google Ads and TikTok all
 * pause a campaign; none of them should require the executor to know which
 * one it is talking to.
 */
export interface PauseResult {
  /** Whether the platform confirmed the campaign is now paused. */
  paused: boolean;
  /** Raw response, logged verbatim on the action row for auditing. */
  raw: Record<string, unknown>;
}

export interface AdPlatform {
  /** The `source` value on campaigns this platform owns. */
  readonly source: string;

  /**
   * Pause a campaign by its external id, on behalf of one merchant.
   *
   * `merchantId` is not optional bookkeeping. An external id is only unique
   * *within* a merchant — `campaigns` is keyed on
   * (merchantId, source, externalId) — so resolving one without the tenant can
   * land on another merchant's campaign. A real Meta or Google Ads client
   * needs it for a second reason: it selects which merchant's stored
   * credentials to authenticate with.
   *
   * Implementations must be safe to call twice: the executor guards against
   * duplicate work with an idempotency key, but a network retry inside the
   * platform client can still land the same call twice, and pausing an
   * already-paused campaign must not be an error.
   */
  pauseCampaign(merchantId: string, externalId: string): Promise<PauseResult>;
}

export const AD_PLATFORMS = Symbol('AD_PLATFORMS');
