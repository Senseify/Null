import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isPGlite: boolean;
}

class PostgresClient implements DbClient {
  private pool: Pool;
  public readonly isPGlite = false;

  constructor(connectionString: string) {
    const isCloudPostgres = connectionString.includes('sslmode=') || (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));
    this.pool = new Pool({
      connectionString,
      ssl: isCloudPostgres ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.pool.on('error', (err) => {
      console.error('[Postgres Pool Error]', err);
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: DbClient = {
        isPGlite: false,
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const res = await client.query(sql, params);
          return {
            rows: res.rows as R[],
            rowCount: res.rowCount ?? res.rows.length,
          };
        },
        exec: async (sql: string): Promise<void> => {
          await client.query(sql);
        },
        transaction: async () => {
          throw new Error('Nested transactions are not supported directly');
        },
        close: async () => {},
      };
      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGlitePersistentClient implements DbClient {
  private pgliteInstance: any = null;
  private dataDir: string;
  public readonly isPGlite = true;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(process.cwd(), 'data', 'null_postgres');
  }

  private async getInstance() {
    if (!this.pgliteInstance) {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const { PGlite } = await import('@electric-sql/pglite');
      this.pgliteInstance = new PGlite(this.dataDir);
      await this.pgliteInstance.waitReady;
    }
    return this.pgliteInstance;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const db = await this.getInstance();
    const res = await db.query(sql, params);
    return {
      rows: (res.rows || []) as T[],
      rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
    };
  }

  async exec(sql: string): Promise<void> {
    const db = await this.getInstance();
    await db.exec(sql);
  }

  async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
    const db = await this.getInstance();
    return await db.transaction(async (tx: any) => {
      const txClient: DbClient = {
        isPGlite: true,
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const res = await tx.query(sql, params);
          return {
            rows: (res.rows || []) as R[],
            rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
          };
        },
        exec: async (sql: string): Promise<void> => {
          if (tx.exec) {
            await tx.exec(sql);
          } else {
            await tx.query(sql);
          }
        },
        transaction: async () => {
          throw new Error('Nested transactions are not supported');
        },
        close: async () => {},
      };
      return await fn(txClient);
    });
  }

  async close(): Promise<void> {
    if (this.pgliteInstance) {
      await this.pgliteInstance.close();
      this.pgliteInstance = null;
    }
  }
}

let dbInstance: DbClient | null = null;

export function getDatabaseClient(): DbClient {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    console.log('[Database] Connecting to PostgreSQL via DATABASE_URL');
    dbInstance = new PostgresClient(databaseUrl);
  } else {
    const dir = process.env.DATABASE_DIR?.trim() || path.resolve(process.cwd(), 'data', 'null_postgres');
    console.log(`[Database] Initializing persistent PostgreSQL database at: ${dir}`);
    dbInstance = new PGlitePersistentClient(dir);
  }

  return dbInstance;
}
