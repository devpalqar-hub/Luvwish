# Luvwish E-Commerce API - Complete Endpoints Reference

**Version:** 2.2.0  
**Updated:** January 6, 2026

---

## Overview
Complete list of all available API endpoints in the Luvwish E-Commerce platform.

---

## Authentication

### Auth Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new customer | No |
| POST | `/auth/register-admin` | Register admin user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/otp/generate` | Generate OTP | No |
| POST | `/auth/otp/verify` | Verify OTP | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with OTP | No |
| GET | `/auth/profile` | Get admin profile | Yes |
| GET | `/auth/customer/profile` | Get customer profile | Yes |
| POST | `/auth/profile` | Create profile | Yes |
| PATCH | `/auth/profile` | Update profile | Yes |
| PATCH | `/auth/change-password` | Change password | Yes |

---

## Categories & SubCategories

### Categories
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/categories` | Get all categories | No |
| GET | `/categories/:id` | Get category by ID | No |
| POST | `/categories` | Create category | Yes (Admin) |
| PATCH | `/categories/:id` | Update category | Yes (Admin) |
| DELETE | `/categories/:id` | Delete category | Yes (Admin) |

### SubCategories
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/subcategories` | Get all subcategories | No |
| GET | `/subcategories/category/:categoryId` | Get subcategories by category | No |
| GET | `/subcategories/:id` | Get subcategory by ID | No |
| POST | `/subcategories` | Create subcategory | Yes (Admin) |
| PATCH | `/subcategories/:id` | Update subcategory | Yes (Admin) |
| DELETE | `/subcategories/:id` | Delete subcategory | Yes (Admin) |

---

## Products

### Product Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products (with pagination, filters) | No |
| GET | `/products/:id` | Get product by ID | No |
| GET | `/products/:id/related` | Get related products | No |
| POST | `/products` | Create product | Yes (Admin) |
| PATCH | `/products/:id` | Update product | Yes (Admin) |
| PATCH | `/products/update-stock` | Update product stock | Yes (Admin) |
| DELETE | `/products/:id` | Delete product | Yes (Admin) |

### Product Variations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/product-variations/product/:productId` | Get variations by product | No |
| GET | `/product-variations/:id` | Get variation by ID | No |
| POST | `/product-variations` | Create variation | Yes (Admin) |
| PATCH | `/product-variations/:id` | Update variation | Yes (Admin) |
| DELETE | `/product-variations/:id` | Delete variation | Yes (Admin) |

---

## Cart

### Cart Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/cart` | Get user's cart | Yes |
| POST | `/cart/add` | Add item to cart | Yes |
| PATCH | `/cart/update-cart` | Update cart item quantity | Yes |
| PATCH | `/cart/remove-from-cart/:id` | Remove one item from cart | Yes |
| DELETE | `/cart/delete-cart/:id` | Delete cart item | Yes |

---

## Orders

### Order Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/orders` | Get user's orders | Yes (Customer) |
| GET | `/orders/:id` | Get order by ID | Yes |
| GET | `/orders/admin/get-all` | Get all orders (admin) | Yes (Admin) |
| POST | `/orders` | Create order | No |
| PATCH | `/orders/:id` | Update order | Yes (Admin) |
| PATCH | `/orders/:id/status` | Update order status | Yes (Admin) |
| DELETE | `/orders/:id` | Delete order | Yes (Admin) |

---

## Payments (NEW in v2.2.0)

### Payment & Checkout
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/create-order` | Create order (COD or Online) | Yes |
| POST | `/payments/verify-payment` | Verify Razorpay payment | No |

**Payment Methods Supported:**
- `cash_on_delivery` (Default)
- `credit_card`
- `debit_card`
- `stripe`
- `bank_transfer`

---

## Addresses

### Address Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/addresses` | Get all user addresses | Yes |
| GET | `/addresses/:id` | Get address by ID | Yes |
| POST | `/addresses` | Create address | Yes |
| PATCH | `/addresses/:id` | Update address | Yes |
| DELETE | `/addresses/:id` | Delete address | Yes |

---

## Wishlist

### Wishlist Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/wishlist` | Get user's wishlist | Yes |
| POST | `/wishlist` | Add product to wishlist | Yes |
| DELETE | `/wishlist?id=:id` | Remove from wishlist | Yes |

