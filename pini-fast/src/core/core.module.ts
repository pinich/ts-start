import { Module } from 'nject-ts';
import { DatabaseService } from './services/database.service';
import { LoggerService } from './services/logger.service';
import { ConfigService } from './services/config.service';

@Module({
  providers: [
    LoggerService,
    ConfigService,
    DatabaseService,
  ],
  exports: [
    LoggerService,
    ConfigService,
    DatabaseService,
  ],
})
export class CoreModule {}