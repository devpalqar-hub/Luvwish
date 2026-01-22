# WhatsApp Module - Quick Setup Guide

## 🚀 Quick Installation (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io axios
npm install --save-dev @types/socket.io
```

### Step 2: Run Database Migration
```bash
npx prisma migrate dev --name add_whatsapp_module
npx prisma generate
```

### Step 3: Start the Server
```bash
npm run start:dev
```

## ✅ Verification Checklist

### 1. Check Module is Loaded
The server should start without errors. Look for:
```
[WhatsAppService] WhatsApp module initialized
[WhatsAppGateway] WebSocket server listening on /whatsapp
```

### 2. Test Database Tables
```bash
npx prisma studio
```
Check for these new tables:
- ✅ whatsapp_settings
- ✅ whatsapp_sessions
- ✅ whatsapp_messages

### 3. Test API Endpoints

**Test Settings API:**
```bash
curl http://localhost:3000/whatsapp/settings
```
Expected: `[]` (empty array initially)

**Create Test Settings:**
```bash
curl -X POST http://localhost:3000/whatsapp/settings \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "test_api_key",
    "phoneNumberId": "123456789",
    "businessId": "987654321",
    "accessToken": "test_access_token",
    "webhookToken": "my_secure_webhook_token_123",
    "isActive": true
  }'
```

**Test Webhook Verification:**
```bash
curl "http://localhost:3000/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_secure_webhook_token_123&hub.challenge=TEST_CHALLENGE"
```
Expected: `TEST_CHALLENGE`

### 4. Test WebSocket Connection

**Using a browser console:**
```javascript
const socket = io('http://localhost:3000/whatsapp');

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('register', { phoneNumber: '919876543210' });
});

socket.on('registered', (data) => {
  console.log('Registered:', data);
});
```

## 🔧 WhatsApp Business API Setup

### Get Your Credentials

1. **Go to Meta Business Suite:**
   - https://business.facebook.com/
   - Navigate to WhatsApp Business API

2. **Get Phone Number ID:**
   - Settings → WhatsApp → Phone Numbers
   - Copy your Phone Number ID

3. **Get Access Token:**
   - Settings → System Users → Generate Token
   - Select permissions: `whatsapp_business_messaging`

4. **Get Business Account ID:**
   - Settings → WhatsApp → Business Account ID

### Configure in Your App

**Using API (Recommended):**
```bash
curl -X POST http://localhost:3000/whatsapp/settings \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY",
    "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
    "businessId": "YOUR_BUSINESS_ID",
    "accessToken": "YOUR_ACCESS_TOKEN",
    "webhookToken": "your_custom_webhook_token",
    "webhookUrl": "https://yourdomain.com/whatsapp/webhook",
    "isActive": true
  }'
```

### Setup Webhook in Meta Business Suite

1. **Configure Webhook:**
   - Go to WhatsApp → Configuration
   - Callback URL: `https://yourdomain.com/whatsapp/webhook`
   - Verify Token: Same as `webhookToken` from settings
   - Click "Verify and Save"

2. **Subscribe to Webhooks:**
   - Select: `messages` field
   - Save changes

## 📱 Testing with Real WhatsApp

### 1. Send Test Message
From your WhatsApp Business number, send a test message to a test number (that you control).

### 2. Expected Flow:
1. User sends: "hi"
2. Bot responds with main menu (3 buttons)
3. User selects "Browse Categories"
4. Bot shows category list
5. Continue testing the flow...

### 3. Test Commands:
- `menu` - Main menu
- `cart` - View cart
- `categories` - Browse categories
- Product name - Search products

## 🎯 Production Deployment

### Environment Variables (.env.production)
```env
# Database
DATABASE_URL="mysql://user:password@host:3306/database"

# WhatsApp (Optional - can be set via API)
WHATSAPP_WEBHOOK_TOKEN=your_secure_production_webhook_token

# Server
PORT=3000
NODE_ENV=production
```

### HTTPS Required
WhatsApp webhooks require HTTPS. Options:
1. Use Nginx reverse proxy with SSL
2. Use Cloudflare
3. Use services like Railway, Heroku, etc.

### Webhook URL Example:
```
https://api.yourdomain.com/whatsapp/webhook
```

## 🔍 Quick Testing Script

Create `test-whatsapp.sh`:
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing WhatsApp Module..."

# Test 1: Get Settings
echo "\n1. Testing GET /whatsapp/settings"
curl -s $BASE_URL/whatsapp/settings | jq

# Test 2: Get Active Sessions
echo "\n2. Testing GET /whatsapp/sessions"
curl -s $BASE_URL/whatsapp/sessions | jq

# Test 3: Webhook Verification
echo "\n3. Testing Webhook Verification"
curl -s "$BASE_URL/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=123"

echo "\n\n✅ Basic tests complete!"
```

Run with:
```bash
chmod +x test-whatsapp.sh
./test-whatsapp.sh
```

## 🐛 Common Issues

### Issue: Module not loading
**Solution:** Check imports in `app.module.ts`:
```typescript
import { WhatsAppModule } from './whatsapp/whatsapp.module';
// ...
imports: [
  // ... other modules
  WhatsAppModule,
]
```

### Issue: Prisma errors
**Solution:** Regenerate Prisma client:
```bash
npx prisma generate
```

### Issue: WebSocket not connecting
**Solution:** Check CORS settings in `whatsapp.gateway.ts`

### Issue: Webhook verification failing
**Solution:** Ensure webhook token in settings matches the one in Meta Business Suite

## 📊 Monitor & Debug

### View Logs
```bash
# Application logs
tail -f logs/application.log

# Check for WhatsApp module logs
grep "WhatsApp" logs/application.log
```

### Database Queries
```bash
# View active sessions
npx prisma studio
# Navigate to whatsapp_sessions table

# View messages
# Navigate to whatsapp_messages table
```

### API Testing with Postman
Import the collection:
1. Create new collection "WhatsApp API"
2. Add requests for all endpoints
3. Test each endpoint

## 🎉 Success Indicators

✅ Server starts without errors  
✅ Database tables created  
✅ API endpoints responding  
✅ Webhook verification working  
✅ WebSocket connection successful  
✅ Test message sent successfully  
✅ Session created in database  
✅ Messages logged correctly  

## 📞 Next Steps

1. **Configure WhatsApp Business API** - Get your production credentials
2. **Test Full Flow** - Test complete shopping flow
3. **Customize Messages** - Edit welcome messages and responses
4. **Add Products** - Ensure products have images and are in stock
5. **Monitor Sessions** - Check session management
6. **Setup Analytics** - Track usage and conversions

## 🆘 Need Help?

- Check [WHATSAPP_MODULE_GUIDE.md](./WHATSAPP_MODULE_GUIDE.md) for detailed documentation
- Review logs in `src/whatsapp/whatsapp.service.ts`
- Test with Postman collection
- Check Meta Business Suite webhook logs

---

**Ready to Go!** 🚀

Your WhatsApp shopping module is now set up and ready for testing!
