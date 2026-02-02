import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { buildLeadStatusChangeMessage } from 'src/common/utility/utils';
import { paginate } from 'src/common/utility/pagination.util';

@Injectable()
export class LeadsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateLeadDto) {
        return this.prisma.leads.create({
            data: dto,
        });
    }

    async findAll(filter: LeadFilterDto) {
        const { search, status, page = 1, limit = 10 } = filter;

        const where = {
            status,
            deletedAt: null,
            OR: search
                ? [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                ]
                : undefined,
        };

        return paginate({
            prismaModel: this.prisma.leads,
            page,
            limit,
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }


    async findOne(id: string) {
        const lead = await this.prisma.leads.findUnique({
            where: { id },
            include: { logs: true },
        });

        if (!lead) {
            throw new NotFoundException('Lead not found');
        }

        return lead;
    }

    async update(id: string, dto: UpdateLeadDto) {
        return this.prisma.$transaction(async (tx) => {
            /**
             * 1. Fetch current lead state
             */
            const existingLead = await tx.leads.findUnique({
                where: { id },
            });

            if (!existingLead) {
                throw new NotFoundException('Lead not found');
            }

            /**
             * 2. Update lead
             */
            const updatedLead = await tx.leads.update({
                where: { id },
                data: dto,
            });

            /**
             * 3. Build lead log message
             */
            const actionMessage = buildLeadStatusChangeMessage(
                existingLead.status,
                updatedLead.status,
            );

            /**
             * 4. Create lead log
             */
            await tx.leadLogs.create({
                data: {
                    leadId: updatedLead.id,
                    action: actionMessage,
                    description: 'Lead updated',
                },
            });

            return updatedLead;
        });
    }

    async remove(id: string) {
        return this.prisma.$transaction(async (tx) => {
            /**
             * 1. Fetch existing lead
             */
            const existingLead = await tx.leads.findUnique({
                where: { id },
            });

            if (!existingLead) {
                throw new NotFoundException('Lead not found');
            }

            /**
             * 2. Create lead log BEFORE deletion
             * (logs will be cascade-deleted if created after delete)
             */
            await tx.leadLogs.create({
                data: {
                    leadId: existingLead.id,
                    action: 'Lead has been deleted',
                    description: 'Lead removed from the system',

                },
            });

            /**
             * 3. Delete lead
             */
            return tx.leads.update({
                where: { id },
                data: { deletedAt: new Date() }
            });
        });
    }


    private async ensureExists(id: string) {
        const exists = await this.prisma.leads.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!exists) {
            throw new NotFoundException('Lead not found');
        }
    }
}
