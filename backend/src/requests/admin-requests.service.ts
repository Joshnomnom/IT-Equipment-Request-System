import { Injectable } from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';

const adminRequestInclude = {
  user: { select: { id: true, name: true, email: true } },
  equipment: {
    select: {
      id: true,
      name: true,
      category: true,
      stockQuantity: true,
      status: true,
    },
  },
  reviewedBy: { select: { id: true, name: true } },
} satisfies Prisma.RequisitionInclude;

export type AdminRequest = Prisma.RequisitionGetPayload<{
  include: typeof adminRequestInclude;
}>;

export interface PaginatedRequests {
  data: AdminRequest[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  /** Per-status totals for the current search, ignoring the status filter (for tab badges). */
  counts: Record<RequestStatus, number>;
}

@Injectable()
export class AdminRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListRequestsQueryDto): Promise<PaginatedRequests> {
    const { status, search, page, limit } = query;

    const searchWhere: Prisma.RequisitionWhereInput = search
      ? {
          OR: [
            { equipment: { name: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};
    const where: Prisma.RequisitionWhereInput = {
      ...searchWhere,
      ...(status && { status }),
    };

    const countByStatus = (s: RequestStatus) =>
      this.prisma.requisition.count({ where: { ...searchWhere, status: s } });

    // REPEATABLE READ: every query below sees the same snapshot, so the
    // total, the page rows and the tab counts always agree with each other.
    const [total, data, pending, approved, rejected] =
      await this.prisma.$transaction(
        [
          this.prisma.requisition.count({ where }),
          this.prisma.requisition.findMany({
            where,
            include: adminRequestInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
          }),
          countByStatus(RequestStatus.PENDING),
          countByStatus(RequestStatus.APPROVED),
          countByStatus(RequestStatus.REJECTED),
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );

    const counts = { PENDING: pending, APPROVED: approved, REJECTED: rejected };

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }
}
