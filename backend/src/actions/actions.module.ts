import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AD_PLATFORMS } from './ad-platform.interface';
import { DemoAdPlatform } from './demo-ad-platform';
import { ActionsService } from './actions.service';
import { ActionsController } from './actions.controller';

/**
 * Registered ad platforms. A real Meta or Google Ads client is a class added
 * here — the executor picks the platform by the campaign's `source` and needs
 * no knowledge of which one it got.
 */
const REGISTERED_PLATFORMS = [DemoAdPlatform];

@Module({
  imports: [PrismaModule],
  controllers: [ActionsController],
  providers: [
    ...REGISTERED_PLATFORMS,
    ActionsService,
    {
      provide: AD_PLATFORMS,
      inject: REGISTERED_PLATFORMS,
      useFactory: (
        ...platforms: InstanceType<(typeof REGISTERED_PLATFORMS)[number]>[]
      ) => platforms,
    },
  ],
  exports: [ActionsService],
})
export class ActionsModule {}
