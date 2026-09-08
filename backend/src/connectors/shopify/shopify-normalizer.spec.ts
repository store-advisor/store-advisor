import {
  normalizeShopifyProducts,
  normalizeShopifyOrders,
} from './shopify-normalizer';
import { ShopifyProduct, ShopifyOrder } from './shopify.types';

describe('ShopifyNormalizer', () => {
  describe('normalizeShopifyProducts', () => {
    it('normalizes shopify product and variants with accurate titles, prices, and quantities', () => {
      const mockProduct: ShopifyProduct = {
        id: 100,
        title: 'Running Shoes',
        status: 'active',
        updated_at: '2026-03-01T12:00:00Z',
        variants: [
          {
            id: 201,
            product_id: 100,
            title: 'Size 10 / Red',
            sku: 'SHOE-RED-10',
            price: '89.99',
            inventory_quantity: 15,
            position: 1,
            updated_at: '2026-03-01T12:00:00Z',
          },
          {
            id: 202,
            product_id: 100,
            title: 'Size 11 / Blue',
            sku: 'SHOE-BLU-11',
            price: '89.99',
            inventory_quantity: 0,
            position: 2,
            updated_at: '2026-03-01T12:30:00Z',
          },
        ],
      };

      const normalized = normalizeShopifyProducts([mockProduct]);

      expect(normalized).toHaveLength(2);

      expect(normalized[0]).toEqual({
        externalId: '201',
        sku: 'SHOE-RED-10',
        title: 'Running Shoes - Size 10 / Red',
        price: 89.99,
        inventoryQty: 15,
        status: 'active',
        updatedAt: new Date('2026-03-01T12:00:00Z'),
        raw: mockProduct.variants[0],
      });

      expect(normalized[1]).toEqual({
        externalId: '202',
        sku: 'SHOE-BLU-11',
        title: 'Running Shoes - Size 11 / Blue',
        price: 89.99,
        inventoryQty: 0,
        status: 'active',
        updatedAt: new Date('2026-03-01T12:30:00Z'),
        raw: mockProduct.variants[1],
      });
    });

    it('uses base product title when variant has Default Title', () => {
      const singleProduct: ShopifyProduct = {
        id: 101,
        title: 'Standard Mug',
        status: 'active',
        updated_at: '2026-03-01T10:00:00Z',
        variants: [
          {
            id: 301,
            product_id: 101,
            title: 'Default Title',
            sku: 'MUG-STD',
            price: '14.50',
            inventory_quantity: 50,
            position: 1,
          },
        ],
      };

      const normalized = normalizeShopifyProducts([singleProduct]);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].title).toBe('Standard Mug');
      expect(normalized[0].price).toBe(14.5);
    });

    it('handles products with no variants gracefully', () => {
      const emptyVariantsProduct: ShopifyProduct = {
        id: 102,
        title: 'Empty Product',
        status: 'draft',
        updated_at: '2026-03-01T10:00:00Z',
        variants: [],
      };

      const normalized = normalizeShopifyProducts([emptyVariantsProduct]);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].externalId).toBe('102');
      expect(normalized[0].title).toBe('Empty Product');
      expect(normalized[0].status).toBe('draft');
      expect(normalized[0].inventoryQty).toBe(0);
    });
  });

  describe('normalizeShopifyOrders', () => {
    it('normalizes orders and line items calculating revenue and linking variant externalId', () => {
      const mockOrder: ShopifyOrder = {
        id: 5001,
        created_at: '2026-03-04T15:00:00Z',
        line_items: [
          {
            id: 9001,
            product_id: 100,
            variant_id: 201,
            title: 'Running Shoes - Size 10 / Red',
            quantity: 2,
            price: '89.99',
            sku: 'SHOE-RED-10',
          },
          {
            id: 9002,
            product_id: 101,
            variant_id: 301,
            title: 'Standard Mug',
            quantity: 3,
            price: '14.50',
            sku: 'MUG-STD',
          },
        ],
      };

      const normalized = normalizeShopifyOrders([mockOrder]);

      expect(normalized).toHaveLength(2);

      expect(normalized[0]).toEqual({
        externalId: '5001_9001',
        productExternalId: '201',
        qty: 2,
        revenue: 179.98,
        createdAt: new Date('2026-03-04T15:00:00Z'),
        raw: mockOrder.line_items[0],
      });

      expect(normalized[1]).toEqual({
        externalId: '5001_9002',
        productExternalId: '301',
        qty: 3,
        revenue: 43.5,
        createdAt: new Date('2026-03-04T15:00:00Z'),
        raw: mockOrder.line_items[1],
      });
    });

    it('falls back to product_id if variant_id is missing', () => {
      const orderWithoutVariant: ShopifyOrder = {
        id: 5002,
        created_at: '2026-03-04T16:00:00Z',
        line_items: [
          {
            id: 9003,
            product_id: 102,
            variant_id: null,
            title: 'Custom Line Item',
            quantity: 1,
            price: '20.00',
            sku: null,
          },
        ],
      };

      const normalized = normalizeShopifyOrders([orderWithoutVariant]);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].productExternalId).toBe('102');
      expect(normalized[0].revenue).toBe(20.0);
    });
  });
});
