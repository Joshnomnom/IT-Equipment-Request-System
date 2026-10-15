import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Equipment, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentService } from './equipment.service';

// No DELETE on purpose: equipment is referenced by past requests and audit
// logs, so admins retire an item by setting status to INACTIVE instead.
@Roles(Role.ADMIN)
@Controller('admin/equipment')
export class AdminEquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  create(@Body() dto: CreateEquipmentDto): Promise<Equipment> {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    return this.equipmentService.update(id, dto);
  }
}
