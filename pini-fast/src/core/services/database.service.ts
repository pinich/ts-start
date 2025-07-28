import { Injectable } from 'nject-ts';
import sqlite3 from 'sqlite3';
import { IDatabaseService, BaseEntity } from '../interfaces/database.interface';

import { LoggerService } from './logger.service';
import { ConfigService } from './config.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DatabaseService implements IDatabaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor(
    private logger: LoggerService,
    private configService: ConfigService
  ) {
    this.dbPath = path.resolve(this.configService.get('databasePath'));
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Ensure the directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        this.logger.error('Failed to connect to SQLite database', err);
        throw err;
      }
      this.logger.info(`Connected to SQLite database at: ${this.dbPath}`);
    });

    this.createTables();
  }

  private createTables(): void {
    const tables = [
      {
        name: 'users',
        schema: `
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            passwordHash TEXT NOT NULL,
            isActive BOOLEAN DEFAULT 1,
            lastLogin TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `
      },
      {
        name: 'roles',
        schema: `
          CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `
      },
      {
        name: 'user_roles',
        schema: `
          CREATE TABLE IF NOT EXISTS user_roles (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            roleId TEXT NOT NULL,
            assignedAt TEXT NOT NULL,
            assignedBy TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (assignedBy) REFERENCES users(id),
            UNIQUE(userId, roleId)
          )
        `
      },
      {
        name: 'products',
        schema: `
          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            inStock BOOLEAN DEFAULT 1,
            stockQuantity INTEGER DEFAULT 0,
            imageUrl TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `
      },
      {
        name: 'files',
        schema: `
          CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            originalName TEXT NOT NULL,
            filename TEXT NOT NULL,
            mimeType TEXT NOT NULL,
            size INTEGER NOT NULL,
            path TEXT NOT NULL,
            uploadedBy TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            FOREIGN KEY (uploadedBy) REFERENCES users(id)
          )
        `
      }
    ];

    tables.forEach(table => {
      this.db.run(table.schema, (err) => {
        if (err) {
          this.logger.error(`Failed to create table ${table.name}`, err);
        } else {
          this.logger.debug(`Table ${table.name} created or verified`);
        }
      });
    });
  }

  async findAll<T extends BaseEntity>(collection: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM ${collection}`;
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          this.logger.error(`Error finding all in ${collection}`, err);
          reject(err);
          return;
        }
        
        const results = rows.map(row => this.deserializeRow(row));
        this.logger.debug(`Found ${results.length} items in collection: ${collection}`);
        resolve(results);
      });
    });
  }

  async findById<T extends BaseEntity>(collection: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM ${collection} WHERE id = ?`;
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          this.logger.error(`Error finding by ID ${id} in ${collection}`, err);
          reject(err);
          return;
        }
        
        const result = row ? this.deserializeRow(row) : null;
        this.logger.debug(`Finding by ID ${id} in collection ${collection}: ${result ? 'found' : 'not found'}`);
        resolve(result);
      });
    });
  }

  async findOne<T extends BaseEntity>(collection: string, query: Partial<T>): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(query);
      
      const sql = `SELECT * FROM ${collection} WHERE ${conditions} LIMIT 1`;
      this.db.get(sql, values, (err, row) => {
        if (err) {
          this.logger.error(`Error finding one in ${collection}`, err);
          reject(err);
          return;
        }
        
        const result = row ? this.deserializeRow(row) : null;
        this.logger.debug(`Found item matching query in collection: ${collection}`);
        resolve(result);
      });
    });
  }

  async findByQuery<T extends BaseEntity>(collection: string, query: Partial<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const conditions = Object.keys(query).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(query);
      
      const sql = `SELECT * FROM ${collection} WHERE ${conditions}`;
      this.db.all(sql, values, (err, rows) => {
        if (err) {
          this.logger.error(`Error finding by query in ${collection}`, err);
          reject(err);
          return;
        }
        
        const results = rows.map(row => this.deserializeRow(row));
        this.logger.debug(`Found ${results.length} items matching query in collection: ${collection}`);
        resolve(results);
      });
    });
  }

  async create<T extends BaseEntity>(collection: string, data: Partial<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const newItem = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const columns = Object.keys(newItem).join(', ');
      const placeholders = Object.keys(newItem).map(() => '?').join(', ');
      const values = Object.values(newItem).map(value => this.serializeValue(value));
      
      const sql = `INSERT INTO ${collection} (${columns}) VALUES (${placeholders})`;
      this.db.run(sql, values, (err: any) => {
        if (err) {
          this.logger.error(`Error creating item in ${collection}`, err);
          reject(err);
          return;
        }
        
        this.logger.info(`Created new item with ID ${id} in collection: ${collection}`);
        resolve(newItem as unknown as T);
      });
    });
  }

  async update<T extends BaseEntity>(collection: string, id: string, data: Partial<T>): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateData).map(value => this.serializeValue(value)), id];
      
      const sql = `UPDATE ${collection} SET ${setClause} WHERE id = ?`;
      this.db.run(sql, values, (err: any) => {
        if (err) {
          this.logger.error(`Error updating item with ID ${id} in ${collection}`, err);
          reject(err);
          return;
        }
        
        if ((this.db as any).changes === 0) {
          this.logger.warn(`Item with ID ${id} not found in collection: ${collection}`);
          resolve(null);
          return;
        }
        
        // Fetch the updated item
        this.findById<T>(collection, id).then(resolve).catch(reject);
      });
    });
  }

  async delete(collection: string, id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${collection} WHERE id = ?`;
      this.db.run(sql, [id], (err: any) => {
        if (err) {
          this.logger.error(`Error deleting item with ID ${id} from ${collection}`, err);
          reject(err);
          return;
        }
        
        const deleted = (this.db as any).changes > 0;
        if (deleted) {
          this.logger.info(`Deleted item with ID ${id} from collection: ${collection}`);
        } else {
          this.logger.warn(`Item with ID ${id} not found for deletion in collection: ${collection}`);
        }
        resolve(deleted);
      });
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private serializeValue(value: any): any {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  private deserializeRow(row: any): any {
    const result = { ...row };
    
    // Convert boolean fields back
    Object.keys(result).forEach(key => {
      if (key === 'isActive' || key === 'inStock') {
        result[key] = Boolean(result[key]);
      }
      // Convert date strings back to Date objects
      if (key === 'createdAt' || key === 'updatedAt' || key === 'lastLogin') {
        if (result[key]) {
          result[key] = new Date(result[key]);
        }
      }
    });
    
    return result;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          this.logger.error('Error closing database', err);
          reject(err);
          return;
        }
        this.logger.info('Database connection closed');
        resolve();
      });
    });
  }
}