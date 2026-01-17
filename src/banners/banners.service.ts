import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) { }

  async create(
    createBannerDto: CreateBannerDto,
    imageUrl: string,
  ) {
    if (!imageUrl) {
      throw new BadRequestException('Banner image is required');
    }

    return this.prisma.banner.create({
      data: {
        image: imageUrl,
        title: createBannerDto.title,
        link: createBannerDto.link,
      },
    });
  }

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return banner;
  }

  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
    imageUrl?: string,
  ) {
    await this.findOne(id); // Ensure banner exists

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...updateBannerDto,
        ...(imageUrl && { image: imageUrl }),
      },
    });
  }


  async remove(id: string) {
    await this.findOne(id); // Ensure exists

    return this.prisma.banner.delete({
      where: { id },
    });
  }
}
