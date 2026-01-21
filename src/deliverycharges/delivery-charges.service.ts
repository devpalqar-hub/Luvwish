import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryChargeDto } from './dto/create-delivery-charge.dto';
import { UpdateDeliveryChargeDto } from './dto/update-delivery-charge.dto';
import { paginate } from 'src/common/utility/pagination.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class DeliveryChargesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateDeliveryChargeDto) {
        const { postalCodes, deliveryCharge } = dto;

        const data = await this.prisma.deliveryCharges.createMany({
            data: postalCodes.map((postalCode) => ({
                postalCode,
                deliveryCharge,
            })),
            skipDuplicates: true, // optional but recommended
        });

        return { message: "Delivery Charges Added Successfully", data }
    }



    async findAll(params: {
        page?: number;
        limit?: number;
        postalCode?: string;
        deliveryCharge?: number;
    }) {
        const { page, limit, postalCode, deliveryCharge } = params;

        return paginate({
            prismaModel: this.prisma.deliveryCharges,
            page,
            limit,
            where: {
                ...(postalCode && {
                    postalCode: {
                        contains: postalCode
                    },
                }),
                ...(deliveryCharge !== undefined && {
                    deliveryCharge: {
                        equals: new Prisma.Decimal(deliveryCharge),
                    },
                }),
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(postalCode: string) {
        const charge = await this.prisma.deliveryCharges.findUnique({
            where: { postalCode },
        });

        if (!charge) {
            throw new NotFoundException('Delivery charge not found');
        }

        return charge;
    }

    async findByPostalCode(postalCode: string) {
        return this.prisma.deliveryCharges.findFirst({
            where: { postalCode },
        });
    }

    async update(postalCode: string, dto: UpdateDeliveryChargeDto) {
        await this.findOne(postalCode);

        return this.prisma.deliveryCharges.update({
            where: { postalCode: postalCode },
            data: {
                deliveryCharge: dto.deliveryCharge
            },
        });
    }

    async remove(postalCode: string) {
        await this.findOne(postalCode);

        return this.prisma.deliveryCharges.delete({
            where: { postalCode },
        });
    }
}
