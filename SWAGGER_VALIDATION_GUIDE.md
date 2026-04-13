# Swagger Documentation Validation

## Overview

This document provides guidelines and tools for validating Swagger/OpenAPI documentation quality.

## Quick Validation Checklist

### For Each Endpoint, Verify:

#### ✅ Documentation Completeness
```
- [ ] @ApiOperation present with summary and description
- [ ] @ApiBody present for POST/PATCH/PUT
- [ ] @ApiResponse present for 200/201
- [ ] Error responses present (@ApiBadRequestResponse, @ApiUnauthorizedResponse, etc.)
- [ ] @ApiParam present for path parameters
- [ ] @ApiQuery present for query parameters
```

#### ✅ Request Body
```
- [ ] DTO has @ApiProperty on all fields
- [ ] Required fields marked as required
- [ ] Optional fields use @ApiPropertyOptional
- [ ] Examples are realistic and match schema
- [ ] Validation rules documented (minLength, enum, etc.)
```

#### ✅ Response Schema
```
- [ ] Success response has example schema
- [ ] All response fields are documented
- [ ] Error responses show realistic error messages
- [ ] Pagination included for list endpoints
- [ ] Status codes are correct (200 vs 201)
```

#### ✅ API Clarity
```
- [ ] Summary ≤ 50 characters
- [ ] Description explains when/why to use
- [ ] Role requirements documented
- [ ] Examples don't contain secrets
- [ ] Consistent with other endpoints
```

---

## Manual Validation Process

### Step 1: Start Application
```bash
npm run start:dev
```

### Step 2: Open Swagger UI
```
http://localhost:3000/docs
```

### Step 3: Check Each Endpoint
- Click on endpoint to expand
- Verify summary is clear and concise
- Check request body schema
- Verify response examples
- Check error responses
- Test with "Try it out" button

### Step 4: Make Notes
Document any:
- Missing descriptions
- Incorrect examples
- Missing error responses
- Confusing wording

### Step 5: Update and Retest
Fix issues found and restart server to verify changes.

---

## Automated Validation Script

### Option 1: Using OpenAPI Validator

```bash
# Install validator
npm install --save-dev @apidevtools/swagger-parser

# Create validation script: scripts/validate-swagger.ts
```

**scripts/validate-swagger.ts**:
```typescript
import SwaggerParser from '@apidevtools/swagger-parser';

async function validateSwagger() {
  try {
    const api = await SwaggerParser.validate('./swagger.json');
    console.log('✅ Swagger documentation is valid!');
    console.log(`Found ${Object.keys(api.paths).length} endpoints`);
    
    // Check for common issues
    let issues = 0;
    
    for (const [path, pathObj]: any) {
      for (const [method, operation] of Object.entries(pathObj)) {
        if (!operation.summary) {
          console.warn(`⚠️  Missing summary for ${method.toUpperCase()} ${path}`);
          issues++;
        }
        if (!operation.responses['200'] && !operation.responses['201']) {
          console.warn(`⚠️  Missing success response for ${method.toUpperCase()} ${path}`);
          issues++;
        }
      }
    }
    
    if (issues === 0) {
      console.log('✅ No common issues found!');
    } else {
      console.log(`⚠️  Found ${issues} potential issues`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Swagger validation failed:', err);
    process.exit(1);
  }
}

validateSwagger();
```

**Run validation**:
```bash
npx ts-node scripts/validate-swagger.ts
```

### Option 2: Using Spectacle CLI

```bash
# Install 
npm install --save-dev @stoplight/spectacle-cli

# Validate
spectacle ./swagger.json
```

