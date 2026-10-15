import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRequestDto } from './create-request.dto';

/** An employee can change quantity and reason, but not which equipment. */
export class UpdateRequestDto extends PartialType(
  OmitType(CreateRequestDto, ['equipmentId'] as const),
) {}
