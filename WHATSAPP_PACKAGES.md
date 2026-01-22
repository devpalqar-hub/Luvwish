# Required NPM Packages for WhatsApp Module

## Installation Command

Run this command to install all required dependencies:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io axios
npm install --save-dev @types/socket.io
```

## Package Details

### Production Dependencies

1. **@nestjs/websockets** (^10.0.0)
   - Purpose: WebSocket support for NestJS
   - Used for: Real-time notifications and updates

2. **@nestjs/platform-socket.io** (^10.0.0)
   - Purpose: Socket.io adapter for NestJS
   - Used for: WebSocket gateway implementation

3. **socket.io** (^4.6.0)
   - Purpose: WebSocket library
   - Used for: Real-time bidirectional communication

4. **axios** (Already installed)
   - Purpose: HTTP client
   - Used for: WhatsApp API requests

### Development Dependencies

1. **@types/socket.io** (^3.0.2)
   - Purpose: TypeScript definitions for socket.io
   - Used for: Type safety in development

## Verify Installation

After installation, verify packages are in `package.json`:

```bash
npm list @nestjs/websockets
npm list @nestjs/platform-socket.io
npm list socket.io
npm list axios
```

## Already Installed Dependencies (Used by Module)

The following packages are already available in your project:
- ✅ `@nestjs/common` - Core NestJS framework
- ✅ `@nestjs/core` - Core NestJS utilities
- ✅ `@prisma/client` - Database ORM
- ✅ `class-validator` - DTO validation
- ✅ `class-transformer` - Object transformation

## Package Versions Compatibility

| Package | Minimum Version | Recommended |
|---------|----------------|-------------|
| @nestjs/websockets | 10.0.0 | Latest |
| @nestjs/platform-socket.io | 10.0.0 | Latest |
| socket.io | 4.6.0 | Latest |
| axios | 1.0.0 | Already installed |

## Installation Issues?

### Issue: Peer dependency warnings
```bash
npm install --legacy-peer-deps
```

### Issue: Version conflicts
```bash
npm install @nestjs/websockets@latest @nestjs/platform-socket.io@latest
```

### Issue: Type definitions not found
```bash
npm install --save-dev @types/socket.io @types/node
```

## Post-Installation

After successful installation:
1. ✅ Run Prisma migration
2. ✅ Generate Prisma client
3. ✅ Restart development server

```bash
npx prisma migrate dev --name add_whatsapp_module
npx prisma generate
npm run start:dev
```

## Verify WebSocket Support

Test WebSocket connection:
```javascript
// In browser console or Node.js
const io = require('socket.io-client');
const socket = io('http://localhost:3000/whatsapp');

socket.on('connect', () => {
  console.log('✅ WebSocket connected!');
});
```

---

**Installation Complete!** ✅

Next: Follow [WHATSAPP_QUICK_SETUP.md](./WHATSAPP_QUICK_SETUP.md) for configuration.
