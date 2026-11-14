import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  var __salonPool: Pool | undefined;
}

function pool(): Pool {
  if (!globalThis.__salonPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    globalThis.__salonPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  }
  return globalThis.__salonPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function audit(actorId: string | null, action: string, entity: string, entityId: string | null, data?: unknown) {
  await query('INSERT INTO audit_log (actor_id, action, entity, entity_id, data) VALUES ($1,$2,$3,$4,$5)', [
    actorId, action, entity, entityId, data === undefined ? null : JSON.stringify(data),
  ]);
}
