# WhatsApp Shopping Module - Complete Guide

## 📋 Overview

The WhatsApp Shopping Module enables customers to browse products, add items to cart, and place orders (Cash on Delivery only) directly through WhatsApp Business API. This module is fully integrated with your existing e-commerce system.

## 🚀 Features

### Core Functionality
- ✅ **WhatsApp API Key Management** - Store and update WhatsApp Business API credentials via API
- ✅ **Product Browsing** - Browse products by category and subcategory
- ✅ **Product Search** - Search products by name with fuzzy matching
- ✅ **Product Variations** - Select product options/variations
- ✅ **Cart Management** - Add, view, and remove products from cart
- ✅ **Address Collection** - Automatically collect delivery address through conversation
- ✅ **Order Placement** - Create orders with Cash on Delivery payment method
- ✅ **WebSocket Support** - Real-time notifications and updates
- ✅ **Session Management** - Track user conversation state and context
- ✅ **Message Logging** - Log all incoming and outgoing messages

### User Experience
- Interactive buttons for easy navigation
- List menus for browsing categories and products
- Product images sent with details
- Step-by-step address collection
- Order confirmation with complete summary
- Error handling and user-friendly messages

## 📦 Installation Steps

### 1. Install Required Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io axios
npm install --save-dev @types/socket.io
```

### 2. Run Database Migration

```bash
npx prisma migrate dev --name add_whatsapp_module
npx prisma generate
```

This will create the following tables:
- `whatsapp_settings` - Store WhatsApp API credentials
- `whatsapp_sessions` - Track user conversation sessions
- `whatsapp_messages` - Log all messages

### 3. Update Environment Variables

Add the following to your `.env` file (optional, can be set via API):

```env
# WhatsApp Business API Configuration (Optional - can be set via API)
WHATSAPP_API_KEY=your_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ID=your_business_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verification_token
```

## 🔧 Configuration

### Setting Up WhatsApp Business API

1. **Get WhatsApp Business API Credentials**:
   - Sign up for WhatsApp Business API (Meta Business Suite)
   - Get your Phone Number ID, Business ID, and Access Token
   - Create a webhook verification token

2. **Configure API Settings** (via API endpoint):

```bash
POST /whatsapp/settings
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "phoneNumberId": "your_phone_number_id",
  "businessId": "your_business_id",
  "accessToken": "your_access_token",
  "webhookToken": "your_webhook_verification_token",
  "webhookUrl": "https://yourdomain.com/whatsapp/webhook",
  "isActive": true
}
```

3. **Configure Webhook in Meta Business Suite**:
   - Webhook URL: `https://yourdomain.com/whatsapp/webhook`
   - Verification Token: Same as `webhookToken` from settings
   - Subscribe to: `messages` field

## 📡 API Endpoints

### Settings Management

#### Create/Update WhatsApp Settings
```http
POST /whatsapp/settings
{
  "apiKey": "string",
  "phoneNumberId": "string",
  "businessId": "string",
  "accessToken": "string",
  "webhookToken": "string",
  "webhookUrl": "string",
  "isActive": true
}
```

#### Get Active Settings
```http
GET /whatsapp/settings/active
```

#### Get All Settings
```http
GET /whatsapp/settings
```

#### Update Settings
```http
PUT /whatsapp/settings/:id
{
  "accessToken": "new_token",
  "isActive": true
}
```

#### Delete Settings
```http
DELETE /whatsapp/settings/:id
```

### Webhook Endpoints

