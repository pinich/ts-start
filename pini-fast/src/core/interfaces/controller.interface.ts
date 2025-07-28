import { FastifyRequest, FastifyReply } from 'fastify';

export interface IController {
  registerRoutes(server: any): void;
}

export interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<any>;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RouteHandler;
  preHandler?: any[];
}