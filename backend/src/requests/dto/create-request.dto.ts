import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRequestDto {
  @IsInt()
  @Min(1)
  equipmentId!: number;

  // Must be at least 1: zero or negative quantities are rejected here,
  // before the service even looks at stock.
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  @MaxLength(500)
  reason!: string;
}
