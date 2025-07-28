import { BaseEntity } from '../../../core/interfaces/database.interface';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
  lastLogin?: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}