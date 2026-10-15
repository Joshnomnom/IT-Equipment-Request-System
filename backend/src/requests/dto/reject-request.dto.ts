import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from './create-request.dto';

export class RejectRequestDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'rejectReason is required' })
  @MaxLength(500)
  rejectReason!: string;
}
