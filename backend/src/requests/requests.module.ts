import { Module } from '@nestjs/common';
import { AdminRequestsController } from './admin-requests.controller';
import { AdminRequestsService } from './admin-requests.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  controllers: [RequestsController, AdminRequestsController],
  providers: [RequestsService, AdminRequestsService],
})
export class RequestsModule {}
