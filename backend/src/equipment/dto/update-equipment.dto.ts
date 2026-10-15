import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipmentDto } from './create-equipment.dto';

/** Same rules as create, but every field is optional. */
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}
