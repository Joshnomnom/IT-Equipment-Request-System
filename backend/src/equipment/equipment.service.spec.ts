import { NotFoundException } from '@nestjs/common';
import { EquipmentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentService } from './equipment.service';

describe('EquipmentService', () => {
  const findMany = jest.fn();
  const update = jest.fn();
  const prisma = {
    equipment: { findMany, update },
  } as unknown as PrismaService;
  const service = new EquipmentService(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('shows employees only ACTIVE equipment', async () => {
    findMany.mockResolvedValue([]);
    await service.findAll(Role.EMPLOYEE);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: EquipmentStatus.ACTIVE } }),
    );
  });

  it('shows admins all equipment', async () => {
    findMany.mockResolvedValue([]);
    await service.findAll(Role.ADMIN);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('throws 404 when updating equipment that does not exist', async () => {
    update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(service.update(999, { stockQuantity: 5 })).rejects.toThrow(
      NotFoundException,
    );
  });
});
