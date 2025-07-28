export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  stockQuantity: number;
  imageUrl?: string;
}

export function validateCreateProductDto(data: any): data is CreateProductDto {
  return (
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    typeof data.description === 'string' &&
    typeof data.price === 'number' &&
    typeof data.category === 'string' &&
    typeof data.sku === 'string' &&
    typeof data.stockQuantity === 'number' &&
    data.name.length > 0 &&
    data.price >= 0 &&
    data.stockQuantity >= 0 &&
    (data.imageUrl === undefined || typeof data.imageUrl === 'string')
  );
}