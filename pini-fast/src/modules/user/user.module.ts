import { Module } from 'nject-ts';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [UserService, UserController],
  exports: [UserService, UserController],
})
export class UserModule {}