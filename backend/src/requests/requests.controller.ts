import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestsService } from './requests.service';
import type { RequestWithEquipment } from './requests.service';

// Only employees create and manage their own requests; admins review them
// through /admin/requests instead.
@Roles(Role.EMPLOYEE)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRequestDto,
  ): Promise<RequestWithEquipment> {
    return this.requestsService.create(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser): Promise<RequestWithEquipment[]> {
    return this.requestsService.findMine(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestDto,
  ): Promise<RequestWithEquipment> {
    return this.requestsService.update(user.id, id, dto);
  }
}