#### Webhook Verification (GET)
```http
GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

#### Webhook Handler (POST)
```http
POST /whatsapp/webhook
# Automatically handles incoming WhatsApp messages
```

### Testing Endpoints

#### Send Test Text Message
```http
POST /whatsapp/send-test-message
{
  "phoneNumber": "919876543210",
  "message": "Hello from Luvwish!"
}
```

#### Send Test Interactive Buttons
```http
POST /whatsapp/send-test-button
{
  "phoneNumber": "919876543210",
  "message": "Choose an option:",
  "buttons": [
    { "id": "option1", "title": "Option 1" },
    { "id": "option2", "title": "Option 2" }
  ]
}
```

#### Send Test List Message
```http
POST /whatsapp/send-test-list
{
  "phoneNumber": "919876543210",
  "message": "Select a category:",
  "buttonText": "View Categories",
  "sections": [
    {
      "title": "Electronics",
      "rows": [
        { "id": "cat1", "title": "Mobiles", "description": "Smartphones" }
      ]
    }
  ]
}
```

### Session Management

#### Get All Active Sessions
```http
GET /whatsapp/sessions
```

#### Get Session by Phone Number
```http
GET /whatsapp/sessions/:phoneNumber
```

#### Get Session Messages
```http
GET /whatsapp/sessions/:sessionId/messages
```

## 🌐 WebSocket Support

### Connection URL
```
ws://yourdomain.com/whatsapp
```

### Events

#### Client to Server

**Register for session:**
```javascript
socket.emit('register', { phoneNumber: '919876543210' });
```

**Send message:**
```javascript
socket.emit('sendMessage', {
  phoneNumber: '919876543210',
  message: 'Hello!'
});
```

#### Server to Client

**Registration confirmation:**
```javascript
socket.on('registered', (data) => {
  console.log(data); // { success: true, sessionId: '...', phoneNumber: '...' }
});
```

**Incoming message:**
```javascript
socket.on('incomingMessage', (data) => {
  console.log(data); // { phoneNumber, message, timestamp }
});
```

**Session state change:**
```javascript
socket.on('sessionStateChange', (data) => {
  console.log(data); // { phoneNumber, state, contextData, timestamp }
});
```

**Order created:**
```javascript
socket.on('orderCreated', (data) => {
  console.log(data); // { phoneNumber, orderNumber, totalAmount, timestamp }
});
```

## 💬 User Interaction Flow

### 1. Initial Contact
User sends any message (hi, hello, menu, start) → Receives main menu

### 2. Browse Categories
- Select "Browse Categories"
- View list of categories
- Select subcategory
- View products in that category

### 3. Search Products
- Select "Search Products"
- Type product name or keywords
- View matching products with images

### 4. View Product Details
- Product name, description, price
- Product image
- Stock availability
- Variations (if available)

### 5. Select Variation (if applicable)
- View available variations
- Select preferred option
- Add to cart

### 6. Cart Management
- View cart items with prices
- See total amount
- Options: Checkout, Add More, Clear Cart

### 7. Address Collection (First Time)
System collects step-by-step:
1. Full Name
2. Complete Address
3. City
4. State
5. PIN Code
6. Landmark (optional)
7. Contact Phone

### 8. Order Confirmation
- View complete order summary
- Delivery address
- Total amount
- Payment method (COD)
- Confirm or Cancel

### 9. Order Placed
- Receive order confirmation
- Order number
- Estimated delivery info

## 🎯 Command Reference

### Global Commands (Work Anytime)
- `menu` or `start` - Show main menu
- `cart` - View shopping cart
- `categories` - Browse categories
- `hi` or `hello` - Start conversation

## 🔒 Session States

The system tracks user conversation state:

- **IDLE** - Initial state, waiting for user input
- **BROWSING_CATEGORIES** - User browsing categories
- **BROWSING_PRODUCTS** - User viewing/searching products
- **SELECTING_VARIATION** - User selecting product variation
- **VIEWING_CART** - User viewing cart
- **ENTERING_ADDRESS** - System collecting address
- **CONFIRMING_ORDER** - User confirming order

## 🛠️ Database Schema

### WhatsAppSettings
```typescript
{
  id: string
  apiKey: string
  phoneNumberId: string
  businessId: string
  accessToken: string
  webhookToken: string
  webhookUrl: string?
  isActive: boolean
  lastUpdatedAt: DateTime
  createdAt: DateTime
}
```

### WhatsAppSession
```typescript
{
  id: string
  phoneNumber: string (unique)
  customerProfileId: string?
  state: WhatsAppSessionState
  contextData: JSON
  lastMessageAt: DateTime
  createdAt: DateTime
  updatedAt: DateTime
}
```

### WhatsAppMessage
```typescript
{
  id: string
  sessionId: string
  messageId: string (unique)
  direction: INBOUND | OUTBOUND
  content: string
  messageType: string
  metadata: JSON
  createdAt: DateTime
}
```

## 🚨 Error Handling

The module includes comprehensive error handling:
- Invalid product/variation - User-friendly error message
- Out of stock items - Notification with alternatives
- Session timeout - Automatic state reset
- API failures - Retry mechanism with fallback
- Address validation - Step-by-step guidance

## 🔍 Testing

### 1. Test Webhook Verification
```bash
curl "http://localhost:3000/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=TEST123"
```

Expected response: `TEST123`

### 2. Test Message Sending
```bash
curl -X POST http://localhost:3000/whatsapp/send-test-message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919876543210", "message": "Test message"}'
```

### 3. Test Settings API
```bash
# Create settings
curl -X POST http://localhost:3000/whatsapp/settings \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "test_key",
    "phoneNumberId": "123456789",
    "businessId": "987654321",
    "accessToken": "test_token",
    "webhookToken": "test_webhook_token"
  }'
