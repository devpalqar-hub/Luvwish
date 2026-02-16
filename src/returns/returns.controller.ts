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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnFilterDto } from './dto/return-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Returns & Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // ==================== CUSTOMER ENDPOINTS ====================

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Create a return request (Customer)' })
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
  @ApiOperation({ summary: 'Get my return requests (Customer)' })
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
  @ApiOperation({ summary: 'Create return request for customer (Admin)' })
  async adminCreateReturn(@Body() dto: CreateReturnDto & { customerProfileId: string }) {
    const { customerProfileId, ...returnDto } = dto;
    return this.returnsService.createReturn(returnDto, customerProfileId);
  }

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({ summary: 'Get all returns with filters (Admin)' })
  async getAllReturns(@Query() filters: ReturnFilterDto) {
    return this.returnsService.getAllReturns(filters);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiOperation({ summary: 'Update return status (Admin)' })
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

  // ==================== DELIVERY PARTNER ENDPOINTS ====================

  @Get('delivery-partner/my-returns')
  @Roles('DELIVERY')
  @ApiOperation({ summary: 'Get my assigned returns (Delivery Partner)' })
  async getMyAssignedReturns(@Request() req, @Query() filters: ReturnFilterDto) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.returnsService.getDeliveryPartnerReturns(deliveryPartnerId, filters);
  }

  @Patch('delivery-partner/:id/status')
  @Roles('DELIVERY')
  @ApiOperation({ summary: 'Update return status (Delivery Partner - only assigned returns)' })
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
  @ApiOperation({ summary: 'Get return details by ID' })
  async getReturnById(@Param('id') returnId: string) {
    return this.returnsService.getReturnById(returnId);
  }
}
