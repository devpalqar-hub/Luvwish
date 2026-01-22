# WhatsApp Module Migration

## Database Migration Created

The WhatsApp module requires new database tables. Run this migration to create them.

### Migration Name
```
add_whatsapp_module
```

### Tables Created

1. **whatsapp_settings** - Store WhatsApp Business API credentials
2. **whatsapp_sessions** - Track user conversation sessions  
3. **whatsapp_messages** - Log all messages (inbound/outbound)

### Enums Added

- `WhatsAppSessionState` - Session states (IDLE, BROWSING_CATEGORIES, etc.)
- `WhatsAppMessageDirection` - Message direction (INBOUND, OUTBOUND)

### Relations Added

- CustomerProfile → WhatsAppSession (one-to-many)
- WhatsAppSession → WhatsAppMessage (one-to-many)

## Run Migration

### Development
```bash
npx prisma migrate dev --name add_whatsapp_module
```

### Production
```bash
npx prisma migrate deploy
```

### Generate Prisma Client
```bash
npx prisma generate
```

## Verify Migration

Check that tables were created:
```bash
npx prisma studio
```

You should see:
- ✅ whatsapp_settings
- ✅ whatsapp_sessions
- ✅ whatsapp_messages

## Rollback (if needed)

If you need to rollback:
```bash
# Find the migration
cd prisma/migrations
# Delete the migration folder
rm -rf [timestamp]_add_whatsapp_module
# Reset database
npx prisma migrate reset
```

## Schema Changes

### New Models

```prisma
model WhatsAppSettings {
  id            String   @id @default(uuid())
  apiKey        String
  phoneNumberId String
  businessId    String
  accessToken   String   @db.Text
  webhookToken  String
  webhookUrl    String?
  isActive      Boolean  @default(true)
  lastUpdatedAt DateTime @updatedAt
  createdAt     DateTime @default(now())
}

model WhatsAppSession {
  id                String               @id @default(uuid())
  phoneNumber       String               @unique
  customerProfileId String?
  state             WhatsAppSessionState @default(IDLE)
  contextData       Json?
  lastMessageAt     DateTime             @default(now())
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  customerProfile CustomerProfile?  @relation(fields: [customerProfileId], references: [id])
  messages        WhatsAppMessage[]
}

model WhatsAppMessage {
  id          String                   @id @default(uuid())
  sessionId   String
  messageId   String                   @unique
  direction   WhatsAppMessageDirection
  content     String                   @db.Text
  messageType String                   @default("text")
  metadata    Json?
  createdAt   DateTime                 @default(now())
  
  session WhatsAppSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

## No Breaking Changes

✅ This migration is **non-breaking** and **safe to run** on production.

- No existing tables modified
- No existing columns changed
- Only adds new tables
- Does not affect existing functionality

## Post-Migration Steps

1. ✅ Run migration
2. ✅ Generate Prisma client
3. ✅ Restart application
4. ✅ Verify endpoints are working
5. ✅ Configure WhatsApp settings via API

---

**Status**: Ready to deploy ✅
