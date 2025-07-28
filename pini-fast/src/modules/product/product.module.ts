import { Module } from 'nject-ts';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CoreModule } from '../../core/core.module';

@Module({
  imports: [CoreModule],
  providers: [ProductService, ProductController],
  exports: [ProductService, ProductController],
})
export class ProductModule {}