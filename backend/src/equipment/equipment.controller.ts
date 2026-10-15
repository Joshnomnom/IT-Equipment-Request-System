import { Controller, Get } from '@nestjs/common';
import { Equipment } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Equipment[]> {
    return this.equipmentService.findAll(user.role);
  }
}
