import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadLogDto } from './dto/create-lead-log.dto';
import { UpdateLeadLogDto } from './dto/update-lead-log.dto';
import { LeadLogFilterDto } from './dto/lead-log-filter.dto';
import { paginate } from 'src/common/utility/pagination.util';

@Injectable()
export class LeadLogsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateLeadLogDto) {
        await this.ensureLeadExists(dto.leadId);

        return this.prisma.leadLogs.create({
            data: dto,
        });
    }

    async findAll(filter: LeadLogFilterDto) {
        const {
            leadId,
            action,
            page = 1,
            limit = 10,
        } = filter;

        return paginate({
            prismaModel: this.prisma.leadLogs,
            page,
            limit,
            where: {
                leadId,
                action,
                deletedAt: null
            },
            include: { lead: true },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const log = await this.prisma.leadLogs.findUnique({
            where: { id },
            include: { lead: true },
        });

        if (!log) {
            throw new NotFoundException('Lead log not found');
        }

        return log;
    }

    async update(id: string, dto: UpdateLeadLogDto) {
        await this.ensureExists(id);

        return this.prisma.leadLogs.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.ensureExists(id);

        return this.prisma.leadLogs.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    /**
     * Internal helpers
     */

    private async ensureExists(id: string) {
        const exists = await this.prisma.leadLogs.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!exists) {
            throw new NotFoundException('Lead log not found');
        }
    }

    private async ensureLeadExists(leadId: string) {
        const lead = await this.prisma.leads.findUnique({
            where: { id: leadId },
            select: { id: true },
        });

        if (!lead) {
            throw new NotFoundException('Lead not found');
        }
    }
}