---

## Reviews

### Product Reviews
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reviews/product/:productId` | Get reviews for product | No |
| GET | `/reviews/:id` | Get review by ID | No |
| GET | `/reviews/product/:productId/average` | Get average rating | No |
| POST | `/reviews` | Create review | Yes |
| PATCH | `/reviews/:id` | Update review | Yes |
| DELETE | `/reviews/:id` | Delete review | Yes |

---

## Coupons

### Coupon Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/coupons` | Get all coupons | No |
| GET | `/coupons/valid-coupons` | Get valid coupons | No |
| GET | `/coupons/:id` | Get coupon by ID | No |
| GET | `/coupons/applicable-coupouns` | Get applicable coupons for user | Yes |
| GET | `/coupons/apply-coupoun?coupoun_id=:id` | Apply coupon | Yes |
| POST | `/coupons` | Create coupon | Yes (Admin) |
| PATCH | `/coupons/:id` | Update coupon | Yes (Admin) |
| DELETE | `/coupons/:id` | Delete coupon | No |

---

## Tracking

### Order Tracking
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tracking-details` | Get all tracking details | Yes (Admin) |
| GET | `/tracking-details/:id` | Get tracking by ID | Yes |
| POST | `/tracking-details` | Create tracking detail | Yes (Admin) |
| PATCH | `/tracking-details/:id` | Update tracking detail | Yes (Admin) |
| DELETE | `/tracking-details/:id` | Delete tracking detail | Yes (Admin) |

---

## Notifications (NEW in v2.2.0)

### Push Notifications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications/send` | Send FCM notification | No |

---

## Query Parameters

### Pagination (Common)
```
?page=1&limit=10
```

### Product Filters
```
?search=keyword
&minPrice=10
&maxPrice=100
&categoryId=uuid
&subCategoryId=uuid
```

### Order Filters (Admin)
```
?page=1
&limit=10
&search=ORD-123
&status=pending
&startDate=2024-01-01
&endDate=2024-12-31
```

---

## Response Formats

### Success Response
```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": { /* response data */ }
}
```

### Paginated Response
```json
{
  "data": [ /* items */ ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

---

## Authentication

### Bearer Token
Most endpoints require JWT authentication. Include in headers:
```
Authorization: Bearer <jwt_token>
```

### Role-Based Access
- **SUPER_ADMIN**: Full system control
- **ADMIN**: Manage store operations
- **PRODUCT_MANAGER**: Manage products
- **INVENTORY_MANAGER**: Stock management
- **ORDER_MANAGER**: Handle orders
- **CUSTOMER**: Regular user access

---

## Payment Flow

### Cash on Delivery (COD)
1. Customer selects COD at checkout
2. POST `/payments/create-order` with `"paymentMethod": "cash_on_delivery"`
3. Order created immediately
4. No payment gateway interaction
5. Payment collected on delivery

### Online Payment (Razorpay)
1. Customer selects online payment
2. POST `/payments/create-order` without paymentMethod or with online method
3. Razorpay order created and returned
4. Frontend completes Razorpay payment
5. POST `/payments/verify-payment` with payment details
6. Order confirmed after verification

---

## New Features in v2.2.0

✅ **Cash on Delivery Support**
- Added `paymentMethod` field to orders
- COD orders skip Razorpay integration
- Default payment method is COD

✅ **Payments Section**
- Dedicated payment endpoints
- Support for multiple payment methods
- Payment verification endpoint

✅ **Notifications**
- Firebase Cloud Messaging integration
- Send push notifications to customers

✅ **Simplified Product Variations**
- Single table structure
- `variationName` field
- `isAvailable` instead of `isActive`

---

## Import to Postman/Insomnia

1. Open Postman/Insomnia
2. Import → File
3. Select `api.json`
4. Set `{{base_url}}` variable to your API URL
5. Set `{{jwt_token}}` after login

---

## Environment Variables

```
base_url=http://localhost:3000
jwt_token=<your-jwt-token-after-login>
```

---

## Support & Documentation

- **API Version**: 2.2.0
- **Schema**: `prisma/schema.prisma`
- **Controllers**: `src/*/controllers/*.ts`
- **Full Documentation**: `api.json`
