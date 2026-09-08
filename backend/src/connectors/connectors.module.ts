import { Module, Type } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { STORE_CONNECTORS, StoreConnector } from './store-connector.interface';
import { ConnectorsService } from './connectors.service';
import { ConnectorsController } from './connectors.controller';
import { ShopifyClient } from './shopify/shopify.client';
import { ShopifyConnector } from './shopify/shopify.connector';

/**
 * Registered store connectors.
 *
 * Per Rule 1 in ROLES.md / HANDBOOK.md:
 * A new platform (e.g. Shopify, Salla, WooCommerce) is a class added here.
 * The ingestion service picks the connector by source and needs no knowledge
 * of which platform it got.
 */
const REGISTERED_CONNECTORS: Type<StoreConnector>[] = [ShopifyConnector];

@Module({
  imports: [PrismaModule],
  controllers: [ConnectorsController],
  providers: [
    ShopifyClient,
    ...REGISTERED_CONNECTORS,
    ConnectorsService,
    {
      provide: STORE_CONNECTORS,
      inject: REGISTERED_CONNECTORS,
      useFactory: (
        ...connectors: InstanceType<(typeof REGISTERED_CONNECTORS)[number]>[]
      ) => connectors,
    },
  ],
  exports: [ConnectorsService, STORE_CONNECTORS],
})
export class ConnectorsModule {}