```

## 📊 Monitoring

### View Active Sessions
```bash
curl http://localhost:3000/whatsapp/sessions
```

### View Session Messages
```bash
curl http://localhost:3000/whatsapp/sessions/{sessionId}/messages
```

## 🔐 Security Features

- Webhook verification token validation
- Session-based user tracking
- Secure API key storage
- Message logging for audit trail
- Phone number validation
- COD-only payment to prevent fraud

## 🎨 Customization

### Custom Welcome Message
Edit `whatsapp-message.handler.ts` → `showMainMenu()` method

### Custom Product Display
Edit `whatsapp-message.handler.ts` → `displayProducts()` method

### Custom Address Fields
Edit `whatsapp-message.handler.ts` → `handleAddressInput()` method

## 🐛 Troubleshooting

### Issue: Webhook not receiving messages
- Verify webhook URL in Meta Business Suite
- Check webhook token matches
- Ensure HTTPS is enabled
- Check firewall/security settings

### Issue: Messages not sending
- Verify access token is valid
- Check phone number ID is correct
- Ensure WhatsApp Business API is active
- Check API quota/limits

### Issue: Session state not updating
- Check database connection
- Verify Prisma schema is up to date
- Run migrations if needed

## 📝 Notes

- **Phone Format**: Use international format (e.g., 919876543210)
- **Message Limits**: WhatsApp has rate limits, implement queuing if needed
- **Image URLs**: Must be publicly accessible HTTPS URLs
- **Button Limits**: Maximum 3 buttons per message
- **List Limits**: Maximum 10 sections, 10 rows per section
- **COD Only**: Orders created through WhatsApp are COD only

## 🎯 Best Practices

1. **Keep messages concise** - WhatsApp users prefer brief interactions
2. **Use images** - Product images increase engagement
3. **Clear CTAs** - Use clear button labels
4. **Session timeout** - Implement cleanup for old sessions
5. **Error messages** - Provide helpful error messages with next steps
6. **Testing** - Test thoroughly with real WhatsApp accounts

## 📚 API Documentation

Full Swagger/OpenAPI documentation available at:
```
http://yourdomain.com/api-docs
```

## 🤝 Support

For issues or questions:
- Check logs: `src/whatsapp/whatsapp.service.ts`
- Review session state: GET `/whatsapp/sessions`
- Check webhook logs in Meta Business Suite

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Module Status**: ✅ Production Ready
