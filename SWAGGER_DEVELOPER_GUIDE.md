# Swagger Documentation Development Guide

## For Developers: Maintaining and Extending API Documentation

This guide explains how to properly document new endpoints and maintain the Swagger/OpenAPI documentation for the Luvwish API.

## Quick Start: Adding Swagger Decorators

### 1. Document a New Controller

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('My Feature')
@ApiBearerAuth('access-token')
@Controller('my-feature')
export class MyFeatureController {
  // Endpoints will go here
}
```

### 2. Document a Endpoint

```typescript
@Post()
@ApiOperation({
  summary: 'Create something',
  description: 'Detailed description of what this endpoint does and how it works.'
})
@ApiBody({ type: CreateMyDto })
@ApiResponse({
  status: 201,
  description: 'Successfully created',
  schema: {
    example: {
      id: 'uuid',
      name: 'Example',
      createdAt: '2026-02-16T10:30:00Z'
    }
  }
})
@ApiBadRequestResponse({ description: 'Invalid input data' })
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
async create(@Body() dto: CreateMyDto) {
  // Implementation
}
```

### 3. Document Request Body (DTO)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMyDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the person',
    minLength: 3,
    maxLength: 100
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Email address (optional)',
    format: 'email'
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 25,
    description: 'Age of the person',
    minimum: 0,
    maximum: 150
  })
  @IsNumber()
  @Min(0)
  @Max(150)
  age: number;
}
```

## Common Swagger Decorators

### Controller-Level Decorators

| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@ApiTags()` | Group endpoints in Swagger UI | `@ApiTags('Products')` |
| `@ApiBearerAuth()` | Indicate bearer token auth | `@ApiBearerAuth('access-token')` |
| `@ApiExcludeController()` | Exclude from Swagger docs | `@ApiExcludeController()` |

### Endpoint-Level Decorators

| Decorator | Purpose |
|-----------|---------|
| `@ApiOperation()` | Describe what endpoint does |
| `@ApiBody()` | Document request body schema |
| `@ApiResponse()` | Document success response |
| `@ApiBadRequestResponse()` | Document 400 errors |
| `@ApiUnauthorizedResponse()` | Document 401 errors |
| `@ApiForbiddenResponse()` | Document 403 errors |
| `@ApiNotFoundResponse()` | Document 404 errors |
| `@ApiConflictResponse()` | Document 409 errors |
| `@ApiQuery()` | Document query parameters |
| `@ApiParam()` | Document URL parameters |
| `@ApiHeader()` | Document custom headers |

### Property-Level Decorators (DTOs)

```typescript
@ApiProperty({
  description: 'What this field is',
  example: 'Example value',
  type: String,
  required: true,
  format: 'email',        // for email
  minLength: 3,           // for strings
  maxLength: 100,         // for strings
  minimum: 0,             // for numbers
  maximum: 999,           // for numbers
  enum: ['active', 'inactive'],  // for enums
  default: 'active',
})

@ApiPropertyOptional({
  description: 'Optional field'
})
```

## Response Documentation Patterns

### Pattern 1: Successful Single Resource

```typescript
@ApiResponse({
  status: 200,
  description: 'Product retrieved successfully',
  schema: {
    example: {
      id: 'prod-uuid',
      name: 'Laptop',
      price: 4999.99,
      stock: 10,
      createdAt: '2026-02-16T10:30:00Z'
    }
  }
})
```

### Pattern 2: Successful List with Pagination

```typescript
@ApiResponse({
  status: 200,
  description: 'Products retrieved with pagination',
  schema: {
    example: {
      data: [
        { id: 'uuid', name: 'Product 1' },
        { id: 'uuid', name: 'Product 2' }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10
      }
    }
  }
})
```

### Pattern 3: Created Resource

```typescript
@ApiResponse({
  status: 201,
  description: 'Resource created successfully',
  type: CreateResponseDto,
  schema: {
    example: {
      id: 'new-uuid',
      message: 'Successfully created'
    }
  }
})
```

### Pattern 4: Error Response

```typescript
@ApiBadRequestResponse({
  description: 'Invalid input data provided',
  schema: {
    example: {
      statusCode: 400,
      message: 'Invalid email format',
      error: 'Bad Request'
    }
  }
})
```

## Query Parameters Documentation

### Pattern 1: Simple Query Param

```typescript
@ApiQuery({
  name: 'status',
  required: false,
  enum: ['active', 'inactive', 'pending'],
  description: 'Filter by status'
})
```

### Pattern 2: Date Range

```typescript
@ApiQuery({
  name: 'startDate',
  required: false,
  type: 'string',
  format: 'date',
  description: 'Filter from start date (ISO 8601)'
})
@ApiQuery({
  name: 'endDate',
  required: false,
  type: 'string',
  format: 'date',
  description: 'Filter to end date (ISO 8601)'
})
```

### Pattern 3: Pagination

```typescript
@ApiQuery({
  name: 'page',
  required: false,
  type: 'number',
  description: 'Page number (default: 1)',
  example: 1
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: 'number',
  description: 'Items per page (default: 10)',
  example: 10
})
```

## URL Parameters Documentation

```typescript
@ApiParam({
  name: 'id',
  type: 'string',
  description: 'Resource ID (UUID format)',
  example: '550e8400-e29b-41d4-a716-446655440000'
})
@Get(':id')
getById(@Param('id', new ParseUUIDPipe()) id: string) {
  // Implementation
}
```

## Enum Documentation

```typescript
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

