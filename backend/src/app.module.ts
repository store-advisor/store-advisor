import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { FindingsModule } from './findings/findings.module';
import { ChecksModule } from './checks/checks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    FindingsModule,
    ChecksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
