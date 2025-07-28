import { Injectable } from 'nject-ts';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IController } from '../../core/interfaces/controller.interface';
import { UserService } from './user.service';
import { RoleService } from '../role/role.service';
import { CreateUserDto, validateCreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, validateUpdateUserDto } from './dto/update-user.dto';
import { SuccessResponse, ErrorResponse } from '../../core/dto/base-response.dto';
import { ValidationError } from '../../core/middleware/error-handler.middleware';
import { createAuthMiddleware, AuthenticatedRequest, requireAuth, requireRoles } from '../../core/middleware/auth.middleware';
import { ConfigService } from '../../core/services/config.service';
import { asyncHandler } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class UserController implements IController {
  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private configService: ConfigService
  ) {}

  registerRoutes(server: FastifyInstance): void {
    const authMiddleware = createAuthMiddleware(this.configService);

    // Public routes
    server.get('/api/users', asyncHandler(this.getUsers.bind(this)));
    server.get('/api/users/:id', asyncHandler(this.getUserById.bind(this)));

    // Protected routes (require authentication)
    server.post('/api/users', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.createUser.bind(this)));

    server.put('/api/users/:id', {
      preHandler: [authMiddleware]
    }, asyncHandler(this.updateUser.bind(this)));

    server.delete('/api/users/:id', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.deleteUser.bind(this)));

    // Profile routes (self-management)
    server.get('/api/users/me/profile', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.getProfile.bind(this)));

    server.put('/api/users/me/profile', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.updateProfile.bind(this)));
  }

  private async getUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.findAll();
    const response = new SuccessResponse(users, 'Users retrieved successfully');
    reply.send(response);
  }

  private async getUserById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    const user = await this.userService.findById(id);
    if (!user) {
      const response = new ErrorResponse('User not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(user, 'User retrieved successfully');
    reply.send(response);
  }

  private async createUser(request: FastifyRequest, reply: FastifyReply) {
    if (!validateCreateUserDto(request.body as any)) {
      throw new ValidationError('Invalid user data provided');
    }

    const user = await this.userService.create(request.body as CreateUserDto);
    const response = new SuccessResponse(user, 'User created successfully', 201);
    reply.status(201).send(response);
  }

  private async updateUser(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    // Users can only update their own profile, unless they're admin
    const hasAdminRole = await this.roleService.userHasRole(request.user!.id, 'admin');
    if (request.user?.id !== id && !hasAdminRole) {
      const response = new ErrorResponse('Forbidden: You can only update your own profile', 403);
      reply.status(403).send(response);
      return;
    }

    if (!validateUpdateUserDto(request.body as any)) {
      throw new ValidationError('Invalid update data provided');
    }

    const user = await this.userService.update(id, request.body as UpdateUserDto);
    if (!user) {
      const response = new ErrorResponse('User not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(user, 'User updated successfully');
    reply.send(response);
  }

  private async deleteUser(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    // Prevent users from deleting themselves
    if (request.user?.id === id) {
      const response = new ErrorResponse('You cannot delete your own account', 400);
      reply.status(400).send(response);
      return;
    }

    const deleted = await this.userService.delete(id);
    if (!deleted) {
      const response = new ErrorResponse('User not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(null, 'User deleted successfully');
    reply.send(response);
  }

  private async getProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const user = await this.userService.findById(userId);
    
    if (!user) {
      const response = new ErrorResponse('Profile not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(user, 'Profile retrieved successfully');
    reply.send(response);
  }

  private async updateProfile(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = request.user!.id;

    if (!validateUpdateUserDto(request.body as any)) {
      throw new ValidationError('Invalid profile data provided');
    }

    // Prevent regular users from changing their isActive status
    const updateData = { ...(request.body as UpdateUserDto) };
    const hasAdminRole = await this.roleService.userHasRole(request.user!.id, 'admin');
    if (!hasAdminRole) {
      delete updateData.isActive;
    }

    const user = await this.userService.update(userId, updateData);
    if (!user) {
      const response = new ErrorResponse('Profile not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(user, 'Profile updated successfully');
    reply.send(response);
  }
}