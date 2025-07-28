import { Injectable } from 'nject-ts';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../core/services/database.service';
import { LoggerService } from '../../core/services/logger.service';
import { User, PublicUser } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ValidationError, NotFoundError } from '../../core/middleware/error-handler.middleware';

@Injectable()
export class UserService {
  private readonly collection = 'users';

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService
  ) {}

  async findAll(): Promise<PublicUser[]> {
    const users = await this.databaseService.findAll<User>(this.collection);
    return users.map(this.toPublicUser);
  }

  async findById(id: string): Promise<PublicUser | null> {
    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.databaseService.findById<User>(this.collection, id);
    if (!user) {
      return null;
    }

    return this.toPublicUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    return await this.databaseService.findOne<User>(this.collection, { email });
  }

  async findByUsername(username: string): Promise<User | null> {
    if (!username) {
      throw new ValidationError('Username is required');
    }

    return await this.databaseService.findOne<User>(this.collection, { username });
  }

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    // Check if user already exists
    const existingUserByEmail = await this.findByEmail(createUserDto.email);
    if (existingUserByEmail) {
      throw new ValidationError('User with this email already exists');
    }

    const existingUserByUsername = await this.findByUsername(createUserDto.username);
    if (existingUserByUsername) {
      throw new ValidationError('User with this username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user data
    const userData: Partial<User> = {
      email: createUserDto.email.toLowerCase(),
      username: createUserDto.username,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      passwordHash,
      isActive: true,
    };

    const user = await this.databaseService.create<User>(this.collection, userData);
    this.logger.info(`User created: ${user.id} (${user.email})`);

    return this.toPublicUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<PublicUser | null> {
    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const existingUser = await this.databaseService.findById<User>(this.collection, id);
    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Check for email conflicts (if email is being updated)
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailConflict = await this.findByEmail(updateUserDto.email);
      if (emailConflict && emailConflict.id !== id) {
        throw new ValidationError('User with this email already exists');
      }
    }

    // Check for username conflicts (if username is being updated)
    if (updateUserDto.username && updateUserDto.username !== existingUser.username) {
      const usernameConflict = await this.findByUsername(updateUserDto.username);
      if (usernameConflict && usernameConflict.id !== id) {
        throw new ValidationError('User with this username already exists');
      }
    }

    // Prepare update data
    const updateData: Partial<User> = {};
    
    // Copy only the fields that exist in User interface
    if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
    if (updateUserDto.username !== undefined) updateData.username = updateUserDto.username;
    if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;

    // Hash password if provided
    if (updateUserDto.password) {
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    // Normalize email
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }

    const updatedUser = await this.databaseService.update<User>(this.collection, id, updateData);
    if (!updatedUser) {
      throw new NotFoundError('User');
    }

    this.logger.info(`User updated: ${updatedUser.id} (${updatedUser.email})`);
    return this.toPublicUser(updatedUser);
  }

  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.databaseService.findById<User>(this.collection, id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const deleted = await this.databaseService.delete(this.collection, id);
    if (deleted) {
      this.logger.info(`User deleted: ${id} (${user.email})`);
    }

    return deleted;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.databaseService.update<User>(this.collection, id, {
      lastLogin: new Date(),
    });
  }

  private toPublicUser(user: User): PublicUser {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}