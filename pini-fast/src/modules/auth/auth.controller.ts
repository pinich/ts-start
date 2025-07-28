import { Injectable } from 'nject-ts';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IController } from '../../core/interfaces/controller.interface';
import { AuthService } from './auth.service';
import { LoginDto, validateLoginDto } from './dto/login.dto';
import { RegisterDto, validateRegisterDto } from './dto/register.dto';
import { SuccessResponse, ErrorResponse } from '../../core/dto/base-response.dto';
import { ValidationError } from '../../core/middleware/error-handler.middleware';
import { createAuthMiddleware, AuthenticatedRequest, requireAuth } from '../../core/middleware/auth.middleware';
import { ConfigService } from '../../core/services/config.service';
import { asyncHandler } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class AuthController implements IController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  registerRoutes(server: FastifyInstance): void {
    const authMiddleware = createAuthMiddleware(this.configService);

    // Public routes
    server.post('/api/auth/login', asyncHandler(this.login.bind(this)));
    server.post('/api/auth/register', asyncHandler(this.register.bind(this)));

    // Protected routes
    server.post('/api/auth/refresh', {
      preHandler: [authMiddleware]
    }, asyncHandler(this.refreshToken.bind(this)));

    server.post('/api/auth/logout', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.logout.bind(this)));

    // Profile route
    server.get('/api/auth/me', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.getProfile.bind(this)));
  }

  private async login(request: FastifyRequest, reply: FastifyReply) {
    if (!validateLoginDto(request.body as any)) {
      throw new ValidationError('Invalid login credentials provided');
    }

    const loginDto = request.body as LoginDto;
    const authResponse = await this.authService.login(loginDto);
    
    const response = new SuccessResponse(authResponse, 'Login successful');
    reply.send(response);
  }

  private async register(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!validateRegisterDto(request.body as any)) {
      throw new ValidationError('Invalid registration data provided');
    }

    const registerDto = request.body as RegisterDto;
    
    // Pass the requesting user ID if authenticated (for role assignment)
    const requestingUserId = request.user?.id;
    const authResponse = await this.authService.register(registerDto, requestingUserId);
    
    const response = new SuccessResponse(authResponse, 'Registration successful', 201);
    reply.status(201).send(response);
  }

  private async refreshToken(request: AuthenticatedRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      const response = new ErrorResponse('Authorization header required', 401);
      reply.status(401).send(response);
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const authResponse = await this.authService.refreshToken(token);
    
    const response = new SuccessResponse(authResponse, 'Token refreshed successfully');
    reply.send(response);
  }

  private async logout(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    
    await this.authService.logout(userId);
    
    const response = new SuccessResponse(null, 'Logout successful');
    reply.send(response);
  }

  private async getProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    const userEmail = request.user!.email;
    
    // In a real application, you might want to fetch fresh user data
    // For now, we'll return the user info from the token
    const response = new SuccessResponse(request.user, 'Profile retrieved successfully');
    reply.send(response);
  }
}