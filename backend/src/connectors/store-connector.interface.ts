/**
 * Normalized product representation from a store platform.
 *
 * Conforms to the `Product` model schema in canonical storage (Layer 2),
 * with prices as numbers and timezones in UTC.
 */
export interface NormalizedProduct {
  /** External identifier on the store platform (e.g., Shopify product or variant ID). */
  externalId: string;

  /** Stock keeping unit, if available. */
  sku?: string | null;

  /** Product title / name. */
  title: string;

  /** Unit price in merchant store currency (normalized to decimal number). */
  price: number;

  /** Current available inventory quantity. */
  inventoryQty: number;

  /** Status on the platform (e.g., 'active', 'archived', 'draft'). */
  status: string;

  /** When the product was last updated on the source platform (UTC). */
  updatedAt?: Date;

  /**
   * Raw payload from the source platform API, preserved for the Raw layer (Layer 1)
   * to enable replay without re-fetching.
   */
  raw?: Record<string, unknown>;
}

/**
 * Normalized order line item from a store platform.
 *
 * Proves whether a product actually sold (e.g., verifying zero conversions or sales
 * after a stock-out event).
 */
export interface NormalizedOrder {
  /** External order identifier on the store platform. */
  externalId: string;

  /**
   * The external product or variant identifier that matches `NormalizedProduct.externalId`.
   * Used by the ingestion layer to resolve foreign keys to internal `products.id`.
   */
  productExternalId: string;

  /** Quantity purchased. */
  qty: number;

  /** Total revenue for this line item (price * qty). */
  revenue: number;

  /** When the order was created on the source platform (UTC). */
  createdAt: Date;

  /** Raw payload for auditing / replay. */
  raw?: Record<string, unknown>;
}

/**
 * Filter options for querying orders.
 */
export interface FetchOrdersOptions {
  /** Only fetch orders created at or after this date. */
  since?: Date;
}

/**
 * What a store platform connector must implement.
 *
 * Per HANDBOOK.md § 5 and ROLES.md Rule 1:
 * "A new data source is a new connector, never a change to the check engine."
 * Every store platform (Shopify, Salla, WooCommerce) implements this interface.
 */
export interface StoreConnector {
  /**
   * The `source` identifier stored on `products`, `orders`, and `events`
   * (e.g., 'shopify', 'salla', 'woocommerce').
   */
  readonly source: string;

  /**
   * Fetch and normalize product catalog and inventory state for a merchant.
   *
   * @param merchantId The internal merchant tenant ID.
   */
  fetchProducts(merchantId: string): Promise<NormalizedProduct[]>;

  /**
   * Fetch and normalize orders for a merchant, optionally filtered by date.
   *
   * @param merchantId The internal merchant tenant ID.
   * @param options Query filters (such as `since` timestamp).
   */
  fetchOrders(
    merchantId: string,
    options?: FetchOrdersOptions,
  ): Promise<NormalizedOrder[]>;
}

/** DI token for registering and injecting store connectors. */
export const STORE_CONNECTORS = Symbol('STORE_CONNECTORS');
