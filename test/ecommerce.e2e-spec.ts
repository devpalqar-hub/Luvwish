import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Ecommerce API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@ecommerce.com',
        password: 'password@123',
      })
      .expect(201);

    authToken = loginResponse.body.data.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Categories', () => {
    it('/v1/categories (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('/v1/categories/tree (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/categories/tree')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Products', () => {
    it('/v1/products (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.data).toBeDefined();
          expect(res.body.data.meta).toBeDefined();
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });

    it('/v1/products?featured=true (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/products?featured=true')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data.data)).toBe(true);
        });
    });
  });

  describe('Cart (requires auth)', () => {
    it('/v1/cart (GET) should require authentication', () => {
      return request(app.getHttpServer()).get('/v1/cart').expect(401);
    });

    it('/v1/cart (GET) with auth should return cart', () => {
      return request(app.getHttpServer())
        .get('/v1/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.items).toBeDefined();
          expect(res.body.data.total).toBeDefined();
          expect(res.body.data.itemCount).toBeDefined();
        });
    });
  });

  describe('Health Check', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1')
        .expect(200)
        .expect('Hello World!');
    });
  });
});
