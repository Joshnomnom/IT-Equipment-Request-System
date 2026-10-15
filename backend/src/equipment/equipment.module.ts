import { Module } from '@nestjs/common';
import { AdminEquipmentController } from './admin-equipment.controller';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentController, AdminEquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
