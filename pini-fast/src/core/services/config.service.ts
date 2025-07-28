import { Injectable } from 'nject-ts';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  databasePath: string;
  uploadsPath: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  // Role system configuration
  defaultUserRole: string;
  enableAdminBootstrap: boolean;
  roleAssignmentAudit: boolean;
  bcryptSaltRounds: number;
  // Initial admin user configuration
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
}

@Injectable()
export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = {
      port: parseInt(process.env.PORT || '8088', 10),
      host: process.env.HOST || '0.0.0.0',
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      databasePath: process.env.DATABASE_PATH || './data/database.sqlite',
      uploadsPath: process.env.UPLOADS_PATH || './data/uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
      allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,txt').split(','),
      // Role system configuration
      defaultUserRole: process.env.DEFAULT_USER_ROLE || 'user',
      enableAdminBootstrap: process.env.ENABLE_ADMIN_BOOTSTRAP !== 'false',
      roleAssignmentAudit: process.env.ROLE_ASSIGNMENT_AUDIT !== 'false',
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
      // Initial admin user configuration
      adminEmail: process.env.ADMIN_EMAIL || 'admin@company.com',
      adminFirstName: process.env.ADMIN_FIRST_NAME || 'System',
      adminLastName: process.env.ADMIN_LAST_NAME || 'Administrator',
      adminPassword: process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!',
    };
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
  }

  validate(): boolean {
    const requiredKeys: (keyof AppConfig)[] = [
      'port', 'host', 'jwtSecret', 'databasePath', 'uploadsPath',
      'adminEmail', 'adminFirstName', 'adminLastName', 'adminPassword'
    ];
    
    for (const key of requiredKeys) {
      if (!this.config[key]) {
        throw new Error(`Missing required configuration: ${key}`);
      }
    }

    if (this.config.port < 1 || this.config.port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    if (this.config.maxFileSize < 1) {
      throw new Error('Max file size must be greater than 0');
    }

    if (this.config.bcryptSaltRounds < 4 || this.config.bcryptSaltRounds > 20) {
      throw new Error('Bcrypt salt rounds must be between 4 and 20');
    }

    // Validate admin email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.config.adminEmail)) {
      throw new Error('Admin email must be a valid email address');
    }

    // Validate admin password strength
    if (this.config.adminPassword.length < 8) {
      throw new Error('Admin password must be at least 8 characters long');
    }

    return true;
  }
}