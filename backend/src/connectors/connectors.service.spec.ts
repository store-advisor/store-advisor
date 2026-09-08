import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  STORE_CONNECTORS,
  StoreConnector,
  NormalizedProduct,
  NormalizedOrder,
} from './store-connector.interface';

describe('ConnectorsService', () => {
  let service: ConnectorsService;
  let mockPrisma: {
    merchant: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock; upsert: jest.Mock };
    order: { upsert: jest.Mock };
    event: { create: jest.Mock };
  };

  const mockProduct: NormalizedProduct = {
    externalId: 'ext-p1',
    sku: 'SKU-001',
    title: 'Blue Hoodie',
    price: 59.0,
    inventoryQty: 0,
    status: 'active',
    updatedAt: new Date('2026-03-04T09:12:00.000Z'),
  };

  const mockOrder: NormalizedOrder = {
    externalId: 'ext-o1',
    productExternalId: 'ext-p1',
    qty: 2,
    revenue: 118.0,
    createdAt: new Date('2026-03-04T08:00:00.000Z'),
  };

  const mockConnector: StoreConnector = {
    source: 'mock_store',
    fetchProducts: jest.fn().mockResolvedValue([mockProduct]),
    fetchOrders: jest.fn().mockResolvedValue([mockOrder]),
  };

  beforeEach(async () => {
    mockPrisma = {
      merchant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'm-1', name: 'Test Merchant' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'internal-p1',
          inventoryQty: 5, // previously had stock!
        }),
        upsert: jest.fn().mockResolvedValue({
          id: 'internal-p1',
          title: 'Blue Hoodie',
          inventoryQty: 0,
        }),
      },
      order: {
        upsert: jest.fn().mockResolvedValue({
          id: 'internal-o1',
        }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectorsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: STORE_CONNECTORS,
          useValue: [mockConnector],
        },
      ],
    }).compile();

    service = module.get<ConnectorsService>(ConnectorsService);
  });

  it('throws NotFoundException when syncing an unknown source', async () => {
    await expect(service.sync('m-1', 'unknown_source')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when merchant does not exist', async () => {
    mockPrisma.merchant.findUnique.mockResolvedValueOnce(null);

    await expect(service.sync('m-nonexistent', 'mock_store')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('syncs products, orders, and detects stock_out events', async () => {
    const summary = await service.sync('m-1', 'mock_store');

    expect(summary).toEqual({
      source: 'mock_store',
      merchantId: 'm-1',
      productsSynced: 1,
      stockOutEventsEmitted: 1,
      ordersSynced: 1,
    });

    // Verify product upsert
    expect(mockPrisma.product.upsert).toHaveBeenCalledTimes(1);
    const productCalls = mockPrisma.product.upsert.mock
      .calls as unknown as Array<
      [{ where: { merchantId_source_externalId: Record<string, string> } }]
    >;
    expect(productCalls[0][0].where.merchantId_source_externalId).toEqual({
      merchantId: 'm-1',
      source: 'mock_store',
      externalId: 'ext-p1',
    });

    // Verify stock_out event creation with internal product ID
    expect(mockPrisma.event.create).toHaveBeenCalledTimes(1);
    const eventCalls = mockPrisma.event.create.mock.calls as unknown as Array<
      [
        {
          data: {
            merchantId: string;
            source: string;
            entityType: string;
            entityId: string;
            eventType: string;
            payload: Record<string, unknown>;
          };
        },
      ]
    >;
    expect(eventCalls[0][0].data.merchantId).toBe('m-1');
    expect(eventCalls[0][0].data.source).toBe('mock_store');
    expect(eventCalls[0][0].data.entityType).toBe('product');
    expect(eventCalls[0][0].data.entityId).toBe('internal-p1');
    expect(eventCalls[0][0].data.eventType).toBe('stock_out');
    expect(eventCalls[0][0].data.payload).toEqual({
      previousQty: 5,
      newQty: 0,
      externalId: 'ext-p1',
      title: 'Blue Hoodie',
    });

    // Verify order upsert
    expect(mockPrisma.order.upsert).toHaveBeenCalledTimes(1);
    const orderCalls = mockPrisma.order.upsert.mock.calls as unknown as Array<
      [
        {
          where: { merchantId_source_externalId: Record<string, string> };
          create: { productId: string; qty: number };
        },
      ]
    >;
    expect(orderCalls[0][0].where.merchantId_source_externalId).toEqual({
      merchantId: 'm-1',
      source: 'mock_store',
      externalId: 'ext-o1',
    });
    expect(orderCalls[0][0].create.productId).toBe('internal-p1');
    expect(orderCalls[0][0].create.qty).toBe(2);
  });

  it('does not emit stock_out event when product remains in stock', async () => {
    const inStockProduct: NormalizedProduct = {
      ...mockProduct,
      inventoryQty: 10,
    };
    (mockConnector.fetchProducts as jest.Mock).mockResolvedValueOnce([
      inStockProduct,
    ]);

    const summary = await service.sync('m-1', 'mock_store');

    expect(summary.stockOutEventsEmitted).toBe(0);
    expect(mockPrisma.event.create).not.toHaveBeenCalled();
  });

  it('syncAll executes sync for every registered connector', async () => {
    const summaries = await service.syncAll('m-1');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].source).toBe('mock_store');
  });
});
