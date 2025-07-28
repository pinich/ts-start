import { Injectable } from 'nject-ts';
import { DatabaseService } from '../../core/services/database.service';
import { LoggerService } from '../../core/services/logger.service';
import { ConfigService } from '../../core/services/config.service';
import { Role, UserRole, PublicRole, UserWithRoles, RoleAssignment } from './interfaces/role.interface';
import { User, PublicUser } from '../user/interfaces/user.interface';
import { ValidationError, NotFoundError } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class RoleService {
  private readonly rolesCollection = 'roles';
  private readonly userRolesCollection = 'user_roles';
  private readonly usersCollection = 'users';

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private configService: ConfigService
  ) {}

  async findAllRoles(): Promise<PublicRole[]> {
    const roles = await this.databaseService.findAll<Role>(this.rolesCollection);
    return roles.map(this.toPublicRole);
  }

  async findRoleById(id: string): Promise<PublicRole | null> {
    if (!id) {
      throw new ValidationError('Role ID is required');
    }

    const role = await this.databaseService.findById<Role>(this.rolesCollection, id);
    if (!role) {
      return null;
    }

    return this.toPublicRole(role);
  }

  async findRoleByName(name: string): Promise<Role | null> {
    if (!name) {
      throw new ValidationError('Role name is required');
    }

    return await this.databaseService.findOne<Role>(this.rolesCollection, { name });
  }

  async createRole(name: string, description: string): Promise<PublicRole> {
    // Check if role already exists
    const existingRole = await this.findRoleByName(name);
    if (existingRole) {
      throw new ValidationError(`Role with name '${name}' already exists`);
    }

    const roleData: Partial<Role> = {
      name: name.toLowerCase(),
      description,
    };

    const role = await this.databaseService.create<Role>(this.rolesCollection, roleData);
    this.logger.info(`Role created: ${role.name} (${role.id})`);

    return this.toPublicRole(role);
  }

  async updateRole(id: string, name?: string, description?: string): Promise<PublicRole | null> {
    if (!id) {
      throw new ValidationError('Role ID is required');
    }

    const existingRole = await this.databaseService.findById<Role>(this.rolesCollection, id);
    if (!existingRole) {
      throw new NotFoundError('Role');
    }

    // Check for name conflicts if name is being updated
    if (name && name !== existingRole.name) {
      const nameConflict = await this.findRoleByName(name);
      if (nameConflict && nameConflict.id !== id) {
        throw new ValidationError(`Role with name '${name}' already exists`);
      }
    }

    const updateData: Partial<Role> = {};
    if (name !== undefined) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description;

    const updatedRole = await this.databaseService.update<Role>(this.rolesCollection, id, updateData);
    if (!updatedRole) {
      throw new NotFoundError('Role');
    }

    this.logger.info(`Role updated: ${updatedRole.name} (${updatedRole.id})`);
    return this.toPublicRole(updatedRole);
  }

  async deleteRole(id: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError('Role ID is required');
    }

    const role = await this.databaseService.findById<Role>(this.rolesCollection, id);
    if (!role) {
      throw new NotFoundError('Role');
    }

    // Check if role is assigned to any users
    const userRoles = await this.databaseService.findByQuery<UserRole>(this.userRolesCollection, { roleId: id });
    if (userRoles.length > 0) {
      throw new ValidationError(`Cannot delete role '${role.name}' as it is assigned to ${userRoles.length} user(s)`);
    }

    const deleted = await this.databaseService.delete(this.rolesCollection, id);
    if (deleted) {
      this.logger.info(`Role deleted: ${role.name} (${id})`);
    }

    return deleted;
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<RoleAssignment> {
    if (!userId || !roleId || !assignedBy) {
      throw new ValidationError('User ID, Role ID, and Assigned By are required');
    }

    // Verify user exists
    const user = await this.databaseService.findById<User>(this.usersCollection, userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify role exists
    const role = await this.databaseService.findById<Role>(this.rolesCollection, roleId);
    if (!role) {
      throw new NotFoundError('Role');
    }

    // Verify assigner exists
    const assigner = await this.databaseService.findById<User>(this.usersCollection, assignedBy);
    if (!assigner) {
      throw new NotFoundError('Assigner user');
    }

    // Check if role is already assigned
    const existingAssignment = await this.databaseService.findOne<UserRole>(this.userRolesCollection, {
      userId,
      roleId
    });
    if (existingAssignment) {
      throw new ValidationError(`Role '${role.name}' is already assigned to this user`);
    }

    const userRoleData: Partial<UserRole> = {
      userId,
      roleId,
      assignedAt: new Date(),
      assignedBy,
    };

    const userRole = await this.databaseService.create<UserRole>(this.userRolesCollection, userRoleData);
    
    if (this.configService.get('roleAssignmentAudit')) {
      this.logger.info(`Role '${role.name}' assigned to user ${user.email} by ${assigner.email}`);
    }

    return {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      assignedAt: userRole.assignedAt,
      assignedBy: userRole.assignedBy,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      role: this.toPublicRole(role),
      assignedByUser: {
        id: assigner.id,
        email: assigner.email,
        firstName: assigner.firstName,
        lastName: assigner.lastName,
      }
    };
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    if (!userId || !roleId) {
      throw new ValidationError('User ID and Role ID are required');
    }

    const userRole = await this.databaseService.findOne<UserRole>(this.userRolesCollection, {
      userId,
      roleId
    });

    if (!userRole) {
      throw new NotFoundError('Role assignment');
    }

    const deleted = await this.databaseService.delete(this.userRolesCollection, userRole.id);
    
    if (deleted && this.configService.get('roleAssignmentAudit')) {
      const user = await this.databaseService.findById<User>(this.usersCollection, userId);
      const role = await this.databaseService.findById<Role>(this.rolesCollection, roleId);
      this.logger.info(`Role '${role?.name}' removed from user ${user?.email}`);
    }

    return deleted;
  }

  async getUserRoles(userId: string): Promise<PublicRole[]> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const userRoles = await this.databaseService.findByQuery<UserRole>(this.userRolesCollection, { userId });
    const roles: PublicRole[] = [];

    for (const userRole of userRoles) {
      const role = await this.databaseService.findById<Role>(this.rolesCollection, userRole.roleId);
      if (role) {
        roles.push(this.toPublicRole(role));
      }
    }

    return roles;
  }

  async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.databaseService.findById<User>(this.usersCollection, userId);
    if (!user) {
      return null;
    }

    const roles = await this.getUserRoles(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
    };
  }

  async getUsersByRole(roleId: string): Promise<PublicUser[]> {
    if (!roleId) {
      throw new ValidationError('Role ID is required');
    }

    const userRoles = await this.databaseService.findByQuery<UserRole>(this.userRolesCollection, { roleId });
    const users: PublicUser[] = [];

    for (const userRole of userRoles) {
      const user = await this.databaseService.findById<User>(this.usersCollection, userRole.userId);
      if (user) {
        const { passwordHash, ...publicUser } = user;
        users.push(publicUser);
      }
    }

    return users;
  }

  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    if (!userId || !roleName) {
      return false;
    }

    const role = await this.findRoleByName(roleName.toLowerCase());
    if (!role) {
      return false;
    }

    const userRole = await this.databaseService.findOne<UserRole>(this.userRolesCollection, {
      userId,
      roleId: role.id
    });

    return !!userRole;
  }

  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    if (!userId || !roleNames.length) {
      return false;
    }

    for (const roleName of roleNames) {
      if (await this.userHasRole(userId, roleName)) {
        return true;
      }
    }

    return false;
  }

  async initializeDefaultRoles(): Promise<void> {
    try {
      // Create default roles if they don't exist
      const defaultRoles = [
        { name: 'admin', description: 'Administrator with full system access' },
        { name: 'user', description: 'Regular user with basic access' },
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await this.findRoleByName(roleData.name);
        if (!existingRole) {
          await this.createRole(roleData.name, roleData.description);
        }
      }

      this.logger.info('Default roles initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default roles', error);
      throw error;
    }
  }

  private toPublicRole(role: Role): PublicRole {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}