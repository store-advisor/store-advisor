import { ShopifyProduct, ShopifyOrder } from './shopify.types';

/**
 * Realistic Shopify Admin API mock fixtures for development, testing,
 * and offline demonstration without live Shopify credentials.
 */
export const SHOPIFY_MOCK_PRODUCTS: ShopifyProduct[] = [
  {
    id: 8201234567890,
    title: 'Blue Hoodie',
    body_html: '<p>Cozy organic cotton blue hoodie.</p>',
    vendor: 'Demo Apparel',
    product_type: 'Apparel',
    status: 'active',
    updated_at: '2026-03-04T09:12:00.000Z',
    variants: [
      {
        id: 45012345678901,
        product_id: 8201234567890,
        title: 'Medium',
        sku: 'HOODIE-BLUE-M',
        price: '59.00',
        inventory_quantity: 0,
        position: 1,
        updated_at: '2026-03-04T09:12:00.000Z',
      },
    ],
  },
  {
    id: 8201234567891,
    title: 'White Tee',
    body_html: '<p>Classic crewneck white tee.</p>',
    vendor: 'Demo Apparel',
    product_type: 'Apparel',
    status: 'active',
    updated_at: '2026-03-01T00:00:00.000Z',
    variants: [
      {
        id: 45012345678902,
        product_id: 8201234567891,
        title: 'Large',
        sku: 'TEE-WHITE-L',
        price: '25.00',
        inventory_quantity: 42,
        position: 1,
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
  },
];

export const SHOPIFY_MOCK_ORDERS: ShopifyOrder[] = [
  {
    id: 5601234567890,
    created_at: '2026-03-04T08:00:00.000Z',
    financial_status: 'paid',
    total_price: '59.00',
    line_items: [
      {
        id: 9801234567890,
        product_id: 8201234567890,
        variant_id: 45012345678901,
        title: 'Blue Hoodie',
        quantity: 1,
        price: '59.00',
        sku: 'HOODIE-BLUE-M',
      },
    ],
  },
];
