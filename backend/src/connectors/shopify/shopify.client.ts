import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyProductsResponse,
  ShopifyOrdersResponse,
} from './shopify.types';
import { SHOPIFY_MOCK_PRODUCTS, SHOPIFY_MOCK_ORDERS } from './shopify.fixture';

export interface IShopifyClient {
  fetchProducts(): Promise<ShopifyProduct[]>;
  fetchOrders(since?: Date): Promise<ShopifyOrder[]>;
}

@Injectable()
export class ShopifyClient implements IShopifyClient {
  private readonly logger = new Logger(ShopifyClient.name);
  private readonly shop: string | null;
  private readonly accessToken: string | null;
  private readonly apiVersion: string;

  constructor(private readonly config: ConfigService) {
    this.shop = this.config.get<string>('SHOPIFY_SHOP') ?? null;
    this.accessToken = this.config.get<string>('SHOPIFY_ACCESS_TOKEN') ?? null;
    this.apiVersion =
      this.config.get<string>('SHOPIFY_API_VERSION') ?? '2024-01';

    if (this.isConfigured()) {
      this.logger.log(`Configured with live Shopify store: ${this.shop}`);
    } else {
      this.logger.log(
        'Shopify credentials not configured (SHOPIFY_SHOP / SHOPIFY_ACCESS_TOKEN). Running in fixture mode.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.shop && this.accessToken);
  }

  async fetchProducts(): Promise<ShopifyProduct[]> {
    if (!this.isConfigured()) {
      return SHOPIFY_MOCK_PRODUCTS;
    }

    const endpoint = `https://${this.shop}.myshopify.com/admin/api/${this.apiVersion}/products.json?limit=250`;
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken!,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Shopify products fetch failed (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as ShopifyProductsResponse;
    return data.products || [];
  }

  async fetchOrders(since?: Date): Promise<ShopifyOrder[]> {
    if (!this.isConfigured()) {
      if (!since) return SHOPIFY_MOCK_ORDERS;
      return SHOPIFY_MOCK_ORDERS.filter((o) => new Date(o.created_at) >= since);
    }

    let endpoint = `https://${this.shop}.myshopify.com/admin/api/${this.apiVersion}/orders.json?status=any&limit=250`;
    if (since) {
      endpoint += `&created_at_min=${since.toISOString()}`;
    }

    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken!,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Shopify orders fetch failed (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as ShopifyOrdersResponse;
    return data.orders || [];
  }
}
