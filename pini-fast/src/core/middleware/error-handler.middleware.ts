import { FastifyRequest, FastifyReply } from 'fastify';
import { LoggerService } from '../services/logger.service';
import { ErrorResponse } from '../dto/base-response.dto';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class HttpError extends Error implements AppError {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export function createErrorHandler(logger: LoggerService) {
  return async (error: AppError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    // Log error details
    if (statusCode >= 500) {
      logger.error(`${error.name}: ${message}`, error, {
        url: request.url,
        method: request.method,
        headers: request.headers,
        params: request.params,
        query: request.query,
      });
    } else {
      logger.warn(`${error.name}: ${message}`, {
        url: request.url,
        method: request.method,
        statusCode,
      });
    }

    // Send error response
    const errorResponse = new ErrorResponse(
      message,
      statusCode,
      statusCode >= 500 ? 'Internal Server Error' : message
    );

    reply.status(statusCode).send(errorResponse);
  };
}

export function asyncHandler<T extends any[]>(
  fn: (request: FastifyRequest, reply: FastifyReply, ...args: T) => Promise<any>
) {
  return (request: FastifyRequest, reply: FastifyReply, ...args: T) => {
    return Promise.resolve(fn(request, reply, ...args)).catch((error) => {
      // Forward error to Fastify's error handler
      reply.send(error);
    });
  };
}