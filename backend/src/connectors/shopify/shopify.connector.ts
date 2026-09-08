import { Injectable, Logger } from '@nestjs/common';
import {
  StoreConnector,
  NormalizedProduct,
  NormalizedOrder,
  FetchOrdersOptions,
} from '../store-connector.interface';
import { ShopifyClient } from './shopify.client';
import {
  normalizeShopifyProducts,
  normalizeShopifyOrders,
} from './shopify-normalizer';

/**
 * Shopify Store Connector (Stage 1: INGEST).
 *
 * Implements the StoreConnector contract for Shopify stores.
 * Pulls products, variants, inventory levels, and orders from the Shopify Admin API,
 * and normalizes them into the Store Advisor canonical data model.
 */
@Injectable()
export class ShopifyConnector implements StoreConnector {
  readonly source = 'shopify';
  private readonly logger = new Logger(ShopifyConnector.name);

  constructor(private readonly client: ShopifyClient) {}

  async fetchProducts(merchantId: string): Promise<NormalizedProduct[]> {
    this.logger.log(`Fetching Shopify products for merchant ${merchantId}`);
    const rawProducts = await this.client.fetchProducts();
    const normalized = normalizeShopifyProducts(rawProducts);
    this.logger.log(
      `Normalized ${normalized.length} Shopify product variant(s) for merchant ${merchantId}`,
    );
    return normalized;
  }

  async fetchOrders(
    merchantId: string,
    options?: FetchOrdersOptions,
  ): Promise<NormalizedOrder[]> {
    this.logger.log(
      `Fetching Shopify orders for merchant ${merchantId}${options?.since ? ` since ${options.since.toISOString()}` : ''}`,
    );
    const rawOrders = await this.client.fetchOrders(options?.since);
    const normalized = normalizeShopifyOrders(rawOrders);
    this.logger.log(
      `Normalized ${normalized.length} Shopify order line item(s) for merchant ${merchantId}`,
    );
    return normalized;
  }
}
