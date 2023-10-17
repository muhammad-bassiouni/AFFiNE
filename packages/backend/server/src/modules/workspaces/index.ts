import { Module } from '@nestjs/common';

import { DocModule } from '../doc';
import { QuotaModule } from '../quota';
import { UsersService } from '../users';
import { WorkspacesController } from './controller';
import { PermissionService } from './permission';
import { WorkspaceResolver } from './resolver';

@Module({
  imports: [DocModule.forFeature(), QuotaModule],
  controllers: [WorkspacesController],
  providers: [WorkspaceResolver, PermissionService, UsersService],
  exports: [PermissionService],
})
export class WorkspaceModule {}
export { InvitationType, WorkspaceType } from './resolver';
