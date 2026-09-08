import { ShopifyConnector } from './shopify.connector';
import { ShopifyClient } from './shopify.client';
import { SHOPIFY_MOCK_PRODUCTS, SHOPIFY_MOCK_ORDERS } from './shopify.fixture';

describe('ShopifyConnector', () => {
  let connector: ShopifyConnector;
  let mockClient: {
    fetchProducts: jest.Mock;
    fetchOrders: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      fetchProducts: jest.fn().mockResolvedValue(SHOPIFY_MOCK_PRODUCTS),
      fetchOrders: jest.fn().mockResolvedValue(SHOPIFY_MOCK_ORDERS),
    };

    connector = new ShopifyConnector(mockClient as unknown as ShopifyClient);
  });

  it('declares source as "shopify"', () => {
    expect(connector.source).toBe('shopify');
  });

  it('fetches and normalizes products for a merchant', async () => {
    const products = await connector.fetchProducts('m-123');

    expect(mockClient.fetchProducts).toHaveBeenCalledTimes(1);
    expect(products).toHaveLength(2);

    // Blue Hoodie: OOS item
    expect(products[0]).toEqual(
      expect.objectContaining({
        externalId: '45012345678901',
        title: 'Blue Hoodie - Medium',
        sku: 'HOODIE-BLUE-M',
        price: 59.0,
        inventoryQty: 0,
        status: 'active',
      }),
    );

    // White Tee: in-stock item
    expect(products[1]).toEqual(
      expect.objectContaining({
        externalId: '45012345678902',
        title: 'White Tee - Large',
        sku: 'TEE-WHITE-L',
        price: 25.0,
        inventoryQty: 42,
        status: 'active',
      }),
    );
  });

  it('fetches and normalizes orders for a merchant with date filter', async () => {
    const since = new Date('2026-03-01T00:00:00Z');
    const orders = await connector.fetchOrders('m-123', { since });

    expect(mockClient.fetchOrders).toHaveBeenCalledWith(since);
    expect(orders).toHaveLength(1);

    expect(orders[0]).toEqual(
      expect.objectContaining({
        externalId: '5601234567890_9801234567890',
        productExternalId: '45012345678901',
        qty: 1,
        revenue: 59.0,
      }),
    );
  });
});
