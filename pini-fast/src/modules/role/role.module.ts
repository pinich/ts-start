import { Module } from 'nject-ts';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  providers: [RoleService, RoleController],
  exports: [RoleService],
})
export class RoleModule {}