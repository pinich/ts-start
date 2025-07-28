import { Injectable } from 'nject-ts';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { ConfigService } from '../../core/services/config.service';
import { LoggerService } from '../../core/services/logger.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PublicUser } from '../user/interfaces/user.interface';
import { UnauthorizedError, ValidationError } from '../../core/middleware/error-handler.middleware';
import { JwtPayload } from '../../core/middleware/auth.middleware';

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private configService: ConfigService,
    private logger: LoggerService
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userService.findByEmail(email.toLowerCase());
    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.warn(`Login attempt with inactive account: ${email}`);
      throw new UnauthorizedError('Account is deactivated');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(user, password);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt with invalid password for: ${email}`);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate JWT token
    const accessToken = this.generateAccessToken(user);
    const publicUser = await this.userService.findById(user.id);

    this.logger.info(`User logged in successfully: ${user.email}`);

    return {
      user: publicUser!,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('jwtExpiresIn'),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Create user
    const newUser = await this.userService.create({
      email: registerDto.email,
      username: registerDto.username,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      password: registerDto.password,
    });

    // Generate JWT token
    const user = await this.userService.findByEmail(newUser.email);
    if (!user) {
      throw new Error('Failed to retrieve created user');
    }

    const accessToken = this.generateAccessToken(user);

    this.logger.info(`User registered and logged in: ${user.email}`);

    return {
      user: newUser,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('jwtExpiresIn'),
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const jwtSecret = this.configService.get('jwtSecret');
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      // Check if user still exists and is active
      const user = await this.userService.findByEmail(decoded.email);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid token');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      throw error;
    }
  }

  async refreshToken(oldToken: string): Promise<AuthResponse> {
    const decoded = await this.validateToken(oldToken);
    
    const user = await this.userService.findByEmail(decoded.email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const accessToken = this.generateAccessToken(user);
    const publicUser = await this.userService.findById(user.id);

    this.logger.info(`Token refreshed for user: ${user.email}`);

    return {
      user: publicUser!,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('jwtExpiresIn'),
    };
  }

  async logout(userId: string): Promise<void> {
    // In a real application, you might want to blacklist the token
    // For now, we'll just log the logout event
    const user = await this.userService.findById(userId);
    if (user) {
      this.logger.info(`User logged out: ${user.email}`);
    }
  }

  private generateAccessToken(user: any): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
    };

    const jwtSecret = this.configService.get('jwtSecret');
    const expiresIn = this.configService.get('jwtExpiresIn');

    const options: any = {
      expiresIn: expiresIn
    };

    return jwt.sign(payload, jwtSecret, options);
  }
}