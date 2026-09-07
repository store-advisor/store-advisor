import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FindingsModule } from './findings/findings.module';

import { UploadsModule } from './uploads/uploads.module';
import { SelectionsModule } from './selections/selections.module';

@Module({
  imports: [PrismaModule, HealthModule, FindingsModule, UploadsModule, SelectionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
