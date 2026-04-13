import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnFilterDto } from './dto/return-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Returns & Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) { }

  // ==================== CUSTOMER ENDPOINTS ====================

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Create a new return request',
    description: 'Allows customers to initiate a return request for an order. Supports both full and partial returns. For partial returns, specific items and quantities must be provided.',
  })
  @ApiBody({
    type: CreateReturnDto,
    description: 'Return request details including order ID, return type, and reason',
    examples: {
      fullReturn: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          returnType: 'full',
          reason: 'Product not as described',
          items: [],
        },
      },
      partialReturn: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          returnType: 'partial',
          reason: 'One item is damaged',
          items: [
            {
              orderItemId: '660e8400-e29b-41d4-a716-446655440001',
              quantity: 1,
              reason: 'Item arrived damaged',
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Return request created successfully',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      customerProfileId: '880e8400-e29b-41d4-a716-446655440003',
      returnType: 'full',
      status: 'pending',
      reason: 'Product not as described',
      createdAt: '2026-04-13T10:30:00Z',
      updatedAt: '2026-04-13T10:30:00Z',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have CUSTOMER role' })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid input data' })
  async createReturn(@Request() req, @Body() dto: CreateReturnDto) {
    const userId = req.user.id || req.user.sub;
    const customerProfile = await this.returnsService['prisma'].customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customerProfile) {
      throw new Error('Customer profile not found');
    }

    return this.returnsService.createReturn(dto, customerProfile.id);
  }

  @Get('my-returns')
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Get all my return requests',
    description: 'Retrieves all return requests initiated by the authenticated customer with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'orderId',
    type: String,
    required: false,
    description: 'Filter by order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'picked_up', 'received', 'inspecting', 'approved', 'rejected', 'refunded', 'cancelled'],
    required: false,
    description: 'Filter by return status',
    example: 'pending',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Filter by start date (ISO format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Filter by end date (ISO format)',
    example: '2026-04-13',
  })
  @ApiQuery({
    name: 'page',
    type: String,
    required: false,
    description: 'Page number for pagination',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    required: false,
    description: 'Number of items per page',
    example: '10',
  })
  @ApiOkResponse({
    description: 'List of customer return requests retrieved successfully',
    example: {
      data: [
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          returnType: 'full',
          reason: 'Product not as described',
          createdAt: '2026-04-13T10:30:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have CUSTOMER role' })
  async getMyReturns(@Request() req, @Query() filters: ReturnFilterDto) {
    const userId = req.user.id || req.user.sub;
    const customerProfile = await this.returnsService['prisma'].customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customerProfile) {
      throw new Error('Customer profile not found');
    }

    return this.returnsService.getCustomerReturns(customerProfile.id, filters);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin/create')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Create return request on behalf of customer',
    description: 'Allows admin to create a return request for a customer. Admin must provide the customer profile ID. This is useful for processing returns initiated through customer service channels.',
  })
  @ApiBody({
    type: CreateReturnDto,
    description: 'Return request details with additional customerProfileId field',
    examples: {
      example1: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          customerProfileId: '880e8400-e29b-41d4-a716-446655440003',
          returnType: 'full',
          reason: 'Quality complaint from customer',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Return request created successfully by admin',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      customerProfileId: '880e8400-e29b-41d4-a716-446655440003',
      status: 'pending',
      createdAt: '2026-04-13T10:30:00Z',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have ADMIN, SUPER_ADMIN, or ORDER_MANAGER role',
  })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid input data or missing customerProfileId' })
  async adminCreateReturn(@Body() dto: CreateReturnDto & { customerProfileId: string }) {
    const { customerProfileId, ...returnDto } = dto;
    return this.returnsService.createReturn(returnDto, customerProfileId);
  }

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Get all return requests across the platform',
    description: 'Retrieves all return requests in the system with advanced filtering, sorting, and pagination. Admins can filter by status, customer, delivery partner, date range, and order.',
  })
  @ApiQuery({
    name: 'orderId',
    type: String,
    required: false,
    description: 'Filter by specific order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'customerProfileId',
    type: String,
    required: false,
    description: 'Filter by customer profile ID',
    example: '880e8400-e29b-41d4-a716-446655440003',
  })
  @ApiQuery({
    name: 'deliveryPartnerId',
    type: String,
    required: false,
    description: 'Filter by assigned delivery partner ID',
    example: '990e8400-e29b-41d4-a716-446655440004',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'picked_up', 'received', 'inspecting', 'approved', 'rejected', 'refunded', 'cancelled'],
    required: false,
    description: 'Filter by return status',
    example: 'pending',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Filter returns created from this date onwards (ISO format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Filter returns created until this date (ISO format)',
    example: '2026-04-13',
  })
  @ApiQuery({
    name: 'page',
    type: String,
    required: false,
    description: 'Page number for pagination (starts from 1)',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    required: false,
    description: 'Number of items to return per page',
    example: '10',
  })
  @ApiOkResponse({
    description: 'List of all return requests retrieved successfully',
    example: {
      data: [
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          customerProfileId: '880e8400-e29b-41d4-a716-446655440003',
          status: 'pending',
          returnType: 'full',
          reason: 'Product not as described',
          deliveryPartnerId: null,
          createdAt: '2026-04-13T10:30:00Z',
          updatedAt: '2026-04-13T10:30:00Z',
        },
      ],
      total: 50,
      page: 1,
      limit: 10,
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have ADMIN, SUPER_ADMIN, or ORDER_MANAGER role',
  })
  async getAllReturns(@Query() filters: ReturnFilterDto) {
    return this.returnsService.getAllReturns(filters);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Update return request status',
    description: 'Updates the status of a return request and optionally sets the refund payment method. This endpoint is used to move a return through its lifecycle (pending → picked_up → received → inspecting → approved/rejected → refunded).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The return request ID to update',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: UpdateReturnStatusDto,
    description: 'Status update details including new status, payment method, and optional notes',
    examples: {
      pickedUp: {
        value: {
          status: 'picked_up',
          returnPaymentMethod: 'cash',
          adminNotes: 'Item picked up from customer address',
        },
      },
      approved: {
        value: {
          status: 'approved',
          returnPaymentMethod: 'online',
          adminNotes: 'Item quality verified - refund approved',
        },
      },
      rejected: {
        value: {
          status: 'rejected',
          returnPaymentMethod: null,
          adminNotes: 'Item condition does not match return claim',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Return status updated successfully',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      status: 'picked_up',
      returnPaymentMethod: 'cash',
      adminNotes: 'Item picked up from customer address',
      updatedAt: '2026-04-13T11:30:00Z',
      updatedBy: '550e8400-e29b-41d4-a716-446655440005',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have ADMIN, SUPER_ADMIN, or ORDER_MANAGER role',
  })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid status value or invalid state transition' })
  @ApiNotFoundResponse({ description: 'Not found - Return request with given ID does not exist' })
  async adminUpdateReturnStatus(
    @Param('id') returnId: string,
    @Body() dto: UpdateReturnStatusDto,
    @Request() req,
  ) {
    return this.returnsService.updateReturnStatus(
      returnId,
      dto,
      req.user.id || req.user.sub,
      req.user.role,
    );
  }

  @Post('admin/direct-return')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Process direct return and refund',
    description: 'Allows admin to directly process a return and issue a refund without going through the normal return workflow. The return charge equals the delivery charge and is NOT included in revenue. Stock is restored immediately.',
  })
  @ApiBody({
    type: CreateReturnDto,
    description: 'Direct return details with optional admin notes',
    examples: {
      example1: {
        value: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          returnType: 'full',
          reason: 'Exceptional case - quality issue',
          adminNotes: 'Approved direct refund due to manufacturer defect',
          items: [],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Direct return processed successfully and refund issued',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'refunded',
      refundAmount: 5999.99,
      returnCharge: 50.0,
      adminNotes: 'Approved direct refund due to manufacturer defect',
      refundedAt: '2026-04-13T11:45:00Z',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have ADMIN, SUPER_ADMIN, or ORDER_MANAGER role',
  })
  @ApiBadRequestResponse({
    description: 'Bad request - Invalid order data or order cannot be refunded',
  })
  @ApiNotFoundResponse({ description: 'Not found - Order does not exist' })
  async adminDirectReturn(
    @Body() dto: CreateReturnDto & { adminNotes?: string },
  ) {
    const { adminNotes, ...returnDto } = dto;
    return this.returnsService.adminDirectReturn(returnDto, adminNotes);
  }

  // ==================== DELIVERY PARTNER ENDPOINTS ====================

  @Get('delivery-partner/my-returns')
  @Roles('DELIVERY')
  @ApiOperation({
    summary: 'Get assigned return requests',
    description: 'Retrieves all return requests assigned to the authenticated delivery partner. Delivery partners can only see returns they are responsible for picking up or delivering.',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'picked_up', 'received', 'inspecting', 'approved', 'rejected', 'refunded', 'cancelled'],
    required: false,
    description: 'Filter by return status',
    example: 'pending',
  })
  @ApiQuery({
    name: 'orderId',
    type: String,
    required: false,
    description: 'Filter by order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'page',
    type: String,
    required: false,
    description: 'Page number for pagination',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    required: false,
    description: 'Number of items per page',
    example: '10',
  })
  @ApiOkResponse({
    description: 'List of assigned return requests retrieved successfully',
    example: {
      data: [
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          returnType: 'full',
          reason: 'Product not as described',
          assignedToDeliveryPartnerId: '110e8400-e29b-41d4-a716-446655440006',
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have DELIVERY role' })
  async getMyAssignedReturns(@Request() req, @Query() filters: ReturnFilterDto) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.returnsService.getDeliveryPartnerReturns(deliveryPartnerId, filters);
  }

  @Patch('delivery-partner/:id/status')
  @Roles('DELIVERY')
  @ApiOperation({
    summary: 'Update return status as delivery partner',
    description: 'Allows delivery partners to update the status of returns assigned to them. They can only update returns they are responsible for (e.g., marking items as picked up or received).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The return request ID assigned to this delivery partner',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @ApiBody({
    type: UpdateReturnStatusDto,
    description: 'Status update details including new status and optional notes',
    examples: {
      pickedUp: {
        value: {
          status: 'picked_up',
          returnPaymentMethod: 'cash',
          adminNotes: 'Items collected from customer',
        },
      },
      received: {
        value: {
          status: 'received',
          returnPaymentMethod: 'cash',
          adminNotes: 'Items delivered to warehouse',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Return status updated successfully by delivery partner',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      status: 'picked_up',
      adminNotes: 'Items collected from customer',
      updatedAt: '2026-04-13T12:15:00Z',
      updatedBy: '110e8400-e29b-41d4-a716-446655440006',
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have DELIVERY role or return is not assigned to them',
  })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid status or unauthorized status transition' })
  @ApiNotFoundResponse({ description: 'Not found - Return request not found or not assigned to delivery partner' })
  async deliveryPartnerUpdateReturnStatus(
    @Param('id') returnId: string,
    @Body() dto: UpdateReturnStatusDto,
    @Request() req,
  ) {
    return this.returnsService.updateReturnStatus(
      returnId,
      dto,
      req.user.id || req.user.sub,
      req.user.role,
    );
  }

  // ==================== SHARED ENDPOINTS ====================

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER', 'CUSTOMER', 'DELIVERY')
  @ApiOperation({
    summary: 'Get return request details',
    description: 'Retrieves detailed information about a specific return request. Customers can only view their own returns, delivery partners can only view assigned returns, and admins can view any return.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'The return request ID to retrieve',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @ApiOkResponse({
    description: 'Return request details retrieved successfully',
    example: {
      id: '770e8400-e29b-41d4-a716-446655440002',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      customerProfileId: '880e8400-e29b-41d4-a716-446655440003',
      status: 'pending',
      returnType: 'full',
      reason: 'Product not as described',
      items: [
        {
          orderItemId: '660e8400-e29b-41d4-a716-446655440001',
          productId: '770e8400-e29b-41d4-a716-446655440004',
          quantity: 1,
          reason: 'Quality issue',
        },
      ],
      deliveryPartnerId: null,
      // status: 'pending',
      createdAt: '2026-04-13T10:30:00Z',
      updatedAt: '2026-04-13T10:30:00Z',
      refundAmount: 5999.99,
      adminNotes: null,
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - You do not have permission to view this return (customer can only view own returns)',
  })
  @ApiNotFoundResponse({ description: 'Not found - Return request with given ID does not exist' })
  async getReturnById(@Param('id') returnId: string) {
    return this.returnsService.getReturnById(returnId);
  }
}
