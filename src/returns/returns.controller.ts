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
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
  ApiQuery,
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
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) { }

  // ==================== CUSTOMER ENDPOINTS ====================

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Create a return request',
    description: 'Customer can initiate a full or partial return for an order. System validates order status and items before creating the return request.',
  })
  @ApiBody({ type: CreateReturnDto })
  @ApiResponse({
    status: 201,
    description: 'Return request created successfully',
    schema: {
      example: {
        id: 'uuid-of-return',
        orderId: 'uuid-of-order',
        status: 'pending',
        returnType: 'full',
        reason: 'Product not as described',
        createdAt: '2026-02-16T10:30:00Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only customers can create returns' })
  @ApiBadRequestResponse({ description: 'Invalid return data or order not eligible for return' })
  @ApiNotFoundResponse({ description: 'Order or customer profile not found' })
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
    summary: 'Fetch all return requests of logged-in customer',
    description: 'Retrieve all returns made by the authenticated customer with optional filtering by status and date range.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'picked_up', 'received', 'inspecting', 'refunded', 'rejected'],
    description: 'Filter by return status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'string',
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'string',
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of customer returns',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            orderId: 'uuid',
            status: 'pending',
            reason: 'Defective',
            items: [],
            createdAt: '2026-02-16T10:30:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Customers can only view their own returns' })
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
    summary: 'Create return request for customer (Admin)',
    description: 'Admin can create a return request on behalf of a customer. Requires specifying the customer profile ID.',
  })
  @ApiBody({
    type: CreateReturnDto,
    description: 'Return creation details with additional customerProfileId field',
  })
  @ApiResponse({
    status: 201,
    description: 'Return created by admin successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or expired token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can create returns for customers' })
  @ApiBadRequestResponse({ description: 'Invalid return data' })
  async adminCreateReturn(@Body() dto: CreateReturnDto & { customerProfileId: string }) {
    const { customerProfileId, ...returnDto } = dto;
    return this.returnsService.createReturn(returnDto, customerProfileId);
  }

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Retrieve all returns with filters',
    description: 'Get all returns in the system with support for filtering by status, customer, delivery partner, and date range.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by return status' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'orderId', required: false, description: 'Filter by order ID' })
  @ApiQuery({ name: 'deliveryPartnerId', required: false, description: 'Filter by delivery partner ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'All returns with pagination',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async getAllReturns(@Query() filters: ReturnFilterDto) {
    return this.returnsService.getAllReturns(filters);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({
    summary: 'Update return status',
    description: 'Admin can update the status of a return request and specify the refund method. Triggers notifications to customer.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Return ID (UUID)',
  })
  @ApiBody({ type: UpdateReturnStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Return status updated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'Return not found' })
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
    summary: 'Process direct return and refund (Admin)',
    description: 'Admin directly returns items without customer request. Return charge equals delivery charge and is NOT included in revenue. Stock is restored immediately.',
  })
  @ApiBody({
    type: CreateReturnDto,
    description: 'Return details with optional adminNotes field',
  })
  @ApiResponse({
    status: 201,
    description: 'Direct return processed successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiBadRequestResponse({ description: 'Invalid return data or order not eligible' })
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
    summary: 'Get assigned returns for logistics partner',
    description: 'Delivery partner can view all return orders assigned to them for pickup and processing.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of assigned returns' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Delivery partner access required' })
  async getMyAssignedReturns(@Request() req, @Query() filters: ReturnFilterDto) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.returnsService.getDeliveryPartnerReturns(deliveryPartnerId, filters);
  }

  @Patch('delivery-partner/:id/status')
  @Roles('DELIVERY')
  @ApiOperation({
    summary: 'Update return status (Delivery Partner)',
    description: 'Delivery partner can only update status of returns assigned to them.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Return ID (UUID)' })
  @ApiBody({ type: UpdateReturnStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Can only update assigned returns' })
  @ApiNotFoundResponse({ description: 'Return not found' })
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
    summary: 'Get return details by ID',
    description: 'Retrieve detailed information about a specific return. Customers can only view their own returns.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Return ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Return details',
    schema: {
      example: {
        id: 'uuid',
        orderId: 'uuid',
        status: 'pending',
        returnType: 'full',
        reason: 'Defective',
        items: [],
        refundAmount: 999.99,
        createdAt: '2026-02-16T10:30:00Z',
        updatedAt: '2026-02-16T12:00:00Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Return not found' })
  @ApiForbiddenResponse({ description: 'Forbidden - No permission to view this return' })
  async getReturnById(@Param('id') returnId: string) {
    return this.returnsService.getReturnById(returnId);
  }
}

