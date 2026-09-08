import {
  NormalizedProduct,
  NormalizedOrder,
} from '../store-connector.interface';
import { ShopifyProduct, ShopifyOrder } from './shopify.types';

/**
 * Normalizes a list of Shopify Admin API products and their variants into
 * the Store Advisor canonical product structure (Layer 2).
 *
 * Each variant represents a buyable item with independent SKU, price, and inventory level.
 */
export function normalizeShopifyProducts(
  products: ShopifyProduct[],
): NormalizedProduct[] {
  const normalized: NormalizedProduct[] = [];

  for (const product of products) {
    if (!product.variants || product.variants.length === 0) {
      normalized.push({
        externalId: String(product.id),
        sku: null,
        title: product.title,
        price: 0,
        inventoryQty: 0,
        status: product.status || 'active',
        updatedAt: new Date(product.updated_at),
        raw: product as unknown as Record<string, unknown>,
      });
      continue;
    }

    for (const variant of product.variants) {
      const hasDistinctVariantTitle =
        variant.title &&
        variant.title !== 'Default Title' &&
        variant.title !== product.title;

      const title = hasDistinctVariantTitle
        ? `${product.title} - ${variant.title}`
        : product.title;

      const price = parseFloat(variant.price);

      normalized.push({
        externalId: String(variant.id),
        sku: variant.sku ?? null,
        title,
        price: Number.isNaN(price) ? 0 : price,
        inventoryQty: variant.inventory_quantity ?? 0,
        status: product.status || 'active',
        updatedAt: new Date(variant.updated_at ?? product.updated_at),
        raw: variant as unknown as Record<string, unknown>,
      });
    }
  }

  return normalized;
}

/**
 * Normalizes a list of Shopify Admin API orders into line-item sales facts
 * linked to the corresponding product/variant external ID.
 */
export function normalizeShopifyOrders(
  orders: ShopifyOrder[],
): NormalizedOrder[] {
  const normalized: NormalizedOrder[] = [];

  for (const order of orders) {
    if (!order.line_items) continue;

    for (const item of order.line_items) {
      const targetExternalId = item.variant_id ?? item.product_id;
      if (!targetExternalId) continue;

      const unitPrice = parseFloat(item.price);
      const safeUnitPrice = Number.isNaN(unitPrice) ? 0 : unitPrice;
      const revenue = Math.round(item.quantity * safeUnitPrice * 100) / 100;

      normalized.push({
        externalId: `${order.id}_${item.id}`,
        productExternalId: String(targetExternalId),
        qty: item.quantity,
        revenue,
        createdAt: new Date(order.created_at),
        raw: item as unknown as Record<string, unknown>,
      });
    }
  }

  return normalized;
}
