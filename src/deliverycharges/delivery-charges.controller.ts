import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
} from '@nestjs/common';
import { DeliveryChargesService } from './delivery-charges.service';
import { CreateDeliveryChargeDto } from './dto/create-delivery-charge.dto';
import { UpdateDeliveryChargeDto } from './dto/update-delivery-charge.dto';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

@ApiTags('Delivery Charges')
@Controller('delivery-charges')
export class DeliveryChargesController {
    constructor(
        private readonly deliveryChargesService: DeliveryChargesService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create delivery charge rule' })
    @ApiBody({ type: CreateDeliveryChargeDto })
    @ApiOkResponse({ description: 'Delivery charge created successfully' })
    create(@Body() dto: CreateDeliveryChargeDto) {
        return this.deliveryChargesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List delivery charge rules with optional filters' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'postalCode', required: false })
    @ApiQuery({ name: 'deliveryCharge', required: false })
    @ApiOkResponse({ description: 'Delivery charges returned successfully' })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('postalCode') postalCode?: string,
        @Query('deliveryCharge') deliveryCharge?: string,
    ) {
        const parsedDeliveryCharge =
            deliveryCharge !== undefined && deliveryCharge !== ''
                ? Number(deliveryCharge)
                : undefined;

        return this.deliveryChargesService.findAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            postalCode,
            deliveryCharge:
                parsedDeliveryCharge !== undefined &&
                    !Number.isNaN(parsedDeliveryCharge)
                    ? parsedDeliveryCharge
                    : undefined,
        });
    }

    @Get(':postalCode')
    @ApiOperation({ summary: 'Get delivery charge by postal code' })
    @ApiParam({ name: 'postalCode', description: 'Postal code' })
    @ApiOkResponse({ description: 'Delivery charge returned successfully' })
    findOne(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.findOne(postalCode);
    }

    @Get('postal/:postalCode')
    @ApiOperation({ summary: 'Find delivery availability by postal code' })
    @ApiParam({ name: 'postalCode', description: 'Postal code' })
    @ApiOkResponse({ description: 'Postal delivery availability returned successfully' })
    findByPostalCode(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.findByPostalCode(postalCode);
    }

    @Patch(':postalCode')
    @ApiOperation({ summary: 'Update delivery charge by postal code' })
    @ApiParam({ name: 'postalCode', description: 'Postal code' })
    @ApiBody({ type: UpdateDeliveryChargeDto })
    @ApiOkResponse({ description: 'Delivery charge updated successfully' })
    update(
        @Param('postalCode') postalCode: string,
        @Body() dto: UpdateDeliveryChargeDto,
    ) {
        return this.deliveryChargesService.update(postalCode, dto);
    }

    @Delete(':postalCode')
    @ApiOperation({ summary: 'Delete delivery charge by postal code' })
    @ApiParam({ name: 'postalCode', description: 'Postal code' })
    @ApiOkResponse({ description: 'Delivery charge deleted successfully' })
    remove(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.remove(postalCode);
    }
}
