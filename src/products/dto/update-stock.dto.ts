import { IsInt, IsPositive, IsString, IsDefined } from 'class-validator';

export class UpdateStockDto {
    @IsDefined()
    @IsString()
    productId: string;

    @IsDefined()
    @IsInt()
    @IsPositive()
    quantity: number;
}
