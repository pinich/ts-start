import { BaseEntity } from '../../../core/interfaces/database.interface';

export interface Product extends BaseEntity {
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  inStock: boolean;
  stockQuantity: number;
  imageUrl?: string;
}