import { getSupabase } from '@/lib/supabase';
import type { InsertRow, Row, TableName, UpdateRow } from '@/types/models';
import type { Database, ListQuery } from './db';

/**
 * Supabase implementation of the gateway. Columns are snake_case in Postgres,
 * camelCase in the app; conversion is shallow (jsonb columns keep their inner shape).
 */
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function mapKeys(obj: Record<string, unknown>, fn: (k: string) => string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), v]));
}

const fromDb = <T,>(row: Record<string, unknown>) => mapKeys(row, toCamel) as T;
const toDb = (row: object) => mapKeys(row as Record<string, unknown>, toSnake);

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const supabaseDb: Database = {
  async list<K extends TableName>(table: K, query?: ListQuery<Row<K>>) {
    let q = getSupabase().from(table).select('*');
    if (query?.where) q = q.match(toDb(query.where));
    if (query?.in) q = q.in(toSnake(query.in.field), query.in.values);
    if (query?.orderBy) q = q.order(toSnake(query.orderBy.field), { ascending: query.orderBy.ascending ?? true });
    if (query?.limit) q = q.limit(query.limit);
    const rows = check(await q) as Record<string, unknown>[];
    return rows.map((r) => fromDb<Row<K>>(r));
  },

  async get<K extends TableName>(table: K, id: string) {
    const row = check(await getSupabase().from(table).select('*').eq('id', id).maybeSingle());
    return row ? fromDb<Row<K>>(row as Record<string, unknown>) : null;
  },

  async insert<K extends TableName>(table: K, row: InsertRow<K>) {
    const res = check(await getSupabase().from(table).insert(toDb(row)).select('*').single());
    return fromDb<Row<K>>(res as unknown as Record<string, unknown>);
  },

  async update<K extends TableName>(table: K, id: string, patch: UpdateRow<K>) {
    const { updatedAt: _ignored, ...rest } = patch as Record<string, unknown>;
    const res = check(await getSupabase().from(table).update(toDb(rest)).eq('id', id).select('*').single());
    return fromDb<Row<K>>(res as unknown as Record<string, unknown>);
  },

  async remove<K extends TableName>(table: K, id: string) {
    check(await getSupabase().from(table).delete().eq('id', id));
  },
};