@ApiProperty({
  enum: OrderStatus,
  description: 'Current order status',
  example: OrderStatus.PENDING
})
status: OrderStatus;
```

## Array Documentation

```typescript
import { Type } from 'class-transformer';

@ApiProperty({
  type: [ItemDto],
  description: 'List of items in the order'
})
@ValidateNested({ each: true })
@Type(() => ItemDto)
items: ItemDto[];
```

## Nested Object Documentation

```typescript
@ApiProperty({
  type: 'object',
  properties: {
    street: { type: 'string', example: '123 Main St' },
    city: { type: 'string', example: 'New York' },
    zipCode: { type: 'string', example: '10001' }
  },
  description: 'Delivery address'
})
@ValidateNested()
@Type(() => AddressDto)
address: AddressDto;
```

## Authentication Documentation

### Bearer Token

```typescript
// At controller level
@ApiBearerAuth('access-token')

// In Swagger config (main.ts)
.addBearerAuth(
  { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  'access-token'
)
```

### API Key

```typescript
// At controller level
@ApiSecurity('api-key')

// In Swagger config (main.ts)
.addApiKey(
  { type: 'apiKey', in: 'header', name: 'X-API-Key' },
  'api-key'
)
```

## Running and Testing Documentation

### 1. Start the Application
```bash
npm run start:dev
```

### 2. Open Swagger UI
```
http://localhost:3000/docs
```

### 3. Authorize
Click the "Authorize" button and enter your JWT token:
```
Bearer eyJhbGciOiJIUzI1NiIs...
```

### 4. Test Endpoints
Use the "Try it out" button on each endpoint to test requests directly in the UI.

## Validation Example: Complete Workflow

```typescript
// DTOs with full validation and documentation
import { IsEmail, IsString, IsNumber, Min, Max, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Laptop Pro',
    description: 'Product name',
    minLength: 3,
    maxLength: 100
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'High-performance laptop',
    description: 'Product description'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 4999.99,
    description: 'Product price',
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    example: 50,
    description: 'Stock quantity',
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  stock: number;
}
```

## Best Practices

### 1. ✅ DO

- ✅ Always add `@ApiOperation()` with summary and description
- ✅ Document all request/response schemas with examples
- ✅ Include error responses (400, 401, 403, 404, 409, 500)
- ✅ Use descriptive names for query/path parameters
- ✅ Provide realistic examples in schemas
- ✅ Document enums with all possible values
- ✅ Include validation rules in property descriptions
- ✅ Update documentation when changing endpoints
- ✅ Use `ApiPropertyOptional()` for optional fields
- ✅ Group related endpoints with `@ApiTags()`

### 2. ❌ DON'T

- ❌ Don't skip documentation for ANY endpoint
- ❌ Don't use generic descriptions like "Get data"
- ❌ Don't forget response schemas
- ❌ Don't document endpoints differently than they actually work
- ❌ Don't use fake examples that don't match actual data
- ❌ Don't ignore error cases
- ❌ Don't forget to update docs when changing request/response
- ❌ Don't mix different documentation styles
- ❌ Don't leave broken example schemas

## Common Mistakes & Fixes

### Mistake 1: Missing Response Schema

❌ **Wrong:**
```typescript
@ApiResponse({ status: 200, description: 'Success' })
```

✅ **Correct:**
```typescript
@ApiResponse({
  status: 200,
  description: 'Order retrieved successfully',
  schema: {
    example: {
      id: 'uuid',
      orderNumber: 'ORD-2026-001',
      totalAmount: 9999.99
    }
  }
})
```

### Mistake 2: Incorrect Field Type

❌ **Wrong:**
```typescript
@ApiProperty({ type: String })
quantity: number;
```

✅ **Correct:**
```typescript
@ApiProperty({
  type: 'number',
  example: 5,
  description: 'Quantity ordered'
})
quantity: number;
```

### Mistake 3: Missing Authorization Info

❌ **Wrong:**
```typescript
@Get(':id')
getOrder(@Param('id') id: string) { }
```

✅ **Correct:**
```typescript
@ApiBearerAuth('access-token')
@Get(':id')
@ApiOperation({ summary: 'Get order details' })
getOrder(@Param('id') id: string) { }
```

## TypeScript/NestJS Tips

### Import Swagger Decorators
```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
```

### Create Reusable Response Types

```typescript
// common/dto/api-response.dto.ts
export class ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

export class ApiListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Testing Swagger Documentation

Use tools like Swagger/OpenAPI validators:
```bash
npm install --save-dev @apidevtools/swagger-parser
```

Then validate your OpenAPI schema:
```typescript
const parser = require('@apidevtools/swagger-parser');
await parser.validate('swagger.json');
```

## Generating OpenAPI JSON

The Swagger JSON file is auto-generated and available at:
```
http://localhost:3000/api-json
```

You can export it for:
- API client generation
- Documentation sites
- API mocking
- Contract testing

## Support for API Clients

With proper OpenAPI/Swagger documentation, you can generate clients:

### Generate TypeScript Client
```bash
npm install --save-dev openapi-generator-cli
openapi-generator-cli generate -i http://localhost:3000/api-json -g typescript-fetch -o ./generated-api
```

### Generate Python Client
```bash
pip install openapi-generator-cli
openapi-generator-cli generate -i http://localhost:3000/api-json -g python -o ./generated-api
```

---

**Last Updated**: February 2026
**Swagger Version**: 2.0
**Author**: Luvwish Development Team
