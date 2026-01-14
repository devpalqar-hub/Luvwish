import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminCustomerFilterDto } from './dto/admin-customer-filter.dto';
import {
  AdminCustomerListResponseDto,
  AdminCustomerItemDto,
} from './dto/admin-customer-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async createCustomer(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'CUSTOMER', // enforce CUSTOMER
        CustomerProfile: {
          create: {}
        }
      },
      include: { CustomerProfile: true },
    });
    const { password: _, ...result } = user;

    const cart = await this.prisma.cartItem.create({
      data: {
        customerProfileId: user.CustomerProfile.id
      },
    });

    const wishlist = await this.prisma.wishlist.create({
      data: {
        customerProfileId: user.CustomerProfile.id,
      },
    });

    return result;
  }

  async createAdmin(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN', // enforce ADMIN
        AdminProfile: {
          create: {}
        }
      },
    });
    const { password: _, ...result } = user;
    return result;
  }

  //admin only
  async findAll(role?: string) {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      where: role ? { role: role as any } : {}, // filter by role if provided
      orderBy: { createdAt: 'desc' },
    });
  }

  //Customer only
  async CutomerProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        CustomerProfile: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            country: true,
            postalCode: true,
            phone: true,
            profilePicture: true,
            addresses: true,
            reviews: true,
            couponUsages: true,
            orders: true,
            cart: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  //Customer only
  async AdminProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        AdminProfile: {
          select: {
            name: true,
            profilePicture: true,
            notes: true,
            phone: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  //admin only
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        CustomerProfile: {
          select: {
            phone: true,
            profilePicture: true,
            addresses: true,
            reviews: true,
            couponUsages: true,
            orders: true,
            cart: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.CutomerProfile(id); // ensure user exists

    await this.prisma.user.delete({ where: { id } });

    return { message: `User with ID ${id} deleted successfully` };
  }


  async createCustomerProfile(
    userId: string,
    data: UpdateCustomerProfileDto,
    profilePicture?: Express.Multer.File,
  ) {
    const { name, phone, address, city, state, postalCode, country } = data;

    const profilepic = profilePicture ? profilePicture.path : '';

    return this.prisma.customerProfile.create({
      data: {
        user: { connect: { id: userId } },
        name: name || '',
        phone: phone || '',
        address: address || '',
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || '',
        profilePicture: profilepic || '',
      },
    });
  }

  async updateCustomerProfile(
    userId: string,
    data: UpdateCustomerProfileDto,
  ) {
    const { name, phone, address, city, state, postalCode, country, profilePicture } = data;



    // Ensure profile exists
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `CustomerProfile for user ${userId} not found`,
      );
    }

    return this.prisma.customerProfile.update({
      where: { userId },
      data: {
        name: name ?? profile.name,
        phone: phone ?? profile.phone,
        address: address ?? profile.address,
        city: city ?? profile.city,
        state: state ?? profile.state,
        postalCode: postalCode ?? profile.postalCode,
        country: country ?? profile.country,
        profilePicture: profilePicture ?? profile.profilePicture,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.password) {
      throw new BadRequestException('User has no password set');
    }
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return { message: 'Password changed successfully' };
  }

  // 🔹 Admin: Get all customers with order statistics
  async getAdminCustomers(
    query: AdminCustomerFilterDto,
  ): Promise<AdminCustomerListResponseDto> {
    const { search, fromDate, toDate, page = '1', limit = '10' } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      role: 'CUSTOMER',
    };

    // Date range filter for user creation
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Search by customer name or email
    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          CustomerProfile: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Fetch users with customer profiles
    const users = await this.prisma.user.findMany({
      where,
      include: {
        CustomerProfile: {
          include: {
            orders: {
              select: {
                totalAmount: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Transform data
    const data: AdminCustomerItemDto[] = users.map((user) => {
      const customerProfile = user.CustomerProfile;
      const orders = customerProfile?.orders || [];
      const numberOfOrders = orders.length;
      const totalAmountSpent = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );

      // Determine customer status (active if they have orders, otherwise inactive)
      const status = numberOfOrders > 0 ? 'active' : 'inactive';

      return {
        id: user.id,
        customerName: customerProfile?.name || null,
        email: user.email,
        phoneNumber: customerProfile?.phone || null,
        numberOfOrders,
        totalAmountSpent,
        joinedDate: user.createdAt,
        status,
      };
    });

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}

