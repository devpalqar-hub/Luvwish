# Luvwish E-Commerce API Documentation Guide

## Overview

The Luvwish E-Commerce API is a comprehensive REST API built with NestJS that powers the complete e-commerce platform. This guide explains how to use the API documentation, authentication, and common patterns.

## Accessing the API Documentation

### Interactive Swagger UI
- **URL**: `http://localhost:3000/docs`
- **Features**:
  - Try endpoints directly in the browser
  - View request/response schemas
  - Copy curl commands
  - Enable/disable bearer token authentication

### Getting Started
1. Open [http://localhost:3000/docs](http://localhost:3000/docs) in your browser
2. Authorize by clicking the "Authorize" button (top-right)
3. Enter your JWT token in the format: `Bearer <token>`
4. Start making API calls directly from the UI

## Authentication

### Authentication Methods

#### 1. **JWT Bearer Token (Recommended)**
All protected endpoints require a JWT bearer token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2. **How to Obtain a Token**

**Standard Login (Email/Password)**
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

**OTP-Based Login**
- Step 1: Send OTP - `POST /auth/otp/send`
- Step 2: Verify OTP - `POST /auth/otp/verify`

### User Roles & Permissions

| Role | Access Level | Can Access |
|------|--------------|-----------|
| `CUSTOMER` | User | Own profile, orders, cart, wishlist, returns |
| `ADMIN` | Administrator | All endpoints except delivery partner |
| `SUPER_ADMIN` | Full System | All endpoints including system settings |
| `ORDER_MANAGER` | Orders | Manage orders and returns |
| `DELIVERY` | Logistics | Assigned returns and delivery tracking |

## API Endpoints Overview

### Core Resource Groups

#### 1. **Authentication** (`/auth`)
- User registration and login
- Password management
- Profile management (customer & admin)
- OTP-based flows

#### 2. **Products** (`/products`)
- Browse product catalog
- Search and filter products
- View product variations and details
- Upload product images (Admin)

#### 3. **Categories** (`/categories`)
- View all categories
- Subcategories and variations
- Featured categories

#### 4. **Orders** (`/orders`)
- Create and manage orders
- Track order status
- Cancel orders
- Export order data
- View order analytics (Admin)

#### 5. **Returns & Refunds** (`/returns`)
- Create return requests
- Track return status
- View refund information
- Manage returns (Admin)
- Delivery partner workflows

#### 6. **Cart** (`/cart`)
- Add/remove items
- Update quantities
- View cart

#### 7. **Wishlist** (`/wishlist`)
- Add/remove items
- View wishlist

#### 8. **Payments** (`/razorpay`, `/payments`)
- Razorpay payment integration
- Payment status tracking
- Refund processing

#### 9. **Users** (`/users`)
- Customer management
- Admin profile management
- User statistics

#### 10. **Delivery** (`/delivery-partners`, `/tracking`)
- Delivery partner assignments
- Order tracking
- Delivery status updates

#### 11. **Reviews** (`/reviews`)
- Product reviews and ratings
- Review moderation (Admin)

#### 12. **Analytics** (`/analytics`, `/dashboard`)
- Sales statistics
- Revenue metrics
- Customer analytics
- Product performance

#### 13. **WhatsApp Integration** (`/whatsapp`)
- Send notifications
- Message templates
- Conversation history

## Common API Patterns

### Pagination
Most list endpoints support pagination:
```
GET /api/orders?page=1&limit=10
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Filtering
Endpoints support filtering with query parameters:
```
GET /api/orders?status=pending&startDate=2026-01-01&endDate=2026-02-16
```

### Sorting
Use `sortBy` and `sortOrder` parameters:
```
GET /api/products?sortBy=createdAt&sortOrder=desc
```

### Search
Free-text search on applicable endpoints:
```
GET /api/products?search=laptop
GET /api/orders?search=ORD-2026-001
```

## Error Handling

### Standard Error Response Format
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Invalid product ID"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET, PATCH successful |
| 201 | Created | POST successful |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email already registered |
| 500 | Server Error | Unexpected server error |

### Common Error Messages

- **"Invalid email or password"** - Login failed due to wrong credentials
- **"Email already registered"** - Registration failed, email exists
- **"Unauthorized"** - Missing or invalid JWT token
- **"Insufficient permissions"** - User role cannot access this resource
- **"Product out of stock"** - Item ordered is not available
- **"Order not found"** - Specified order ID doesn't exist

## Request/Response Examples

### Example 1: Create an Order

**Request:**
```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "uuid",
        "quantity": 2,
        "price": 4999.99
      }
    ],
    "deliveryAddressId": "uuid",
    "paymentMethod": "razorpay"
  }'
