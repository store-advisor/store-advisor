import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CHECKS } from './check.interface';
import { AdSpendOnOosCheck } from './ad-spend-on-oos.check';
import { ChecksService } from './checks.service';

/**
 * Registers the checks the engine runs.
 *
 * Adding a check: write the class, add it to REGISTERED_CHECKS. Nothing else
 * in the engine changes. That is the whole point of rule 2 in ROLES.md.
 */
const REGISTERED_CHECKS = [AdSpendOnOosCheck];

@Module({
  imports: [PrismaModule],
  providers: [
    ...REGISTERED_CHECKS,
    ChecksService,
    {
      provide: CHECKS,
      inject: REGISTERED_CHECKS,
      useFactory: (...checks: InstanceType<(typeof REGISTERED_CHECKS)[number]>[]) => checks,
    },
  ],
  exports: [ChecksService],
})
export class ChecksModule {}
