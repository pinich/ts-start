import { BaseEntity } from '../../../core/interfaces/database.interface';

export interface Role extends BaseEntity {
  name: string;
  description: string;
}

export interface UserRole extends BaseEntity {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface PublicRole {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoles {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles: PublicRole[];
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  role?: PublicRole;
  assignedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}