```

**Response (201):**
```json
{
  "id": "order-uuid",
  "orderNumber": "ORD-2026-001",
  "status": "pending",
  "items": [...],
  "totalAmount": 9999.98,
  "createdAt": "2026-02-16T10:30:00Z"
}
```

### Example 2: Get My Orders

**Request:**
```bash
curl http://localhost:3000/v1/orders \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-2026-001",
      "status": "delivered",
      "totalAmount": 9999.98,
      "createdAt": "2026-02-16T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

### Example 3: Create a Return

**Request:**
```bash
curl -X POST http://localhost:3000/v1/returns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "uuid",
    "returnType": "full",
    "reason": "Product not as described",
    "items": []
  }'
```

**Response (201):**
```json
{
  "id": "return-uuid",
  "orderId": "order-uuid",
  "status": "pending",
  "reason": "Product not as described",
  "createdAt": "2026-02-16T10:35:00Z"
}
```

## Advanced Features

### File Upload
Products endpoint supports image uploads:
```bash
curl -X POST http://localhost:3000/v1/products \
  -H "Authorization: Bearer <token>" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "name=Product Name"
```

### Real-Time Updates
WhatsApp integration provides:
- Order status notifications
- Return/refund updates
- Delivery tracking
- Promotional messages

### Analytics & Reporting
Admin endpoints provide:
- Sales dashboards
- Revenue analytics
- Customer statistics
- Product performance metrics
- Export functionality

### Webhooks (Razorpay)
Payment status updates are received via webhooks:
- Payment successful
- Payment failed
- Refund processed

## Rate Limiting

Current rate limits:
- **Default**: 100 requests per minute per IP
- **Auth endpoints**: 5 attempts per minute
- Check response headers for remaining quota:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Best Practices

1. **Always include authorization headers** for protected endpoints
2. **Use pagination** for large datasets (default limit: 10 items)
3. **Handle errors gracefully** and provide user-friendly messages
4. **Cache responses** where appropriate to reduce API calls
5. **Use filters and search** instead of fetching all data
6. **Implement exponential backoff** for retries on server errors
7. **Validate input data** before sending requests
8. **Monitor rate limits** and implement throttling on client-side
9. **Use HTTPS** in production environments
10. **Rotate tokens** periodically for security

## Environment Configuration

### Development
```
API_URL=http://localhost:3000
NODE_ENV=development
```

### Production
```
API_URL=https://api.luvwish.com
NODE_ENV=production
JWT_SECRET=<secure-secret>
```

## Support & Documentation

- **Swagger UI**: http://localhost:3000/docs
- **API Changelog**: See `API_CHANGELOG_V2.3.0.md`
- **Setup Guide**: See `QUICK_START_GUIDE.md`
- **Support Email**: support@luvwish.com

## API Versioning

Current API Version: **2.0**

The API uses URL-based versioning:
- All endpoints are prefixed with `/v1`
- Future versions will use `/v2`, `/v3`, etc.
- Backward compatibility is maintained for at least one version

## Server Endpoints

- **Development**: http://localhost:3000
- **Production**: https://api.luvwish.com

All requests should use the `/v1` prefix:
- Development: `http://localhost:3000/v1/...`
- Production: `https://api.luvwish.com/v1/...`

---

Last Updated: February 2026
API Version: 2.0
