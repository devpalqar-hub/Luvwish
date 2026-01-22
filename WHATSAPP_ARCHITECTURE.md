# WhatsApp Shopping Module - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WhatsApp Business API                         │
│                     (Meta/Facebook Platform)                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Webhooks (HTTPS)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Your NestJS Application                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              WhatsApp Module (NEW)                            │  │
│  │                                                               │  │
│  │  ┌─────────────────┐  ┌──────────────────┐                  │  │
│  │  │  Controller     │  │  Service         │                  │  │
│  │  │                 │  │                  │                  │  │
│  │  │ • POST settings │  │ • Send messages  │                  │  │
│  │  │ • GET webhook   │  │ • Manage sessions│                  │  │
│  │  │ • POST webhook  │  │ • API calls      │                  │  │
│  │  │ • GET sessions  │  │ • Settings CRUD  │                  │  │
│  │  └────────┬────────┘  └────────┬─────────┘                  │  │
│  │           │                     │                             │  │
│  │           │    ┌────────────────┴──────────────┐             │  │
│  │           │    │                               │             │  │
│  │           ▼    ▼                               ▼             │  │
│  │  ┌──────────────────┐              ┌────────────────────┐   │  │
│  │  │ Message Handler  │              │   Gateway          │   │  │
│  │  │                  │              │   (WebSocket)      │   │  │
│  │  │ • Browse cats    │              │                    │   │  │
│  │  │ • Search prods   │              │ • Real-time msgs   │   │  │
│  │  │ • Manage cart    │              │ • State updates    │   │  │
│  │  │ • Collect addr   │              │ • Order notifs     │   │  │
│  │  │ • Create order   │              │                    │   │  │
│  │  └────────┬─────────┘              └──────────┬─────────┘   │  │
│  │           │                                    │             │  │
│  └───────────┼────────────────────────────────────┼─────────────┘  │
│              │                                    │                 │
│              │  Uses                              │ Broadcasts      │
│              ▼                                    ▼                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Existing Modules (Unchanged)                      │ │
│  │                                                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │ │
│  │  │ Products │  │   Cart   │  │  Orders  │  │ Address  │     │ │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │     │ │
│  │  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘     │ │
│  │        │             │             │             │           │ │
│  └────────┼─────────────┼─────────────┼─────────────┼───────────┘ │
│           │             │             │             │              │
│           └─────────────┴─────────────┴─────────────┘              │
│                         │                                          │
│                         ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Prisma Service                             │  │
│  │            (Database ORM / Data Access Layer)               │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MySQL Database                                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ Existing Tables│  │  WhatsApp      │  │   WhatsApp     │       │
│  │                │  │  Settings      │  │   Sessions     │       │
│  │ • users        │  │                │  │                │       │
│  │ • products     │  │ • credentials  │  │ • state        │       │
│  │ • cart_items   │  │ • timestamps   │  │ • context      │       │
│  │ • orders       │  │ • active flag  │  │ • phone        │       │
│  │ • addresses    │  └────────────────┘  └────────────────┘       │
│  │ • ...          │                                                │
│  └────────────────┘  ┌────────────────┐                           │
│                      │   WhatsApp     │                           │
│                      │   Messages     │                           │
│                      │                │                           │
│                      │ • message_id   │                           │
│                      │ • direction    │                           │
│                      │ • content      │                           │
│                      └────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Flow

