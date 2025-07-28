import { Injectable } from 'nject-ts';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IController } from '../../core/interfaces/controller.interface';
import { FileService } from './file.service';
import { SuccessResponse, ErrorResponse } from '../../core/dto/base-response.dto';
import { ValidationError } from '../../core/middleware/error-handler.middleware';
import { createAuthMiddleware, AuthenticatedRequest, requireAuth, requireRoles } from '../../core/middleware/auth.middleware';
import { ConfigService } from '../../core/services/config.service';
import { asyncHandler } from '../../core/middleware/error-handler.middleware';
import { RoleService } from '../role/role.service';

@Injectable()
export class FileController implements IController {
  constructor(
    private fileService: FileService,
    private roleService: RoleService,
    private configService: ConfigService
  ) {}

  registerRoutes(server: FastifyInstance): void {
    const authMiddleware = createAuthMiddleware(this.configService);

    // Register multipart support for file uploads
    server.register(require('@fastify/multipart'));

    // Public routes (with optional auth for tracking uploader)
    server.post('/api/files/upload', {
      preHandler: [authMiddleware]
    }, asyncHandler(this.uploadFile.bind(this)));

    server.get('/api/files/:id/download', asyncHandler(this.downloadFile.bind(this)));

    // Protected routes
    server.get('/api/files', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.getFiles.bind(this)));

    server.get('/api/files/:id', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.getFileById.bind(this)));

    server.put('/api/files/:id', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.updateFile.bind(this)));

    server.delete('/api/files/:id', {
      preHandler: [authMiddleware, requireAuth()]
    }, asyncHandler(this.deleteFile.bind(this)));

    // Admin routes
    server.get('/api/files/stats/overview', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.getFileStats.bind(this)));

    server.get('/api/files/admin/all', {
      preHandler: [authMiddleware, requireRoles(['admin'])]
    }, asyncHandler(this.getAllFiles.bind(this)));
  }

  private async uploadFile(request: AuthenticatedRequest, reply: FastifyReply) {
    try {
      const data = await (request as any).file();
      
      if (!data) {
        throw new ValidationError('No file provided');
      }

      const buffer = await data.toBuffer();
      const uploadedBy = request.user?.id;

      const result = await this.fileService.uploadFile(
        buffer,
        data.filename,
        data.mimetype,
        uploadedBy
      );

      const response = new SuccessResponse(result, 'File uploaded successfully', 201);
      reply.status(201).send(response);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('File upload failed');
    }
  }

  private async downloadFile(request: FastifyRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    
    try {
      const file = await this.fileService.getFileById(id);
      if (!file) {
        const response = new ErrorResponse('File not found', 404);
        reply.status(404).send(response);
        return;
      }

      const buffer = await this.fileService.getFileBuffer(id);
      
      reply
        .header('Content-Type', file.mimeType)
        .header('Content-Disposition', `attachment; filename="${file.originalName}"`)
        .header('Content-Length', file.size.toString())
        .send(buffer);
    } catch (error) {
      const response = new ErrorResponse('Failed to download file', 500);
      reply.status(500).send(response);
    }
  }

  private async getFiles(request: AuthenticatedRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const isAdmin = await this.roleService.userHasRole(request.user!.id, 'admin');
    
    let files;
    if (isAdmin) {
      files = await this.fileService.getAllFiles();
    } else {
      files = await this.fileService.getFilesByUser(userId);
    }

    const response = new SuccessResponse(files, 'Files retrieved successfully');
    reply.send(response);
  }

  private async getFileById(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    const userId = request.user!.id;
    const isAdmin = await this.roleService.userHasRole(request.user!.id, 'admin');
    
    const file = await this.fileService.getFileById(id);
    if (!file) {
      const response = new ErrorResponse('File not found', 404);
      reply.status(404).send(response);
      return;
    }

    // Check if user has permission to view this file
    if (!isAdmin && file.uploadedBy && file.uploadedBy !== userId) {
      const response = new ErrorResponse('Access denied', 403);
      reply.status(403).send(response);
      return;
    }

    const response = new SuccessResponse(file, 'File retrieved successfully');
    reply.send(response);
  }

  private async updateFile(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    const userId = request.user!.id;
    const body = request.body as any;
    
    if (!body.originalName || typeof body.originalName !== 'string') {
      throw new ValidationError('Original name is required and must be a string');
    }

    const updatedFile = await this.fileService.updateFileMetadata(
      id,
      { originalName: body.originalName },
      userId
    );

    if (!updatedFile) {
      const response = new ErrorResponse('File not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(updatedFile, 'File updated successfully');
    reply.send(response);
  }

  private async deleteFile(request: AuthenticatedRequest, reply: FastifyReply) {
    const { id } = (request.params as any);
    const userId = request.user!.id;
    const isAdmin = await this.roleService.userHasRole(request.user!.id, 'admin');
    
    const deleted = await this.fileService.deleteFile(id, isAdmin ? undefined : userId);
    
    if (!deleted) {
      const response = new ErrorResponse('File not found', 404);
      reply.status(404).send(response);
      return;
    }

    const response = new SuccessResponse(null, 'File deleted successfully');
    reply.send(response);
  }

  private async getFileStats(request: AuthenticatedRequest, reply: FastifyReply) {
    const stats = await this.fileService.getFileStats();
    const response = new SuccessResponse(stats, 'File statistics retrieved successfully');
    reply.send(response);
  }

  private async getAllFiles(request: AuthenticatedRequest, reply: FastifyReply) {
    const files = await this.fileService.getAllFiles();
    const response = new SuccessResponse(files, 'All files retrieved successfully');
    reply.send(response);
  }
}