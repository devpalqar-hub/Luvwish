# Quick Access to Swagger Documentation

## 🚀 Access API Documentation

The Luvwish API includes comprehensive Swagger/OpenAPI documentation:

### Interactive Swagger UI
- **URL**: `http://localhost:3000/docs`
- **Features**: Test endpoints directly, view schemas, copy curl commands

### Documentation Guides
1. **[SWAGGER_API_GUIDE.md](./SWAGGER_API_GUIDE.md)** - Complete API usage guide
   - Authentication methods
   - Endpoint overview
   - Request/response examples
   - Error handling
   - Best practices

2. **[SWAGGER_DEVELOPER_GUIDE.md](./SWAGGER_DEVELOPER_GUIDE.md)** - Maintenance guide for developers
   - How to add Swagger decorators
   - Decorator reference
   - Response documentation patterns
   - Common mistakes and fixes
   - Client generation

3. **[SWAGGER_IMPLEMENTATION_SUMMARY.md](./SWAGGER_IMPLEMENTATION_SUMMARY.md)** - Implementation details
   - What was documented
   - File changes summary
   - Maintenance guidelines
   - Roadmap

## Getting Started with Swagger

### 1. Start the Application
```bash
npm run start:dev
```

### 2. Open Swagger UI
Visit: **http://localhost:3000/docs**

### 3. Authenticate
- Click "Authorize" button
- Login to get JWT token
- Use format: `Bearer <token>`

### 4. Test Endpoints
Click "Try it out" on any endpoint to test request/response

## API Endpoints Overview

- **Authentication**: `/auth` - Login, registration, profiles
- **Products**: `/products` - Browse products, manage inventory
- **Orders**: `/orders` - Create, manage, track orders
- **Returns**: `/returns` - Return/refund processing
- **Cart**: `/cart` - Shopping cart management
- **Wishlist**: `/wishlist` - Save favorite products
- **Reviews**: `/reviews` - Product reviews and ratings
- **Payments**: `/razorpay` - Payment processing
- **Users**: `/users` - User management
- **Analytics**: `/analytics` - Sales and customer analytics
- And more...

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

Obtain token via:
1. Email/Password login: `POST /auth/login`
2. OTP-based: `POST /auth/otp/send` → `POST /auth/otp/verify`

## Key Features Documented

✅ 50+ API endpoints with detailed descriptions
✅ Request/response schemas with examples
✅ Error response documentation
✅ Query parameter documentation
✅ URL parameter documentation
✅ Role-based access control documentation
✅ Pagination and filtering patterns
✅ Authentication flows
✅ OpenAPI/Swagger schema export
✅ Multi-language client generation support

## Common Operations

### Create Order
```bash
POST /orders
Body: { items: [], deliveryAddressId: '', paymentMethod: '' }
```

### Create Return
```bash
POST /returns
Body: { orderId: '', returnType: 'full', reason: '' }
```

### Add to Cart
```bash
POST /cart/add
Body: { productId: '', quantity: 2, variationId?: '' }
```

### Login
```bash
POST /auth/login
Body: { email: '', password: '' }
```

## Useful Links

- 📚 [API Guide](./SWAGGER_API_GUIDE.md) - Usage and examples
- 👨‍💻 [Developer Guide](./SWAGGER_DEVELOPER_GUIDE.md) - Maintenance
- 📋 [API Changelog](./API_CHANGELOG_V2.3.0.md) - Recent changes
- 🚀 [Quick Start](./QUICK_START_GUIDE.md) - Project setup

## All Controls

| Control | Purpose |
|---------|---------|
| Swagger UI | Interactive API testing |
| OpenAPI JSON | Machine-readable schema |
| Documentation Guides | Human-readable guides |
| Example Requests | Copy & paste ready |
| Schema Export | Client code generation |

## Support

For issues or questions:
- Check `SWAGGER_API_GUIDE.md` for API usage
- Check `SWAGGER_DEVELOPER_GUIDE.md` for documentation maintenance
- Open Swagger UI and expand the endpoint for full details
- Check DTOs in `src/*/dto/` for request/response schemas

---

**Version**: 2.0 (Feb 2026)
