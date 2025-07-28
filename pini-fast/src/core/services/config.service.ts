import { Injectable } from 'nject-ts';

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
      databasePath: process.env.DATABASE_PATH || '../persistent/database.sqlite',
      uploadsPath: process.env.UPLOADS_PATH || '../persistent/uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
      allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,txt').split(','),
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
    const requiredKeys: (keyof AppConfig)[] = ['port', 'host', 'jwtSecret', 'databasePath', 'uploadsPath'];
    
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

    return true;
  }
}