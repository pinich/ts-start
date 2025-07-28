import { Module } from 'nject-ts';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [FileService, FileController],
  exports: [FileService, FileController],
})
export class FileModule {}