```
┌──────────┐                                              ┌──────────┐
│          │  1. User sends "hi"                          │          │
│  User    │─────────────────────────────────────────────▶│ WhatsApp │
│ WhatsApp │                                              │ Business │
│  Client  │                                              │   API    │
└──────────┘                                              └─────┬────┘
                                                                │
                                                                │ 2. Webhook
                                                                ▼
                                                          ┌──────────────┐
                                                          │   Webhook    │
                                                          │  Controller  │
                                                          └──────┬───────┘
                                                                 │
                                                                 │ 3. Parse
                                                                 ▼
                                                          ┌──────────────┐
                                                          │   Message    │
                                                          │   Handler    │
                                                          └──────┬───────┘
                                                                 │
                              4. Get/Create Session              │
                     ┌────────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │  Session State   │
          │  • IDLE          │
          │  • BROWSING      │
          │  • CART          │
          │  • etc.          │
          └─────────┬────────┘
                    │
                    │ 5. Process based on state
                    ▼
     ┌──────────────────────────────────┐
     │  Business Logic                  │
     │  • Browse categories             │
     │  • Search products               │
     │  • Add to cart                   │
     │  • Collect address               │
     │  • Create order                  │
     └─────────────┬────────────────────┘
                   │
                   │ 6. Call existing services
                   ▼
     ┌──────────────────────────────────┐
     │  Products/Cart/Orders Services   │
     │  (Existing, unchanged)           │
     └─────────────┬────────────────────┘
                   │
                   │ 7. Database operations
                   ▼
          ┌─────────────────┐
          │  Prisma/MySQL   │
          └─────────┬───────┘
                    │
                    │ 8. Return data
                    ▼
          ┌──────────────────┐
          │   Format Reply   │
          │  • Text          │
          │  • Buttons       │
          │  • List          │
          │  • Image         │
          └─────────┬────────┘
                    │
                    │ 9. Send to WhatsApp API
                    ▼
          ┌──────────────────┐
          │ WhatsApp Service │
          │ (Send message)   │
          └─────────┬────────┘
                    │
                    │ 10. API call
                    ▼
┌──────────┐  ◀─────────────────────────────  ┌──────────┐
│          │  11. User receives reply         │ WhatsApp │
│   User   │                                  │ Business │
│ WhatsApp │                                  │   API    │
│  Client  │                                  │          │
└──────────┘                                  └──────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Settings                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Keys → Stored in DB → Used for API Calls         │ │
│  │  Last Updated → Tracked on every update               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Session Management                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Phone Number → Session → Customer Profile            │ │
│  │  State (IDLE, BROWSING, etc.)                         │ │
│  │  Context (selected category, product, etc.)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Message Processing                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Incoming → Parse → Route by State → Process          │ │
│  │  Outgoing → Format → Send via API → Log              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Operations                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Browse → Search → Add to Cart → Address → Order      │ │
│  │  Uses existing services (Products, Cart, Orders)      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
WhatsApp Module
├── @nestjs/common (✅ Installed)
├── @nestjs/websockets (❗ NEW - Install required)
├── @nestjs/platform-socket.io (❗ NEW - Install required)
├── socket.io (❗ NEW - Install required)
├── axios (✅ Installed)
├── class-validator (✅ Installed)
├── class-transformer (✅ Installed)
└── @prisma/client (✅ Installed)

Existing Modules (Used, not modified)
├── ProductsService
├── CartService
├── OrdersService
├── PrismaService
├── S3Service
├── MailService
└── FirebaseSender
```

## File Structure

```
src/whatsapp/
│
├── whatsapp.module.ts              # Module definition
│   └── Imports all services & providers
│
├── whatsapp.controller.ts          # HTTP endpoints
│   ├── Settings CRUD
│   ├── Webhook handlers
│   ├── Testing endpoints
│   └── Session management
│
├── whatsapp.service.ts             # Core service
│   ├── Settings management
│   ├── Session management
│   ├── Message sending
│   └── Webhook verification
│
├── whatsapp-message.handler.ts    # Business logic
│   ├── Process incoming messages
│   ├── State-based routing
│   ├── Category/product browsing
│   ├── Cart management
│   ├── Address collection
│   └── Order creation
│
├── whatsapp.gateway.ts             # WebSocket
│   ├── Real-time connections
│   ├── Event broadcasting
│   └── Session monitoring
│
├── dto/
│   ├── whatsapp-settings.dto.ts   # Settings DTOs
│   └── webhook.dto.ts              # Webhook DTOs
│
└── interfaces/
    └── whatsapp-message.interface.ts  # Type definitions
```

## State Machine

```
        ┌─────────┐
        │  START  │
        └────┬────┘
             │
             ▼
        ┌────────┐
        │  IDLE  │◀──────────────────────┐
        └────┬───┘                       │
             │                           │
     ┌───────┼───────────┐              │
     │       │           │              │
     ▼       ▼           ▼              │
┌─────────┐ ┌─────────┐ ┌─────────┐   │
│BROWSING │ │SEARCHING│ │ VIEWING │   │
│  CATS   │ │PRODUCTS │ │  CART   │───┘
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     ▼           ▼           │
┌─────────────────────┐      │
│ BROWSING PRODUCTS   │      │
└──────────┬──────────┘      │
           │                 │
           ▼                 │
    ┌──────────────┐         │
    │  SELECTING   │         │
    │  VARIATION   │         │
    └──────┬───────┘         │
           │                 │
           └────────┬────────┘
                    │
                    ▼
            ┌───────────────┐
            │   ENTERING    │
            │   ADDRESS     │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  CONFIRMING   │
            │    ORDER      │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ ORDER CREATED │
            └───────┬───────┘
                    │
                    ▼
                 ┌──────┐
                 │ IDLE │
                 └──────┘
```

---

**Architecture Highlights:**

✅ **Modular Design** - Separate concerns (controller, service, handler, gateway)  
✅ **Scalable** - WebSocket for real-time, stateful sessions  
✅ **Maintainable** - Clear separation of business logic  
✅ **Testable** - Each component can be tested independently  
✅ **Non-invasive** - Existing modules unchanged  
✅ **Extensible** - Easy to add new features  

---
