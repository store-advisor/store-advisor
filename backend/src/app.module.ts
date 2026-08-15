import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FindingsModule } from './findings/findings.module';

@Module({
  imports: [PrismaModule, HealthModule, FindingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
