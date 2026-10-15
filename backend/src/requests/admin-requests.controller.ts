import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRequestsService } from './admin-requests.service';
import type {
  AdminRequest,
  AuditLogEntry,
  PaginatedRequests,
} from './admin-requests.service';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

@Roles(Role.ADMIN)
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly adminRequestsService: AdminRequestsService) {}

  @Get()
  findAll(@Query() query: ListRequestsQueryDto): Promise<PaginatedRequests> {
    return this.adminRequestsService.findAll(query);
  }

  @Patch(':id/approve')
  approve(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminRequest> {
    return this.adminRequestsService.approve(admin.id, id);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRequestDto,
  ): Promise<AdminRequest> {
    return this.adminRequestsService.reject(admin.id, id, dto.rejectReason);
  }

  @Get(':id/audit-logs')
  findAuditLogs(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditLogEntry[]> {
    return this.adminRequestsService.findAuditLogs(id);
  }
}
