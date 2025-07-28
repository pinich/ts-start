export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  sku?: string;
  stockQuantity?: number;
  inStock?: boolean;
  imageUrl?: string;
}

export function validateUpdateProductDto(data: any): data is UpdateProductDto {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const hasValidFields = (
    (data.name === undefined || (typeof data.name === 'string' && data.name.length > 0)) &&
    (data.description === undefined || typeof data.description === 'string') &&
    (data.price === undefined || (typeof data.price === 'number' && data.price >= 0)) &&
    (data.category === undefined || typeof data.category === 'string') &&
    (data.sku === undefined || typeof data.sku === 'string') &&
    (data.stockQuantity === undefined || (typeof data.stockQuantity === 'number' && data.stockQuantity >= 0)) &&
    (data.inStock === undefined || typeof data.inStock === 'boolean') &&
    (data.imageUrl === undefined || typeof data.imageUrl === 'string')
  );

  return hasValidFields && Object.keys(data).length > 0;
}