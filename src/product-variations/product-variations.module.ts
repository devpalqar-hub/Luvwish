import { Module } from '@nestjs/common';
import { ProductVariationsService } from './product-variations.service';
import { ProductVariationsController } from './product-variations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductVariationsController],
  providers: [ProductVariationsService],
  exports: [ProductVariationsService],
})
export class ProductVariationsModule {}
