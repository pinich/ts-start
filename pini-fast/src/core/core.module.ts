import { Module } from 'nject-ts';
import { DatabaseService } from './services/database.service';
import { LoggerService } from './services/logger.service';
import { ConfigService } from './services/config.service';
import { DatabaseInitService } from './services/database-init.service';

@Module({
  providers: [
    LoggerService,
    ConfigService,
    DatabaseService,
    DatabaseInitService,
  ],
  exports: [
    LoggerService,
    ConfigService,
    DatabaseService,
    DatabaseInitService,
  ],
})
export class CoreModule {}