import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Equipment,
  EquipmentStatus,
  Prisma,
  RequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

describe('RequestsService', () => {
  const prisma = {
    equipment: { findUnique: jest.fn() },
    requisition: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new RequestsService(prisma as unknown as PrismaService);

  const monitor: Equipment = {
    id: 1,
    name: 'Monitor',
    category: 'Monitor',
    stockQuantity: 5,
    status: EquipmentStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const dto = { equipmentId: 1, quantity: 2, reason: 'New desk' };

  beforeEach(() => jest.resetAllMocks());

  describe('create', () => {
    it('creates a PENDING request without touching stock', async () => {
      prisma.equipment.findUnique.mockResolvedValue(monitor);
      prisma.requisition.findFirst.mockResolvedValue(null);
      prisma.requisition.create.mockResolvedValue({ id: 10 });

      await service.create(7, dto);

      expect(prisma.requisition.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...dto, userId: 7 } }),
      );
    });

    it('404s for unknown equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);
      await expect(service.create(7, dto)).rejects.toThrow(NotFoundException);
    });

    it.each([
      ['INACTIVE equipment', { status: EquipmentStatus.INACTIVE }],
      ['out of stock', { stockQuantity: 0 }],
      ['more than in stock', { stockQuantity: 1 }],
    ])('rejects %s', async (_label, override) => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...monitor,
        ...override,
      });
      await expect(service.create(7, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.requisition.create).not.toHaveBeenCalled();
    });

    it('409s when a PENDING request for the same equipment exists', async () => {
      prisma.equipment.findUnique.mockResolvedValue(monitor);
      prisma.requisition.findFirst.mockResolvedValue({ id: 3 });
      await expect(service.create(7, dto)).rejects.toThrow(ConflictException);
      expect(prisma.requisition.create).not.toHaveBeenCalled();
    });

    it('409s when the DB unique index catches a concurrent duplicate', async () => {
      prisma.equipment.findUnique.mockResolvedValue(monitor);
      prisma.requisition.findFirst.mockResolvedValue(null);
      prisma.requisition.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(service.create(7, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const pendingRequest = {
      id: 3,
      userId: 7,
      status: RequestStatus.PENDING,
      equipment: monitor,
    };

    it("404s for another user's request", async () => {
      prisma.requisition.findUnique.mockResolvedValue({
        ...pendingRequest,
        userId: 99,
      });
      await expect(service.update(7, 3, { quantity: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('409s when the request is no longer PENDING', async () => {
      prisma.requisition.findUnique.mockResolvedValue({
        ...pendingRequest,
        status: RequestStatus.APPROVED,
      });
      await expect(service.update(7, 3, { quantity: 1 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects a new quantity above stock', async () => {
      prisma.requisition.findUnique.mockResolvedValue(pendingRequest);
      await expect(service.update(7, 3, { quantity: 6 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('409s if an admin processed it between the check and the write', async () => {
      prisma.requisition.findUnique.mockResolvedValue(pendingRequest);
      prisma.requisition.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.update(7, 3, { quantity: 1 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('updates a PENDING request', async () => {
      prisma.requisition.findUnique.mockResolvedValue(pendingRequest);
      prisma.requisition.updateMany.mockResolvedValue({ count: 1 });
      prisma.requisition.findUniqueOrThrow.mockResolvedValue(pendingRequest);

      await service.update(7, 3, { quantity: 4, reason: 'Two screens' });

      expect(prisma.requisition.updateMany).toHaveBeenCalledWith({
        where: { id: 3, userId: 7, status: RequestStatus.PENDING },
        data: { quantity: 4, reason: 'Two screens' },
      });
    });
  });
});
