/// <reference types="jest" />
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppModule } from '../app.module';
import { FindingResponseDto } from './dto/finding-response.dto';

describe('Findings Integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let merchantId: string;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });

    const merchant = await prisma.merchant.create({
      data: { name: 'Findings Integration Test Merchant' },
    });
    merchantId = merchant.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (merchantId) {
      await prisma.finding.deleteMany({ where: { merchantId } });
      await prisma.merchant.deleteMany({ where: { id: merchantId } });
    }
    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('returns 200 with status ok and does not require auth', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /findings', () => {
    it('returns 401 when Authorization header is missing', async () => {
      await request(app.getHttpServer())
        .get(`/findings?merchant_id=${merchantId}`)
        .expect(401);
    });

    it('returns 401 when Authorization header format is invalid', async () => {
      await request(app.getHttpServer())
        .get(`/findings?merchant_id=${merchantId}`)
        .set('Authorization', 'InvalidTokenFormat')
        .expect(401);
    });

    it('returns 400 when merchant_id is missing', async () => {
      await request(app.getHttpServer())
        .get('/findings')
        .set('Authorization', 'Bearer dummy-token')
        .expect(400);
    });

    it('returns 400 when merchant_id is empty', async () => {
      await request(app.getHttpServer())
        .get('/findings?merchant_id=')
        .set('Authorization', 'Bearer dummy-token')
        .expect(400);
    });

    it('returns 200 and [] for seeded merchant with no findings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/findings?merchant_id=${merchantId}`)
        .set('Authorization', 'Bearer dummy-token')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns findings ordered by createdAt desc when findings exist', async () => {
      const olderFinding = await prisma.finding.create({
        data: {
          merchantId,
          checkId: 'ad_spend_on_oos',
          status: 'OPEN',
          evidence: { daily_spend: 40.5, product_id: 'prod_1' },
          estimatedCost: 284.0,
          llmExplanation: 'Spend on out of stock product',
          llmConfidence: 0.95,
          createdAt: new Date('2026-08-01T10:00:00.000Z'),
        },
      });

      const newerFinding = await prisma.finding.create({
        data: {
          merchantId,
          checkId: 'ad_spend_on_oos',
          status: 'OPEN',
          evidence: { daily_spend: 50.0, product_id: 'prod_2' },
          estimatedCost: 350.0,
          llmExplanation: 'Second finding explanation',
          llmConfidence: 0.99,
          createdAt: new Date('2026-08-02T10:00:00.000Z'),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/findings?merchant_id=${merchantId}`)
        .set('Authorization', 'Bearer dummy-token')
        .expect(200);

      const findings = response.body as FindingResponseDto[];
      expect(Array.isArray(findings)).toBe(true);
      expect(findings).toHaveLength(2);
      expect(findings[0].id).toBe(newerFinding.id);
      expect(findings[1].id).toBe(olderFinding.id);
      expect(findings[0].merchantId).toBe(merchantId);
      expect(findings[0].checkId).toBe('ad_spend_on_oos');
      expect(findings[0].status).toBe('OPEN');
      expect(findings[0].estimatedCost).toBe(350);
      expect(findings[0].evidence).toEqual({
        daily_spend: 50.0,
        product_id: 'prod_2',
      });
      expect(findings[0].llmExplanation).toBe('Second finding explanation');
      expect(findings[0].llmConfidence).toBe(0.99);
    });
  });
});
