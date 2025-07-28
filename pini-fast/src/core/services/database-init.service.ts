import { Injectable } from 'nject-ts';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { RoleService } from '../../modules/role/role.service';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class DatabaseInitService {
  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private logger: LoggerService,
    private roleService: RoleService,
    private userService: UserService
  ) {}

  async initialize(): Promise<void> {
    try {
      this.logger.info('Starting database initialization...');

      // Wait a bit to ensure database tables are created
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initialize default roles
      await this.initializeRoles();

      // Initialize admin user if enabled
      if (this.configService.get('enableAdminBootstrap')) {
        await this.initializeAdminUser();
      }

      this.logger.info('Database initialization completed successfully');
    } catch (error) {
      this.logger.error('Database initialization failed', error);
      throw error;
    }
  }

  private async initializeRoles(): Promise<void> {
    try {
      this.logger.info('Initializing default roles...');

      const defaultRoles = [
        { name: 'admin', description: 'Administrator with full system access' },
        { name: 'user', description: 'Regular user with basic access' },
        { name: 'moderator', description: 'Moderator with limited administrative access' },
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await this.roleService.findRoleByName(roleData.name);
        if (!existingRole) {
          await this.roleService.createRole(roleData.name, roleData.description);
          this.logger.info(`Created default role: ${roleData.name}`);
        } else {
          this.logger.debug(`Role already exists: ${roleData.name}`);
        }
      }

      this.logger.info('Default roles initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize default roles', error);
      throw error;
    }
  }

  private async initializeAdminUser(): Promise<void> {
    try {
      this.logger.info('Checking for admin user initialization...');

      const adminEmail = this.configService.get('adminEmail');
      const adminFirstName = this.configService.get('adminFirstName');
      const adminLastName = this.configService.get('adminLastName');
      const adminPassword = this.configService.get('adminPassword');

      // Check if admin user already exists
      const existingAdmin = await this.userService.findByEmail(adminEmail);
      if (existingAdmin) {
        this.logger.info(`Admin user already exists: ${adminEmail}`);
        
        // Ensure admin user has admin role
        const hasAdminRole = await this.roleService.userHasRole(existingAdmin.id, 'admin');
        if (!hasAdminRole) {
          const adminRole = await this.roleService.findRoleByName('admin');
          if (adminRole) {
            await this.roleService.assignRoleToUser(existingAdmin.id, adminRole.id, existingAdmin.id);
            this.logger.info(`Assigned admin role to existing user: ${adminEmail}`);
          }
        }
        return;
      }

      // Create admin user
      this.logger.info('Creating initial admin user...');
      const adminUser = await this.userService.create({
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        password: adminPassword,
      });

      // Assign admin role
      const adminRole = await this.roleService.findRoleByName('admin');
      if (adminRole) {
        await this.roleService.assignRoleToUser(adminUser.id, adminRole.id, adminUser.id);
        this.logger.info(`Created admin user and assigned admin role: ${adminEmail}`);
      } else {
        this.logger.error('Admin role not found during admin user initialization');
        throw new Error('Admin role not found');
      }

      // Security warning for production
      if (this.configService.get('nodeEnv') === 'production') {
        this.logger.warn('SECURITY WARNING: Default admin user created in production. Please change the admin password immediately!');
      }

    } catch (error) {
      this.logger.error('Failed to initialize admin user', error);
      throw error;
    }
  }

  async checkAdminExists(): Promise<boolean> {
    try {
      // Check if any user has admin role
      const adminRole = await this.roleService.findRoleByName('admin');
      if (!adminRole) {
        return false;
      }

      const adminUsers = await this.roleService.getUsersByRole(adminRole.id);
      return adminUsers.length > 0;
    } catch (error) {
      this.logger.error('Failed to check admin existence', error);
      return false;
    }
  }

  async createEmergencyAdmin(email: string, password: string): Promise<void> {
    try {
      this.logger.warn('Creating emergency admin user...');

      // Check if user already exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create emergency admin user
      const adminUser = await this.userService.create({
        email,
        firstName: 'Emergency',
        lastName: 'Admin',
        password,
      });

      // Assign admin role
      const adminRole = await this.roleService.findRoleByName('admin');
      if (adminRole) {
        await this.roleService.assignRoleToUser(adminUser.id, adminRole.id, adminUser.id);
        this.logger.warn(`Emergency admin user created: ${email}`);
      } else {
        throw new Error('Admin role not found');
      }

    } catch (error) {
      this.logger.error('Failed to create emergency admin user', error);
      throw error;
    }
  }
}