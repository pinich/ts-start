export interface IDatabaseService {
  findAll<T extends BaseEntity>(collection: string): Promise<T[]>;
  findById<T extends BaseEntity>(collection: string, id: string): Promise<T | null>;
  findOne<T extends BaseEntity>(collection: string, query: Partial<T>): Promise<T | null>;
  create<T extends BaseEntity>(collection: string, data: Partial<T>): Promise<T>;
  update<T extends BaseEntity>(collection: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(collection: string, id: string): Promise<boolean>;
  findByQuery<T extends BaseEntity>(collection: string, query: Partial<T>): Promise<T[]>;
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}