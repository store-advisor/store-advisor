import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Store Advisor API')
    .setDescription(
      'Store Advisor API — finds money a merchant store is leaking and stops it',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter Bearer token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Twelve-Factor IX, disposability: shut down gracefully on SIGTERM. Both
  // Docker and Cloud Run signal rather than kill, then wait a grace period
  // before killing. Without this the process ignores the signal, in-flight
  // requests are dropped at the end of that window, and Prisma's pool never
  // closes. worker.main.ts has had this since it was written; the API not
  // having it was an oversight rather than a decision.
  app.enableShutdownHooks();

  // 0.0.0.0, not the default localhost: a container that binds the loopback
  // interface is unreachable from outside itself, which on Cloud Run presents
  // as a container that starts and then fails its health check.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
