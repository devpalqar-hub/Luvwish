import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) { }

  async create(createAddressDto: CreateAddressDto, profile_id: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }
    return this.prisma.address.create({
      data: { ...createAddressDto, customerProfileId: profile.id },
    });
  }

  // ✅ GET ALL addresses of a profile
  async findAll(profile_id: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }
    return this.prisma.address.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ GET BY ID
  async findOne(profile_id: string, addressId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerProfileId: profile.id },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  // ✅ UPDATE
  // update method
  async update(profile_id: string, addressId: string, updateDto: UpdateAddressDto) {
    // fetch profile first
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }

    // ensure address belongs to the profile
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerProfileId: profile.id },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // remove customerProfileId if accidentally passed
    const { customerProfileId, ...data } = updateDto;

    return this.prisma.address.update({
      where: { id: addressId },
      data, // 👈 safe update (no foreign key overwrite)
    });
  }


  // ✅ DELETE
  async remove(profile_id: string, addressId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerProfileId: profile.id },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return this.prisma.address.delete({
      where: { id: addressId },
    });
  }
}
