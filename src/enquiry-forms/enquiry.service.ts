import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';
import { LeadStatus } from '@prisma/client';
import { buildLeadStatusChangeMessage } from 'src/common/utility/utils';
import { paginate } from 'src/common/utility/pagination.util';

@Injectable()
export class EnquiryService {
    constructor(private readonly prisma: PrismaService) { }

    // Public: Contact Form Submission
    async create(dto: CreateEnquiryDto) {
        return this.prisma.$transaction(async (tx) => {
            /**
             * 1. Create Enquiry
             */
            const enquiry = await tx.enquiryForm.create({
                data: dto,
            });

            /**
             * 2. Create Lead
             */
            const lead = await tx.leads.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    phone: dto.phone,
                    status: LeadStatus.NEW,
                    additionalNotes: dto.additionalNotes,
                },
            });

            /**
             * 3. Create Lead Log
             */
            const actionMessage = buildLeadStatusChangeMessage(
                null, // fromStatus → new lead
                lead.status,
            );

            await tx.leadLogs.create({
                data: {
                    leadId: lead.id,
                    action: actionMessage,
                    description: 'Lead created from enquiry submission',
                },
            });

            /**
             * 4. Return enquiry (or enrich if needed)
             */
            return enquiry;
        });
    }


    // Admin: List enquiries (paginated)
    async findAll(query: EnquiryQueryDto) {
        const {
            purpose,
            search,
            page = 1,
            limit = 10,
        } = query;

        return paginate({
            prismaModel: this.prisma.enquiryForm,
            page,
            limit,
            where: {
                purpose,
                OR: search
                    ? [
                        { name: { contains: search } },
                        { email: { contains: search } },
                        { phone: { contains: search } },
                    ]
                    : undefined,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }


    async findOne(id: string) {
        const enquiry = await this.prisma.enquiryForm.findUnique({
            where: { id },
        });

        if (!enquiry) {
            throw new NotFoundException('Enquiry not found');
        }

        return enquiry;
    }

    async update(id: string, dto: UpdateEnquiryDto) {
        await this.findOne(id); // existence check

        return this.prisma.enquiryForm.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.enquiryForm.delete({
            where: { id },
        });
    }
}
