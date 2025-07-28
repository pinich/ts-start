import { Module } from 'nject-ts';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [CoreModule, UserModule],
  providers: [AuthService, AuthController],
  exports: [AuthService, AuthController],
})
export class AuthModule {}