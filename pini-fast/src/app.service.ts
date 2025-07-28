import { fastify, FastifyInstance } from 'fastify';
import { Injectable } from "nject-ts";
import { LoggerService } from './core/services/logger.service';
import { ConfigService } from './core/services/config.service';
import { DatabaseInitService } from './core/services/database-init.service';
import { UserController } from './modules/user/user.controller';
import { AuthController } from './modules/auth/auth.controller';
import { RoleController } from './modules/role/role.controller';
import { ProductController } from './modules/product/product.controller';
import { FileController } from './modules/file/file.controller';
import { createErrorHandler } from './core/middleware/error-handler.middleware';

@Injectable()
export class AppService {
  private server: FastifyInstance;

  constructor(
    private logger: LoggerService,
    private configService: ConfigService,
    private databaseInitService: DatabaseInitService,
    private userController: UserController,
    private authController: AuthController,
    private roleController: RoleController,
    private productController: ProductController,
    private fileController: FileController
  ) {
    this.server = fastify({
      logger: false // We use our own logger
    });
    
    this.setupMiddleware();
    this.registerRoutes();
  }

  private setupMiddleware(): void {
    // Error handler
    this.server.setErrorHandler(createErrorHandler(this.logger));

    // Health check route
    this.server.get('/health', async (request, reply) => {
      reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.logger.info('Middleware configured');
  }

  private registerRoutes(): void {
    // Register all controller routes
    this.userController.registerRoutes(this.server);
    this.authController.registerRoutes(this.server);
    this.roleController.registerRoutes(this.server);
    this.productController.registerRoutes(this.server);
    this.fileController.registerRoutes(this.server);

    this.logger.info('All routes registered');
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      this.configService.validate();

      // Initialize database with roles and admin user
      await this.databaseInitService.initialize();

      const port = this.configService.get('port');
      const host = this.configService.get('host');

      await this.server.listen({ port, host });
      
      this.logger.info(`🚀 Server started successfully on http://${host}:${port}`);
      this.logger.info('Available routes:');
      this.server.printRoutes();
    } catch (error) {
      this.logger.error('Failed to start server', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Application is shutting down...");
    try {
      await this.server.close();
      this.logger.info("Application shut down successfully.");
    } catch (err) {
      this.logger.error("Error during shutdown:", err);
      throw err;
    }
  }

  getServer(): FastifyInstance {
    return this.server;
  }
}