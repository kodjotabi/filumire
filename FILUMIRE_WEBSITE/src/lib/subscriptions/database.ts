import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BillingError } from './plans';
export interface Sql {
    query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{
        rows: T[];
        rowCount?: number | null;
    }>;
}
export interface Database extends Sql {
    transaction<T>(run: (tx: Sql) => Promise<T>): Promise<T>;
}
/** Persistent local development store only. Never use a filesystem database on Vercel. */
export class LocalDatabase implements Database {
    private db: DatabaseSync;
    private queue: Promise<unknown> = Promise.resolve();
    constructor(path: string, schema: string) { this.db = new DatabaseSync(path); this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;'); this.db.exec(schema); }
    private async execute<T>(sql: string, values: unknown[] = []): Promise<{
        rows: T[];
        rowCount: number;
    }> {
        const args: (string | number | null | Uint8Array)[] = [];
        const statement = sql.replace(/ FOR UPDATE/g, '').replace(/\$(\d+)/g, (_, index) => { const value = values[Number(index) - 1]; args.push(value instanceof Date ? value.toISOString() : typeof value === 'boolean' ? Number(value) : value == null ? null : value as string | number); return '?'; }).replace(/now\(\)/g, "strftime('%Y-%m-%dT%H:%M:%fZ','now')");
        const prepared = this.db.prepare(statement);
        if (/^\s*(SELECT|WITH)/i.test(statement)) {
            const rows = prepared.all(...args).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === 'plan' && typeof value === 'string' ? JSON.parse(value) : key.endsWith('_at') && typeof value === 'string' ? new Date(value) : value]))) as T[];
            return { rows, rowCount: rows.length };
        }
        const result = prepared.run(...args);
        return { rows: [], rowCount: Number(result.changes) };
    }
    private enqueue<T>(run: () => Promise<T>): Promise<T> { const work = this.queue.then(run, run); this.queue = work.catch(() => { }); return work; }
    query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{
        rows: T[];
        rowCount: number;
    }> { return this.enqueue(() => this.execute<T>(sql, values)); }
    transaction<T>(run: (tx: Sql) => Promise<T>): Promise<T> { return this.enqueue(async () => { this.db.exec('BEGIN IMMEDIATE'); try {
        const value = await run({ query: <R>(sql: string, values?: unknown[]) => this.execute<R>(sql, values) });
        this.db.exec('COMMIT');
        return value;
    }
    catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
    } }); }
    async close() { await this.queue; this.db.close(); }
}
export function databaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean { return env.FILUMIRE_SUBSCRIPTIONS_ENABLED === 'true' && env.FILUMIRE_BILLING_STORAGE === 'sqlite-local' && env.VERCEL !== '1' && env.VERCEL_ENV !== 'production'; }
let database: LocalDatabase | undefined;
export function getDatabase(): Database {
    if (!databaseConfigured())
        throw new BillingError('configuration', 503);
    if (!database) {
        const folder = resolve(process.cwd(), '.data');
        mkdirSync(folder, { recursive: true });
        database = new LocalDatabase(resolve(folder, 'subscriptions.sqlite'), readFileSync(resolve(process.cwd(), 'src/lib/subscriptions/local-schema.sql'), 'utf8'));
    }
    return database;
}
