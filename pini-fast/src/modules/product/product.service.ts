import { Injectable } from 'nject-ts';
import { DatabaseService } from '../../core/services/database.service';
import { LoggerService } from '../../core/services/logger.service';
import { IBaseService } from '../../core/interfaces/base-service.interface';
import { Product } from './interfaces/product.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ValidationError, NotFoundError } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class ProductService implements IBaseService<Product> {
  private readonly collection = 'products';

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService
  ) {}

  async findAll(): Promise<Product[]> {
    const products = await this.databaseService.findAll<Product>(this.collection);
    this.logger.debug(`Found ${products.length} products`);
    return products;
  }

  async findById(id: string): Promise<Product | null> {
    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const product = await this.databaseService.findById<Product>(this.collection, id);
    this.logger.debug(`Finding product by ID ${id}: ${product ? 'found' : 'not found'}`);
    return product;
  }

  async findBySku(sku: string): Promise<Product | null> {
    if (!sku) {
      throw new ValidationError('SKU is required');
    }

    return await this.databaseService.findOne<Product>(this.collection, { sku });
  }

  async findByCategory(category: string): Promise<Product[]> {
    if (!category) {
      throw new ValidationError('Category is required');
    }

    return await this.databaseService.findByQuery<Product>(this.collection, { category });
  }

  async findInStock(): Promise<Product[]> {
    return await this.databaseService.findByQuery<Product>(this.collection, { inStock: true });
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check if product with same SKU already exists
    const existingProduct = await this.findBySku(createProductDto.sku);
    if (existingProduct) {
      throw new ValidationError('Product with this SKU already exists');
    }

    // Create product data
    const productData: Partial<Product> = {
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      category: createProductDto.category,
      sku: createProductDto.sku,
      stockQuantity: createProductDto.stockQuantity,
      inStock: createProductDto.stockQuantity > 0,
      imageUrl: createProductDto.imageUrl,
    };

    const product = await this.databaseService.create<Product>(this.collection, productData);
    this.logger.info(`Product created: ${product.id} (${product.name})`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product | null> {
    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const existingProduct = await this.databaseService.findById<Product>(this.collection, id);
    if (!existingProduct) {
      throw new NotFoundError('Product');
    }

    // Check for SKU conflicts (if SKU is being updated)
    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const skuConflict = await this.findBySku(updateProductDto.sku);
      if (skuConflict && skuConflict.id !== id) {
        throw new ValidationError('Product with this SKU already exists');
      }
    }

    // Prepare update data
    const updateData: Partial<Product> = { ...updateProductDto };

    // Auto-update inStock status based on stockQuantity
    if (updateData.stockQuantity !== undefined) {
      updateData.inStock = updateData.stockQuantity > 0;
    }

    const updatedProduct = await this.databaseService.update<Product>(this.collection, id, updateData);
    if (!updatedProduct) {
      throw new NotFoundError('Product');
    }

    this.logger.info(`Product updated: ${updatedProduct.id} (${updatedProduct.name})`);
    return updatedProduct;
  }

  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    const product = await this.databaseService.findById<Product>(this.collection, id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const deleted = await this.databaseService.delete(this.collection, id);
    if (deleted) {
      this.logger.info(`Product deleted: ${id} (${product.name})`);
    }

    return deleted;
  }

  async updateStock(id: string, quantity: number): Promise<Product | null> {
    if (quantity < 0) {
      throw new ValidationError('Stock quantity cannot be negative');
    }

    return await this.update(id, {
      stockQuantity: quantity,
      inStock: quantity > 0
    });
  }

  async reduceStock(id: string, amount: number): Promise<Product | null> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const newQuantity = Math.max(0, product.stockQuantity - amount);
    return await this.updateStock(id, newQuantity);
  }
}