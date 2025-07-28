import { Injectable } from 'nject-ts';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

@Injectable()
export class LoggerService {
  private logLevel: LogLevel = LogLevel.INFO;

  constructor() {
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && envLogLevel in LogLevel) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }
  }

  debug(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  info(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  warn(message: string, context?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  error(message: string, error?: Error | any, context?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log('ERROR', message, context);
      if (error) {
        console.error('Error details:', error);
      }
    }
  }

  private log(level: string, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(logMessage, context || '');
        break;
      case 'INFO':
        console.info(logMessage, context || '');
        break;
      case 'WARN':
        console.warn(logMessage, context || '');
        break;
      case 'ERROR':
        console.error(logMessage, context || '');
        break;
      default:
        console.log(logMessage, context || '');
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}