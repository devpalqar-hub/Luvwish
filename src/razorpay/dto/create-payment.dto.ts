import { IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderDto {
    @IsNumber()
    Amount: number;
}

class IntegrationUrlsDto {
    @IsString()
    Redirection: string;
}

export class CreatePaymentDto {
    @IsString()
    PaymentMethod: 'CARD';

    @ValidateNested()
    @Type(() => OrderDto)
    Order: OrderDto;

    @ValidateNested()
    @Type(() => IntegrationUrlsDto)
    IntegrationUrls: IntegrationUrlsDto;
}
