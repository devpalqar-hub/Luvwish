#!/bin/bash

# WhatsApp Module Installation Script
# Run this script to set up the WhatsApp shopping module

set -e  # Exit on error

echo "🚀 WhatsApp Shopping Module - Installation Script"
echo "=================================================="
echo ""

# Step 1: Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Found package.json"
echo ""

# Step 2: Install NPM packages
echo "📦 Installing required NPM packages..."
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io axios
npm install --save-dev @types/socket.io

if [ $? -eq 0 ]; then
    echo "✅ NPM packages installed successfully"
else
    echo "❌ Failed to install NPM packages"
    exit 1
fi
echo ""

# Step 3: Run Prisma migration
echo "🗄️  Running Prisma migration..."
npx prisma migrate dev --name add_whatsapp_module

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed"
else
    echo "⚠️  Migration may have failed. Please check manually."
fi
echo ""

# Step 4: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo ""

# Step 5: Check database tables
echo "🔍 Verifying database setup..."
echo "   Opening Prisma Studio to verify tables..."
echo "   Check for: whatsapp_settings, whatsapp_sessions, whatsapp_messages"
echo "   Press Ctrl+C to close Prisma Studio when done"
echo ""
sleep 2
npx prisma studio &
PRISMA_PID=$!
sleep 5
kill $PRISMA_PID 2>/dev/null || true
echo ""

# Step 6: Installation complete
echo "✅ Installation Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start the development server:"
echo "   npm run start:dev"
echo ""
echo "2. Configure WhatsApp settings:"
echo "   curl -X POST http://localhost:3000/whatsapp/settings \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"apiKey\": \"your_api_key\","
echo "       \"phoneNumberId\": \"your_phone_number_id\","
echo "       \"businessId\": \"your_business_id\","
echo "       \"accessToken\": \"your_access_token\","
echo "       \"webhookToken\": \"your_webhook_token\","
echo "       \"isActive\": true"
echo "     }'"
echo ""
echo "3. Test webhook verification:"
echo "   curl 'http://localhost:3000/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_webhook_token&hub.challenge=TEST'"
echo ""
echo "4. Set up webhook in Meta Business Suite:"
echo "   - URL: https://yourdomain.com/whatsapp/webhook"
echo "   - Verify Token: Same as webhookToken"
echo "   - Subscribe to: messages"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• Complete Guide: WHATSAPP_MODULE_GUIDE.md"
echo "• Quick Setup: WHATSAPP_QUICK_SETUP.md"
echo "• Migration Info: WHATSAPP_MIGRATION_GUIDE.md"
echo "• Package Info: WHATSAPP_PACKAGES.md"
echo "• Implementation Summary: WHATSAPP_IMPLEMENTATION_SUMMARY.md"
echo "• Postman Collection: whatsapp-api-collection.json"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 WhatsApp Shopping Module is ready to use!"
echo ""
