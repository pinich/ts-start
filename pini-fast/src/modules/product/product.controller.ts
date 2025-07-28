import { Injectable } from 'nject-ts';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IController } from '../../core/interfaces/controller.interface';
import { ProductService } from './product.service';
import { CreateProductDto, validateCreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, validateUpdateProductDto } from './dto/update-product.dto';
import { SuccessResponse, ErrorResponse } from '../../core/dto/base-response.dto';
import { ValidationError } from '../../core/middleware/error-handler.middleware';
import { createAuthMiddleware, AuthenticatedRequest, requireRoles } from '../../core/middleware/auth.middleware';
import { ConfigService } from '../../core/services/config.service';
import { asyncHandler } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class ProductController implements IController {
  constructor(
    private productService: ProductService,
    private configService: ConfigService
  ) {}

  registerRoutes(server: FastifyInstance): void {
    const authMiddleware = createAuthMiddleware(this.configService);

    // Public routes
    server.get('/api/products', asyncHandler(this.getProducts.bind(this)));
    server.get('/api/products/:id', asyncHandler(this.getProductById.bind(this)));
    server.get('/api/products/category/:category', asyncHandler(this.getProductsByCategory.bind(this)));
    server.get('/api/products/stock/available', asyncHandler(this.getInStockProducts.bind(this)));

    // Protected routes (admin only)
    server.post('/api/products', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.createProduct.bind(this)));

    server.put('/api/products/:id', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.updateProduct.bind(this)));

    server.delete('/api/products/:id', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.deleteProduct.bind(this)));

    server.patch('/api/products/:id/stock', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.updateStock.bind(this)));
  }

  private async getProducts(request: FastifyRequest, reply: FastifyReply) {
    const products = await this.productService.findAll();
    const response = new SuccessResponse(products, 'Products retrieved successfully');
    reply.send(response);
  }

  private async getProductById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    const product = await this.productService.findById(id);
    if (!product) {
      const response = new ErrorResponse('Product not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(product, 'Product retrieved successfully');
    reply.send(response);
  }

  private async getProductsByCategory(request: FastifyRequest, reply: FastifyReply) {
    const { category } = (request.params as any);
    
    const products = await this.productService.findByCategory(category);
    const response = new SuccessResponse(products, `Products in category '${category}' retrieved successfully`);
    reply.send(response);
  }

  private async getInStockProducts(request: FastifyRequest, reply: FastifyReply) {
    const products = await this.productService.findInStock();
    const response = new SuccessResponse(products, 'In-stock products retrieved successfully');
    reply.send(response);
  }

  private async createProduct(request: FastifyRequest, reply: FastifyReply) {
    if (!validateCreateProductDto(request.body as any)) {
      throw new ValidationError('Invalid product data provided');
    }

    const createProductDto = request.body as CreateProductDto;
    const product = await this.productService.create(createProductDto);
    
    const response = new SuccessResponse(product, 'Product created successfully', 201);
    reply.status(201).send(response);
  }

  private async updateProduct(request: FastifyRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    if (!validateUpdateProductDto(request.body as any)) {
      throw new ValidationError('Invalid update data provided');
    }

    const updateProductDto = request.body as UpdateProductDto;
    const product = await this.productService.update(id, updateProductDto);
    
    if (!product) {
      const response = new ErrorResponse('Product not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(product, 'Product updated successfully');
    reply.send(response);
  }

  private async deleteProduct(request: FastifyRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    const deleted = await this.productService.delete(id);
    if (!deleted) {
      const response = new ErrorResponse('Product not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(null, 'Product deleted successfully');
    reply.send(response);
  }

  private async updateStock(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    const body = request.body as any;
    
    if (!body || typeof body.quantity !== 'number' || body.quantity < 0) {
      throw new ValidationError('Valid quantity is required');
    }

    const product = await this.productService.updateStock(id, body.quantity);
    if (!product) {
      const response = new ErrorResponse('Product not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(product, 'Product stock updated successfully');
    reply.send(response);
  }
}