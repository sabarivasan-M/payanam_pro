import { config } from '@/constants/config';
import type { InsertRow, Row, TableName, UpdateRow } from '@/types/models';
import { localDb } from './localDb';
import { supabaseDb } from './supabaseDb';

/**
 * Database gateway — the ONLY layer that knows where data is stored.
 * Services depend on this interface, never on AsyncStorage or supabase-js directly.
 */
export interface ListQuery<T> {
  where?: Partial<T>;
  in?: { field: keyof T & string; values: (string | number)[] };
  orderBy?: { field: keyof T & string; ascending?: boolean };
  limit?: number;
}

export interface Database {
  list<K extends TableName>(table: K, query?: ListQuery<Row<K>>): Promise<Row<K>[]>;
  get<K extends TableName>(table: K, id: string): Promise<Row<K> | null>;
  insert<K extends TableName>(table: K, row: InsertRow<K>): Promise<Row<K>>;
  update<K extends TableName>(table: K, id: string, patch: UpdateRow<K>): Promise<Row<K>>;
  remove<K extends TableName>(table: K, id: string): Promise<void>;
}

export const db: Database = config.DEMO_MODE ? localDb : supabaseDb;

export async function getOrThrow<K extends TableName>(table: K, id: string): Promise<Row<K>> {
  const row = await db.get(table, id);
  if (!row) throw new Error(`Record not found (${table}).`);
  return row;
}
