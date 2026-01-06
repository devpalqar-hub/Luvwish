# Cash on Delivery (COD) Payment Implementation

## Overview
The payment system now supports **Cash on Delivery (COD)** as an alternative to online payment through Razorpay. Customers can choose their preferred payment method when creating an order.

---

## Database Changes

### Schema Update
Added `paymentMethod` field to the `Order` model:

```prisma
model Order {
  // ... other fields
  paymentMethod     PaymentMethod   @default(cash_on_delivery)
  // ... other fields
}
```

### Payment Methods Available
The `PaymentMethod` enum includes:
- `credit_card`
- `debit_card`
- `paypal`
- `stripe`
- `bank_transfer`
- **`cash_on_delivery`** ← New default

### Migration
Run the migration to add the field:
```bash
npx prisma migrate dev
# or
npx prisma migrate deploy
```

Migration file: `prisma/migrations/20260106150624_add_payment_method_to_orders/migration.sql`

---

## API Changes

### Create Order Endpoint

**Endpoint:** `POST /payments/create-order`

**Request Body:**
```json
{
  "productId": "optional-product-uuid",
  "cartId": "optional-cart-uuid",
  "quantity": 2,
  "ShippingAddressId": "address-uuid",
  "currency": "inr",
  "paymentMethod": "cash_on_delivery"
}
```

**Payment Methods:**
- **For COD:** Set `"paymentMethod": "cash_on_delivery"`
- **For Online Payment:** Omit `paymentMethod` or set to `"stripe"`, `"credit_card"`, etc.

---

## Response Examples

### COD Order Response
```json
{
  "message": "Order created successfully with Cash on Delivery",
  "order": {
    "id": "order-uuid",
    "orderNumber": "ORD-1704556800000",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "cash_on_delivery",
    "totalAmount": 599.99,
    "customerProfileId": "profile-uuid",
    "shippingAddressId": "address-uuid",
    "items": [...]
  },
  "paymentMethod": "cash_on_delivery"
}
```

### Online Payment Response
```json
{
  "message": "Order created successfully",
  "updatedOrder": {
    "id": "order-uuid",
    "orderNumber": "ORD-1704556800000",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "credit_card",
    "totalAmount": 599.99,
    "razorpay_id": "order_MfR2xXYzX9ABCD"
  },
  "razorpayOrder": {
    "id": "order_MfR2xXYzX9ABCD",
    "amount": 59999,
    "currency": "INR",
    "receipt": "ORD-1704556800000"
  }
}
```

---

## Order Flow

### Cash on Delivery Flow

1. **Customer selects COD** at checkout
2. **Order is created** with:
   - `paymentMethod: "cash_on_delivery"`
   - `paymentStatus: "pending"`
   - `status: "pending"`
3. **No Razorpay order** is created (razorpay_id remains null)
4. **Cart is cleared** if ordering from cart
5. **Order confirmation** sent to customer

#### Admin/Delivery Actions:
- Order is processed normally
- Payment collected upon delivery
- Admin updates `paymentStatus` to `"completed"` after delivery

### Online Payment Flow

1. **Customer selects online payment**
2. **Order is created** with selected payment method
3. **Razorpay order is created** and returned to frontend
4. **Frontend completes payment** with Razorpay
5. **Payment verification** endpoint is called
6. **Order status updated** to `confirmed` and `paymentStatus` to `completed`

---

## Frontend Integration

### Example: Create COD Order

```javascript
const createCODOrder = async () => {
  const response = await fetch('/payments/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cartId: cartId,  // Or productId for single product
      ShippingAddressId: selectedAddressId,
      currency: 'inr',
      paymentMethod: 'cash_on_delivery'  // COD selection
    })
  });

  const data = await response.json();
  
  if (data.paymentMethod === 'cash_on_delivery') {
    // Show order confirmation
    // No need to handle Razorpay payment
    showOrderConfirmation(data.order);
  }
};
```

### Example: Create Online Payment Order

```javascript
const createOnlineOrder = async () => {
  const response = await fetch('/payments/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cartId: cartId,
      ShippingAddressId: selectedAddressId,
      currency: 'inr',
      // Omit paymentMethod or set to online method
    })
  });

  const data = await response.json();
  
  if (data.razorpayOrder) {
    // Initialize Razorpay payment
    initiateRazorpayPayment(data.razorpayOrder);
  }
};
```

---

## Order Status Management

### COD Orders
```javascript
// Admin can update payment status when payment is received
PATCH /orders/:orderId/status
{
  "paymentStatus": "completed",
  "status": "delivered"
}
```

### Order Response Includes Payment Method
All order fetch endpoints now return `paymentMethod`:

```javascript
GET /orders
GET /orders/:id
GET /orders/admin/get-all
```

Response:
```json
{
  "id": "order-uuid",
  "orderNumber": "ORD-123",
  "paymentMethod": "cash_on_delivery",  // ← NEW FIELD
  "paymentStatus": "pending",
  "status": "processing",
  // ... other fields
}
```

---

## Testing

### Test COD Order Creation

```bash
curl -X POST http://localhost:3000/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "product-uuid",
    "quantity": 1,
    "ShippingAddressId": "address-uuid",
    "currency": "inr",
    "paymentMethod": "cash_on_delivery"
  }'
```

### Expected Response
- Order created successfully
- No `razorpay_id` field
- `paymentMethod: "cash_on_delivery"`
- Cart cleared if applicable

### Test Online Payment Order

```bash
curl -X POST http://localhost:3000/payments/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "product-uuid",
    "quantity": 1,
    "ShippingAddressId": "address-uuid",
    "currency": "inr"
  }'
```

### Expected Response
- Order created
- `razorpayOrder` object present
- `razorpay_id` field populated

---

## Admin Dashboard Considerations

### Display Payment Method
Show payment method in order listings:
```
Order #ORD-123 | $59.99 | COD | Pending
Order #ORD-124 | $89.99 | Online | Completed
```

### Filter by Payment Method
Add filter option:
```
- All Orders
- Cash on Delivery
- Online Payment
```

### COD Payment Collection
- Mark COD orders with special badge
- Update payment status to "completed" after delivery
- Track COD collection metrics

---

## Benefits

✅ **Customer Convenience** - Option to pay on delivery  
✅ **No Payment Gateway Fees** for COD orders  
✅ **Increased Conversions** - Customers who don't trust online payments  
✅ **Flexible Payment Options** - Both online and offline  
✅ **Simple Integration** - Automatic handling based on payment method

---

## Security Considerations

1. **Validate Address** - Ensure shipping address exists before creating COD order
2. **Stock Management** - Deduct stock immediately for both COD and online orders
3. **Order Limits** - Consider setting COD limits per customer to prevent fraud
4. **Delivery Confirmation** - Update payment status only after successful delivery

---

## Migration Checklist

- [x] Update Prisma schema
- [x] Generate Prisma client
- [x] Create migration
- [x] Update DTOs (CreateOrderDto, CreatePaymentIntentDto)
- [x] Update services (RazorpayService, OrdersService)
- [x] Update controllers (if needed)
- [x] Build and test
- [ ] Run migration on database
- [ ] Update frontend to include payment method selection
- [ ] Test COD order creation
- [ ] Test online payment order creation
- [ ] Update admin dashboard

---

## Support

For questions or issues:
- Check `prisma/schema.prisma` for Order model structure
- See `src/razorpay/razorpay.service.ts` for payment logic
- Review `src/orders/dto/create-orders.dto.ts` for request structure
