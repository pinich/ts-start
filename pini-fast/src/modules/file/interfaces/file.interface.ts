import { BaseEntity } from '../../../core/interfaces/database.interface';

export interface FileEntity extends BaseEntity {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy?: string;
}

export interface FileUploadResult {
  file: FileEntity;
  url: string;
}