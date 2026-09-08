import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STORE_CONNECTORS, StoreConnector } from './store-connector.interface';

export interface SyncSummary {
  source: string;
  merchantId: string;
  productsSynced: number;
  stockOutEventsEmitted: number;
  ordersSynced: number;
}

/**
 * Ingestion Service (Stage 1: INGEST).
 *
 * Orchestrates store connectors: pulls normalized product & order data,
 * upserts into canonical tables (`products`, `orders`), and appends
 * state transitions to the `events` table (e.g. `stock_out`).
 */
@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORE_CONNECTORS) private readonly connectors: StoreConnector[],
  ) {}

  /**
   * Find a registered store connector by its source name.
   */
  getConnector(source: string): StoreConnector | undefined {
    return this.connectors.find((c) => c.source === source);
  }

  /**
   * Run sync for a specific merchant and source platform (e.g., 'shopify').
   */
  async sync(merchantId: string, source: string): Promise<SyncSummary> {
    const connector = this.getConnector(source);
    if (!connector) {
      throw new NotFoundException(
        `No store connector registered for source "${source}". Available: ${this.connectors.map((c) => c.source).join(', ') || 'none'}`,
      );
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(`Merchant "${merchantId}" does not exist.`);
    }

    this.logger.log(`Starting sync for merchant ${merchantId} from ${source}`);

    // 1. Fetch normalized products from connector
    const normalizedProducts = await connector.fetchProducts(merchantId);
    let stockOutEventsEmitted = 0;

    // Track internal product IDs by their external ID for order linking
    const externalToInternalProductId = new Map<string, string>();

    for (const p of normalizedProducts) {
      const existing = await this.prisma.product.findUnique({
        where: {
          merchantId_source_externalId: {
            merchantId,
            source,
            externalId: p.externalId,
          },
        },
      });

      const product = await this.prisma.product.upsert({
        where: {
          merchantId_source_externalId: {
            merchantId,
            source,
            externalId: p.externalId,
          },
        },
        update: {
          title: p.title,
          price: new Prisma.Decimal(p.price),
          inventoryQty: p.inventoryQty,
          status: p.status,
          sku: p.sku ?? null,
        },
        create: {
          merchantId,
          source,
          externalId: p.externalId,
          title: p.title,
          price: new Prisma.Decimal(p.price),
          inventoryQty: p.inventoryQty,
          status: p.status,
          sku: p.sku ?? null,
        },
      });

      externalToInternalProductId.set(p.externalId, product.id);

      // Detect stock-out transitions:
      // Case A: Product previously had inventory > 0, now dropped to 0.
      // Case B: Brand new product whose inventory is 0 on first ingest.
      const isStockOut =
        p.inventoryQty === 0 && (!existing || existing.inventoryQty > 0);

      if (isStockOut) {
        await this.prisma.event.create({
          data: {
            merchantId,
            source,
            entityType: 'product',
            entityId: product.id,
            eventType: 'stock_out',
            payload: {
              previousQty: existing ? existing.inventoryQty : null,
              newQty: p.inventoryQty,
              externalId: p.externalId,
              title: p.title,
            },
            occurredAt: p.updatedAt ?? new Date(),
          },
        });
        stockOutEventsEmitted++;
      }
    }

    // 2. Fetch normalized orders from connector
    const normalizedOrders = await connector.fetchOrders(merchantId);
    let ordersSynced = 0;

    for (const order of normalizedOrders) {
      let internalProductId = externalToInternalProductId.get(
        order.productExternalId,
      );

      if (!internalProductId) {
        const found = await this.prisma.product.findUnique({
          where: {
            merchantId_source_externalId: {
              merchantId,
              source,
              externalId: order.productExternalId,
            },
          },
          select: { id: true },
        });
        if (found) {
          internalProductId = found.id;
          externalToInternalProductId.set(order.productExternalId, found.id);
        }
      }

      if (!internalProductId) {
        this.logger.warn(
          `Skipping order ${order.externalId}: product ${order.productExternalId} not found in database.`,
        );
        continue;
      }

      await this.prisma.order.upsert({
        where: {
          merchantId_source_externalId: {
            merchantId,
            source,
            externalId: order.externalId,
          },
        },
        update: {
          productId: internalProductId,
          qty: order.qty,
          revenue: new Prisma.Decimal(order.revenue),
          createdAt: order.createdAt,
        },
        create: {
          merchantId,
          source,
          externalId: order.externalId,
          productId: internalProductId,
          qty: order.qty,
          revenue: new Prisma.Decimal(order.revenue),
          createdAt: order.createdAt,
        },
      });
      ordersSynced++;
    }

    const summary: SyncSummary = {
      source,
      merchantId,
      productsSynced: normalizedProducts.length,
      stockOutEventsEmitted,
      ordersSynced,
    };

    this.logger.log(
      `Sync complete for ${merchantId} (${source}): ${summary.productsSynced} products, ${summary.stockOutEventsEmitted} stock-outs, ${summary.ordersSynced} orders.`,
    );

    return summary;
  }

  /**
   * Sync all registered store connectors for a merchant.
   */
  async syncAll(merchantId: string): Promise<SyncSummary[]> {
    const results: SyncSummary[] = [];
    for (const connector of this.connectors) {
      results.push(await this.sync(merchantId, connector.source));
    }
    return results;
  }
}
