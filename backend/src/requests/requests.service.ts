import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Equipment,
  EquipmentStatus,
  Prisma,
  RequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';

/** Fields returned to the employee for each of their requests. */
const requestWithEquipment = {
  include: {
    equipment: {
      select: {
        id: true,
        name: true,
        category: true,
        stockQuantity: true,
        status: true,
      },
    },
  },
} satisfies Prisma.RequisitionDefaultArgs;

export type RequestWithEquipment = Prisma.RequisitionGetPayload<
  typeof requestWithEquipment
>;

const DUPLICATE_PENDING_MESSAGE =
  'You already have a pending request for this equipment. Edit that request instead.';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    dto: CreateRequestDto,
  ): Promise<RequestWithEquipment> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: dto.equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException(`Equipment #${dto.equipmentId} not found`);
    }
    this.assertRequestable(equipment, dto.quantity);

    const pending = await this.prisma.requisition.findFirst({
      where: {
        userId,
        equipmentId: dto.equipmentId,
        status: RequestStatus.PENDING,
      },
      select: { id: true },
    });
    if (pending) this.throwDuplicate(pending.id);

    try {
      // Status defaults to PENDING. Stock is NOT deducted here — only on approval.
      return await this.prisma.requisition.create({
        data: { ...dto, userId },
        ...requestWithEquipment,
      });
    } catch (error) {
      // P2002: unique violation from the partial index — a second request
      // slipped in between our check above and this insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.throwDuplicate();
      }
      throw error;
    }
  }

  findMine(userId: number): Promise<RequestWithEquipment[]> {
    return this.prisma.requisition.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...requestWithEquipment,
    });
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateRequestDto,
  ): Promise<RequestWithEquipment> {
    const request = await this.prisma.requisition.findUnique({
      where: { id },
      include: { equipment: true },
    });
    // Someone else's request is reported as "not found" so ids can't be probed.
    if (!request || request.userId !== userId) {
      throw new NotFoundException(`Request #${id} not found`);
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        `This request is already ${request.status.toLowerCase()} and can no longer be edited`,
      );
    }
    if (dto.quantity !== undefined) {
      this.assertRequestable(request.equipment, dto.quantity);
    }

    // Conditional update: only succeeds if the request is still PENDING at the
    // moment of writing, so an admin approving it concurrently can't be overwritten.
    const { count } = await this.prisma.requisition.updateMany({
      where: { id, userId, status: RequestStatus.PENDING },
      data: dto,
    });
    if (count === 0) {
      throw new ConflictException(
        'This request was just processed and can no longer be edited',
      );
    }
    return this.prisma.requisition.findUniqueOrThrow({
      where: { id },
      ...requestWithEquipment,
    });
  }

  /** Employees may only request ACTIVE equipment, and not more than is in stock. */
  private assertRequestable(equipment: Equipment, quantity: number): void {
    if (equipment.status !== EquipmentStatus.ACTIVE) {
      throw new BadRequestException(
        `${equipment.name} is not available for request`,
      );
    }
    if (equipment.stockQuantity <= 0) {
      throw new BadRequestException(`${equipment.name} is out of stock`);
    }
    if (quantity > equipment.stockQuantity) {
      throw new BadRequestException(
        `Only ${equipment.stockQuantity} ${equipment.name} left in stock`,
      );
    }
  }

  private throwDuplicate(existingRequestId?: number): never {
    throw new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: DUPLICATE_PENDING_MESSAGE,
      existingRequestId,
    });
  }
}
