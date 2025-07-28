import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../services/config.service';
import { UnauthorizedError } from './error-handler.middleware';

export interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: JwtPayload;
}

export function createAuthMiddleware(configService: ConfigService) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        throw new UnauthorizedError('Authorization header is required');
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        throw new UnauthorizedError('Token is required');
      }

      const jwtSecret = configService.get('jwtSecret');
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      request.user = decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      throw error;
    }
  };
}

export function createOptionalAuthMiddleware(configService: ConfigService) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return; // Optional auth, continue without user
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return; // Optional auth, continue without user
      }

      const jwtSecret = configService.get('jwtSecret');
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      request.user = decoded;
    } catch (error) {
      // For optional auth, we don't throw errors, just continue without user
      return;
    }
  };
}

export function requireAuth() {
  return (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }
  };
}

export function requireRoles(roles: string[]) {
  return (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // This is a simple role check - in a real app, you'd get roles from the database
    // For now, we'll assume admin users have email ending with @p.com
    const isAdmin = request.user.email.endsWith('@p.com');
    
    if (roles.includes('admin') && !isAdmin) {
      throw new UnauthorizedError('Admin access required');
    }
  };
}