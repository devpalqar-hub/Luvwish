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

@Controller('delivery-charges')
export class DeliveryChargesController {
    constructor(
        private readonly deliveryChargesService: DeliveryChargesService,
    ) { }

    @Post()
    create(@Body() dto: CreateDeliveryChargeDto) {
        return this.deliveryChargesService.create(dto);
    }

    @Get()
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
    findOne(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.findOne(postalCode);
    }

    @Get('postal/:postalCode')
    findByPostalCode(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.findByPostalCode(postalCode);
    }

    @Patch(':postalCode')
    update(
        @Param('postalCode') postalCode: string,
        @Body() dto: UpdateDeliveryChargeDto,
    ) {
        return this.deliveryChargesService.update(postalCode, dto);
    }

    @Delete(':postalCode')
    remove(@Param('postalCode') postalCode: string) {
        return this.deliveryChargesService.remove(postalCode);
    }
}
