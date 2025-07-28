import { Injectable } from 'nject-ts';
import { DatabaseService } from '../../core/services/database.service';
import { LoggerService } from '../../core/services/logger.service';
import { ConfigService } from '../../core/services/config.service';
import { FileEntity, FileUploadResult } from './interfaces/file.interface';
import { ValidationError, NotFoundError } from '../../core/middleware/error-handler.middleware';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

@Injectable()
export class FileService {
  private readonly collection = 'files';
  private uploadsPath: string;

  constructor(
    private databaseService: DatabaseService,
    private logger: LoggerService,
    private configService: ConfigService
  ) {
    this.uploadsPath = path.resolve(this.configService.get('uploadsPath'));
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
      this.logger.info(`Created uploads directory: ${this.uploadsPath}`);
    }
  }

  async uploadFile(fileData: Buffer, originalName: string, mimeType: string, uploadedBy?: string): Promise<FileUploadResult> {
    // Validate file type
    const allowedTypes = this.configService.get('allowedFileTypes');
    const fileExtension = path.extname(originalName).toLowerCase().substring(1);
    
    if (!allowedTypes.includes(fileExtension)) {
      throw new ValidationError(`File type '${fileExtension}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Validate file size
    const maxSize = this.configService.get('maxFileSize');
    if (fileData.length > maxSize) {
      throw new ValidationError(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const filename = `${timestamp}_${randomString}_${originalName}`;
    const filePath = path.join(this.uploadsPath, filename);

    try {
      // Write file to disk
      await writeFile(filePath, fileData);

      // Save file metadata to database
      const fileEntity = await this.databaseService.create<FileEntity>(this.collection, {
        originalName,
        filename,
        mimeType,
        size: fileData.length,
        path: filePath,
        uploadedBy,
      });

      this.logger.info(`File uploaded successfully: ${filename} (${fileData.length} bytes)`);

      return {
        file: fileEntity,
        url: `/api/files/${fileEntity.id}/download`
      };
    } catch (error) {
      // Clean up file if database save failed
      try {
        await unlink(filePath);
      } catch (unlinkError) {
        this.logger.warn(`Failed to clean up file after database error: ${filename}`, unlinkError);
      }
      
      this.logger.error(`File upload failed: ${originalName}`, error);
      throw error;
    }
  }

  async getFileById(id: string): Promise<FileEntity | null> {
    if (!id) {
      throw new ValidationError('File ID is required');
    }

    const file = await this.databaseService.findById<FileEntity>(this.collection, id);
    this.logger.debug(`Finding file by ID ${id}: ${file ? 'found' : 'not found'}`);
    return file;
  }

  async getFilesByUser(userId: string): Promise<FileEntity[]> {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    return await this.databaseService.findByQuery<FileEntity>(this.collection, { uploadedBy: userId });
  }

  async getAllFiles(): Promise<FileEntity[]> {
    return await this.databaseService.findAll<FileEntity>(this.collection);
  }

  async getFileBuffer(id: string): Promise<Buffer> {
    const file = await this.getFileById(id);
    if (!file) {
      throw new NotFoundError('File');
    }

    try {
      // Check if file exists on disk
      await access(file.path);
      const buffer = fs.readFileSync(file.path);
      this.logger.debug(`File buffer retrieved: ${file.filename} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to read file from disk: ${file.path}`, error);
      throw new NotFoundError('File not found on disk');
    }
  }

  async deleteFile(id: string, userId?: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError('File ID is required');
    }

    const file = await this.getFileById(id);
    if (!file) {
      throw new NotFoundError('File');
    }

    // Check if user has permission to delete (if userId provided)
    if (userId && file.uploadedBy && file.uploadedBy !== userId) {
      throw new ValidationError('You do not have permission to delete this file');
    }

    try {
      // Delete from database first
      const deleted = await this.databaseService.delete(this.collection, id);
      
      if (deleted) {
        // Delete file from disk
        try {
          await unlink(file.path);
          this.logger.info(`File deleted successfully: ${file.filename}`);
        } catch (fileError) {
          this.logger.warn(`File deleted from database but failed to delete from disk: ${file.path}`, fileError);
          // File was deleted from database, so we still return true
        }
      }

      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${id}`, error);
      throw error;
    }
  }

  async updateFileMetadata(id: string, updates: Partial<Pick<FileEntity, 'originalName'>>, userId?: string): Promise<FileEntity | null> {
    if (!id) {
      throw new ValidationError('File ID is required');
    }

    const existingFile = await this.getFileById(id);
    if (!existingFile) {
      throw new NotFoundError('File');
    }

    // Check if user has permission to update (if userId provided)
    if (userId && existingFile.uploadedBy && existingFile.uploadedBy !== userId) {
      throw new ValidationError('You do not have permission to update this file');
    }

    const updatedFile = await this.databaseService.update<FileEntity>(this.collection, id, updates);
    if (updatedFile) {
      this.logger.info(`File metadata updated: ${id}`);
    }

    return updatedFile;
  }

  async getFileStats(): Promise<{ totalFiles: number; totalSize: number; averageSize: number }> {
    const files = await this.getAllFiles();
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0;

    return {
      totalFiles,
      totalSize,
      averageSize
    };
  }
}