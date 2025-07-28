import { Injectable } from 'nject-ts';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IController } from '../../core/interfaces/controller.interface';
import { RoleService } from './role.service';
import { SuccessResponse, ErrorResponse } from '../../core/dto/base-response.dto';
import { ValidationError } from '../../core/middleware/error-handler.middleware';
import { createAuthMiddleware, AuthenticatedRequest, requireAuth, requireRoles } from '../../core/middleware/auth.middleware';
import { ConfigService } from '../../core/services/config.service';
import { asyncHandler } from '../../core/middleware/error-handler.middleware';

interface CreateRoleRequest {
  name: string;
  description: string;
}

interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

interface RemoveRoleRequest {
  userId: string;
  roleId: string;
}

function validateCreateRoleRequest(data: any): data is CreateRoleRequest {
  return (
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    typeof data.description === 'string' &&
    data.name.length >= 2 &&
    data.description.length >= 5
  );
}

function validateUpdateRoleRequest(data: any): data is UpdateRoleRequest {
  return (
    typeof data === 'object' &&
    (data.name === undefined || (typeof data.name === 'string' && data.name.length >= 2)) &&
    (data.description === undefined || (typeof data.description === 'string' && data.description.length >= 5))
  );
}

function validateAssignRoleRequest(data: any): data is AssignRoleRequest {
  return (
    typeof data === 'object' &&
    typeof data.userId === 'string' &&
    typeof data.roleId === 'string' &&
    data.userId.length > 0 &&
    data.roleId.length > 0
  );
}

function validateRemoveRoleRequest(data: any): data is RemoveRoleRequest {
  return (
    typeof data === 'object' &&
    typeof data.userId === 'string' &&
    typeof data.roleId === 'string' &&
    data.userId.length > 0 &&
    data.roleId.length > 0
  );
}

@Injectable()
export class RoleController implements IController {
  constructor(
    private roleService: RoleService,
    private configService: ConfigService
  ) {}

  registerRoutes(server: FastifyInstance): void {
    const authMiddleware = createAuthMiddleware(this.configService);

    // Public routes (none for roles)

    // Admin-only role management routes
    server.get('/api/roles', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.getAllRoles.bind(this)));

    server.get('/api/roles/:id', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.getRoleById.bind(this)));

    server.post('/api/roles', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.createRole.bind(this)));

    server.put('/api/roles/:id', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.updateRole.bind(this)));

    server.delete('/api/roles/:id', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.deleteRole.bind(this)));

    // Role assignment routes
    server.post('/api/roles/assign', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.assignRole.bind(this)));

    server.post('/api/roles/remove', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.removeRole.bind(this)));

    // User role queries
    server.get('/api/users/:userId/roles', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.getUserRoles.bind(this)));

    server.get('/api/roles/:roleId/users', {
      preHandler: [authMiddleware, requireAuth(), requireRoles(['admin'])]
    }, asyncHandler(this.getUsersByRole.bind(this)));
  }

  private async getAllRoles(request: AuthenticatedRequest, reply: FastifyReply) {
    const roles = await this.roleService.findAllRoles();
    const response = new SuccessResponse(roles, 'Roles retrieved successfully');
    reply.send(response);
  }

  private async getRoleById(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    
    const role = await this.roleService.findRoleById(id);
    if (!role) {
      const response = new ErrorResponse('Role not found', 404);
      reply.status(404).send(response);
      return;
    }
    
    const response = new SuccessResponse(role, 'Role retrieved successfully');
    reply.send(response);
  }

  private async createRole(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!validateCreateRoleRequest(request.body)) {
      throw new ValidationError('Invalid role data provided');
    }

    const { name, description } = request.body as CreateRoleRequest;
    const role = await this.roleService.createRole(name, description);
    
    const response = new SuccessResponse(role, 'Role created successfully', 201);
    reply.status(201).send(response);
  }

  private async updateRole(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    
    if (!validateUpdateRoleRequest(request.body)) {
      throw new ValidationError('Invalid role update data provided');
    }

    const { name, description } = request.body as UpdateRoleRequest;
    const role = await this.roleService.updateRole(id, name, description);
    
    if (!role) {
      const response = new ErrorResponse('Role not found', 404);
      reply.status(404).send(response);
      return;
    }
    
    const response = new SuccessResponse(role, 'Role updated successfully');
    reply.send(response);
  }

  private async deleteRole(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    
    const deleted = await this.roleService.deleteRole(id);
    if (!deleted) {
      const response = new ErrorResponse('Role not found', 404);
      reply.status(404).send(response);
      return;
    }
    
    const response = new SuccessResponse(null, 'Role deleted successfully');
    reply.send(response);
  }

  private async assignRole(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!validateAssignRoleRequest(request.body)) {
      throw new ValidationError('Invalid role assignment data provided');
    }

    const { userId, roleId } = request.body as AssignRoleRequest;
    const assignedBy = request.user!.id;
    
    const assignment = await this.roleService.assignRoleToUser(userId, roleId, assignedBy);
    
    const response = new SuccessResponse(assignment, 'Role assigned successfully', 201);
    reply.status(201).send(response);
  }

  private async removeRole(request: AuthenticatedRequest, reply: FastifyReply) {
    if (!validateRemoveRoleRequest(request.body)) {
      throw new ValidationError('Invalid role removal data provided');
    }

    const { userId, roleId } = request.body as RemoveRoleRequest;
    
    const removed = await this.roleService.removeRoleFromUser(userId, roleId);
    if (!removed) {
      const response = new ErrorResponse('Role assignment not found', 404);
      reply.status(404).send(response);
      return;
    }
    
    const response = new SuccessResponse(null, 'Role removed successfully');
    reply.send(response);
  }

  private async getUserRoles(request: AuthenticatedRequest, reply: FastifyReply) {
    const { userId } = request.params as { userId: string };
    
    const userWithRoles = await this.roleService.getUserWithRoles(userId);
    if (!userWithRoles) {
      const response = new ErrorResponse('User not found', 404);
      reply.status(404).send(response);
      return;
    }
    
    const response = new SuccessResponse(userWithRoles, 'User roles retrieved successfully');
    reply.send(response);
  }

  private async getUsersByRole(request: AuthenticatedRequest, reply: FastifyReply) {
    const { roleId } = request.params as { roleId: string };
    
    const users = await this.roleService.getUsersByRole(roleId);
    
    const response = new SuccessResponse(users, 'Users with role retrieved successfully');
    reply.send(response);
  }
}