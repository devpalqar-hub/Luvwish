import { IsEnum, IsOptional } from 'class-validator';

export enum SalesPeriod {
  LAST_DAY = 'last_day',
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month',
  LAST_YEAR = 'last_year',
}

export class SalesProgressQueryDto {
  @IsEnum(SalesPeriod)
  @IsOptional()
  period?: SalesPeriod = SalesPeriod.LAST_MONTH;
}
