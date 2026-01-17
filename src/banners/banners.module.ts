import { Module } from '@nestjs/common';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  providers: [BannersService],
  controllers: [BannersController]
})
export class BannersModule { }
