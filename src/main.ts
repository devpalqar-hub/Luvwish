import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('v1');

  // Stripe webhook needs raw body
  app.use(
    '/api/webhooks/stripe',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf; // 👈 Capture raw body here
      },
    }),
  );

  // For all other routes
  app.use(json());
  app.use(urlencoded({ extended: true }));


  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length'],
    credentials: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,

  }));
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Luvwish E-Commerce API')
    .setDescription(
      `
      # Luvwish E-Commerce API Documentation
      
      Complete REST API for the Luvwish e-commerce platform with comprehensive features including:
      - User authentication and authorization with role-based access control
      - Product catalog with categories, subcategories, and variations
      - Shopping cart and wishlist management
      - Order management with return and refund processing
      - Payment integration with Razorpay and Cash on Delivery
      - Delivery tracking and partner management
      - Review and rating system
      - Analytics and dashboard metrics
      - WhatsApp integration for notifications
      - Firebase integration for real-time messaging
      - AWS S3 for product image storage
      
      ## Authentication
      All protected endpoints require JWT Bearer token in Authorization header:
      \`Authorization: Bearer <token>\`
      
      ## Base URL
      - Development: \`http://localhost:3000/v1\`
      - Production: Check environment variables
      
      ## Rate Limiting
      API endpoints are rate-limited to prevent abuse. Check response headers for rate limit information.
      
      ## Error Response Format
      All errors follow a consistent format with status codes and error messages.
      `,
    )
    .setVersion('2.0')
    .setContact(
      'Luvwish Support',
      'https://luvwish.com/support',
      'support@luvwish.com',
    )
    .setLicense(
      'UNLICENSED',
      '',
    )
    .addServer(
      process.env.API_URL || 'http://localhost:3000',
      'Development Server',
    )
    .addServer(
      'https://api.luvwish.com',
      'Production Server',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      'api-key',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      showRequestHeaders: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
    },
    customSiteTitle: 'Luvwish API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();
  console.log(`\n✅ Application is running on: ${appUrl}`);
  console.log(`📚 Swagger Documentation available at: ${appUrl}/docs`);
  console.log(`\nAPI Version: 2.0`);
  console.log(`Global Prefix: /v1\n`);
}
bootstrap();
