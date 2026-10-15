import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRequestsService } from './admin-requests.service';
import type { PaginatedRequests } from './admin-requests.service';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';

@Roles(Role.ADMIN)
@Controller('admin/requests')
export class AdminRequestsController {
  constructor(private readonly adminRequestsService: AdminRequestsService) {}

  @Get()
  findAll(@Query() query: ListRequestsQueryDto): Promise<PaginatedRequests> {
    return this.adminRequestsService.findAll(query);
  }
}
