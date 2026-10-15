import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentStatus, Prisma, RequestStatus } from '@prisma/client';
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

  /**
   * Approve = change status + deduct stock + write audit log, all in ONE
   * transaction. Any failure (including the audit log insert) rolls back all three.
   */
  async approve(adminId: number, id: number): Promise<AdminRequest> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the request row. Until we commit, a concurrent approve/reject
      //    or an employee editing the quantity has to wait for us, and then
      //    sees the request is no longer PENDING. We read the quantity only
      //    after taking the lock, so we deduct exactly what is being approved.
      const [request] = await tx.$queryRaw<LockedRequest[]>`
        SELECT id, status, quantity, equipment_id AS "equipmentId"
        FROM requisitions WHERE id = ${id} FOR UPDATE`;
      if (!request) throw new NotFoundException(`Request #${id} not found`);
      this.assertPending(request.status);

      // 2. Check and deduct stock in a single statement:
      //    UPDATE equipment SET stock = stock - qty
      //    WHERE id = ? AND status = 'ACTIVE' AND stock >= qty
      //    The row lock this takes means two approvals of the same item can't
      //    both read the old stock — the second re-checks against the new value.
      const { count } = await tx.equipment.updateMany({
        where: {
          id: request.equipmentId,
          status: EquipmentStatus.ACTIVE,
          stockQuantity: { gte: request.quantity },
        },
        data: { stockQuantity: { decrement: request.quantity } },
      });
      if (count === 0) {
        const equipment = await tx.equipment.findUniqueOrThrow({
          where: { id: request.equipmentId },
        });
        throw new BadRequestException(
          equipment.status !== EquipmentStatus.ACTIVE
            ? `${equipment.name} is inactive and cannot be issued. Reject this request instead.`
            : `Not enough stock: ${request.quantity} requested but only ${equipment.stockQuantity} ${equipment.name} left. Reject this request so the employee can submit a new one.`,
        );
      }

      // 3. Status, approval time and approver.
      const approved = await tx.requisition.update({
        where: { id },
        data: {
          status: RequestStatus.APPROVED,
          approvedAt: new Date(),
          reviewedById: adminId,
        },
        include: adminRequestInclude,
      });

      // 4. Audit log.
      await tx.auditLog.create({
        data: {
          userId: adminId,
          requestId: id,
          previousStatus: RequestStatus.PENDING,
          newStatus: RequestStatus.APPROVED,
        },
      });

      return approved;
    });
  }

  /** Reject = status + reason + audit log in one transaction. Stock is untouched. */
  async reject(
    adminId: number,
    id: number,
    rejectReason: string,
  ): Promise<AdminRequest> {
    return this.prisma.$transaction(async (tx) => {
      // Conditional update: only a PENDING request can be rejected, checked
      // and written in one statement so a concurrent approval can't slip in.
      const { count } = await tx.requisition.updateMany({
        where: { id, status: RequestStatus.PENDING },
        data: {
          status: RequestStatus.REJECTED,
          rejectReason,
          reviewedById: adminId,
        },
      });
      if (count === 0) {
        const existing = await tx.requisition.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!existing) throw new NotFoundException(`Request #${id} not found`);
        this.assertPending(existing.status);
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          requestId: id,
          previousStatus: RequestStatus.PENDING,
          newStatus: RequestStatus.REJECTED,
        },
      });

      return tx.requisition.findUniqueOrThrow({
        where: { id },
        include: adminRequestInclude,
      });
    });
  }

  async findAuditLogs(id: number): Promise<AuditLogEntry[]> {
    const exists = await this.prisma.requisition.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Request #${id} not found`);

    return this.prisma.auditLog.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  private assertPending(status: RequestStatus): void {
    if (status !== RequestStatus.PENDING) {
      throw new ConflictException(
        `This request has already been ${status.toLowerCase()}`,
      );
    }
  }
}

interface LockedRequest {
  id: number;
  status: RequestStatus;
  quantity: number;
  equipmentId: number;
}

export type AuditLogEntry = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; role: true } } };
}>;