### Option 3: Pre-commit Hook

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Validating Swagger documentation..."
npm run validate:swagger || exit 1
```

---

## Documentation Quality Metrics

### Issue Priority Levels

**🔴 CRITICAL**: Must be fixed before deployment
- Missing operations
- Invalid JSON/YAML
- Security schema issues
- Breaking API changes not documented

**🟠 HIGH**: Should be fixed soon
- Missing descriptions
- Incorrect examples
- Missing error responses
- Type mismatches

**🟡 MEDIUM**: Nice to have
- Unclear descriptions
- Inconsistent naming
- Suboptimal examples
- Missing deprecation notices

**🟢 LOW**: Future improvements
- Wording improvements
- Better examples
- Documentation improvements
- Additional examples

---

## Common Issues & Fixes

### Issue 1: Missing Operation Summary

❌ **Bad**:
```typescript
@Post()
async create(@Body() dto: CreateDto) { }
```

✅ **Good**:
```typescript
@Post()
@ApiOperation({
  summary: 'Create resource',
  description: 'Create a new resource with provided data'
})
async create(@Body() dto: CreateDto) { }
```

### Issue 2: Incorrect Example Types

❌ **Bad**:
```typescript
@ApiProperty({ example: '123', type: 'number' })
count: number;
```

✅ **Good**:
```typescript
@ApiProperty({
  type: 'number',
  example: 123,
  description: 'Number of items'
})
count: number;
```

### Issue 3: Missing Error Responses

❌ **Bad**:
```typescript
@Post()
@ApiResponse({ status: 201, description: 'Created' })
async create(@Body() dto: CreateDto) { }
```

✅ **Good**:
```typescript
@Post()
@ApiResponse({ status: 201, description: 'Created' })
@ApiBadRequestResponse({ description: 'Invalid data' })
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden' })
async create(@Body() dto: CreateDto) { }
```

### Issue 4: Undocumented Fields

❌ **Bad**:
```typescript
export class UserDto {
  id: string;
  email: string;
  role: string;
}
```

✅ **Good**:
```typescript
export class UserDto {
  @ApiProperty({ example: 'uuid', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({
    enum: ['CUSTOMER', 'ADMIN', 'DELIVERY'],
    example: 'CUSTOMER',
    description: 'User role'
  })
  role: string;
}
```

---

## Swagger Documentation Standards

### Naming Conventions

**Endpoints**: Lowercase with hyphens
```
✅ /api/products/search
✅ /api/order-items
❌ /api/productSearch
❌ /api/OrderItems
```

**Parameters**: Camel case
```
✅ ?orderBy=name
✅ ?startDate=2026-01-01
❌ ?order_by=name
❌ ?start_date=2026-01-01
```

**Fields in JSON**: Camel case
```
✅ { "firstName": "John", "createdAt": "2026-02-16T..." }
✅ { "productId": "uuid", "isActive": true }
❌ { "first_name": "John", "created_at": "..." }
```

### Description Guidelines

**Summaries** (1-2 sentences):
- Action-oriented: "Create order", "Get products"
- Clear and concise
- No period at end
- Under 50 characters

**Descriptions** (1-3 paragraphs):
- Explain what endpoint does
- When/why to use it
- Any prerequisites
- Special behaviors or edge cases
- Link to related endpoints if relevant

### Example Value Guidelines

**Always use realistic examples**:
```
✅ { "email": "user@example.com" }
✅ { "price": 4999.99 }
✅ { "quantity": 5 }
❌ { "email": "test@test.com" }
❌ { "price": 100 }
❌ { "quantity": 1 }
```

**Never include secrets in examples**:
```
✅ { "apiKey": "{your-api-key}" }
✅ { "token": "eyJhbGciOiJI..." }
❌ { "apiKey": "sk_live_abc123xyz..." }
❌ { "password": "actualPassword123!" }
```

---

## Testing Documentation

### Manual Testing Workflow

1. **Read the summary**: Should understand purpose immediately
2. **Read the description**: Should understand full context
3. **Check request body**: All fields documented and typed
4. **Check response**: Example shows realistic data
5. **Try it out**: Use Swagger UI to test
6. **Verify results**: Response matches documentation

### Automated Testing

Create tests to verify:

```typescript
describe('Swagger Documentation', () => {
  it('should have all endpoints documented', async () => {
    const response = await fetch('http://localhost:3000/api-json');
    const swagger = await response.json();
    
    for (const [path, methods] of Object.entries(swagger.paths)) {
      for (const [method, operation]: any) {
        expect(operation.summary).toBeDefined();
        expect(operation.operationId).toBeDefined();
      }
    }
  });

  it('should have security defined', async () => {
    const response = await fetch('http://localhost:3000/api-json');
    const swagger = await response.json();
    
    expect(swagger.components.securitySchemes).toBeDefined();
  });
});
```

---

## Documentation Maintenance

### Regular Reviews

**Weekly**:
- Check new endpoints added
- Verify Swagger UI accessible
- Note any issues found

**Monthly**:
- Review existing documentation
- Update examples
- Fix reported issues
- Add missing endpoints

**Quarterly**:
- Audit all endpoints
- Check consistency
- Update version numbers
- Generate client libraries

### Update Checklist

When updating an endpoint:
- [ ] Update @ApiOperation
- [ ] Update @ApiBody if request changed
- [ ] Update @ApiResponse if response changed
- [ ] Update @ApiParam/@ApiQuery if parameters changed
- [ ] Update error responses if applicable
- [ ] Update DTO with new fields
- [ ] Test in Swagger UI
- [ ] Update API_CHANGELOG.md

---

## Documentation Tools

### Useful Tools

- **Swagger UI**: Interactive documentation
- **Swagger Editor**: Edit OpenAPI specs visually
- **Redoc**: Beautiful API documentation
- **OpenAPI Generator**: Generate clients and servers
- **Spectacle**: Beautiful, responsive API documentation
- **Swagger Parser**: Validate OpenAPI specs

### Swagger UI Extensions

[Swagger UI Configuration Options](https://swagger.io/tools/swagger-ui/):
```typescript
SwaggerModule.setup('docs', app, swaggerDocument, {
  swaggerOptions: {
    persistAuthorization: true,
    filter: true,
    showRequestHeaders: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    presets: [...],
    plugins: [...],
  },
  customSiteTitle: 'Luvwish API',
});
```

---

## Quick Reference: Checklist for New Endpoints

Use this when documenting new endpoints:

```typescript
// 1. Add decorators
@Get(':id')
@ApiBearerAuth('access-token')
@ApiOperation({
  summary: '',              // ✅ Add
  description: ''           // ✅ Add
})

// 2. Add parameters
@ApiParam({
  name: 'id',
  description: '',          // ✅ Add
  example: ''               // ✅ Add
})

// 3. Add responses
@ApiResponse({
  status: 200,
  schema: { example: {} }   // ✅ Add
})
@ApiBadRequestResponse()    // ✅ Add
@ApiUnauthorizedResponse()  // ✅ Add

// 4. Enhance DTO
@ApiProperty({
  example: '',              // ✅ Add
  description: ''           // ✅ Add
})

// 5. Test in Swagger UI
// ✅ npm run start:dev
// ✅ http://localhost:3000/docs
// ✅ Expand endpoint
// ✅ Click "Try it out"
```

---

## Support & Resources

- **Error Messages**: Check Swagger UI error details
- **Examples**: See Returns and Auth controllers
- **Guides**: [SWAGGER_DEVELOPER_GUIDE.md](./SWAGGER_DEVELOPER_GUIDE.md)
- **Reference**: [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.3)

---

**Last Updated**: February 2026
**Version**: 2.0
