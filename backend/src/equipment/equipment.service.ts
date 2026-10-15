import { Injectable, NotFoundException } from '@nestjs/common';
import { Equipment, EquipmentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Employees only see ACTIVE items; admins see everything. */
  findAll(role: Role): Promise<Equipment[]> {
    return this.prisma.equipment.findMany({
      where: role === Role.ADMIN ? {} : { status: EquipmentStatus.ACTIVE },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  create(dto: CreateEquipmentDto): Promise<Equipment> {
    return this.prisma.equipment.create({ data: dto });
  }

  async update(id: number, dto: UpdateEquipmentDto): Promise<Equipment> {
    try {
      return await this.prisma.equipment.update({ where: { id }, data: dto });
    } catch (error) {
      // P2025: the record to update does not exist.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Equipment #${id} not found`);
      }
      throw error;
    }
  }
}
