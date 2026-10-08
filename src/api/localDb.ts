import { config } from '@/constants/config';
import { appStorage } from '@/lib/kvStorage';
import { delay, nowISO, uuid } from '@/lib/id';
import type { InsertRow, Row, TableMap, TableName, UpdateRow } from '@/types/models';
import type { Database, ListQuery } from './db';
import { buildSeed } from './seed';

/**
 * DEMO MODE database: a typed in-memory store persisted to AsyncStorage.
 * Both the customer and partner demo accounts share it, so the full two-sided
 * story can be demonstrated on one phone.
 */
const STORAGE_KEY = 'payanam.db.v1';

type Store = { [K in TableName]: Row<K>[] };

let store: Store | null = null;
let loading: Promise<Store> | null = null;
let persistQueue: Promise<void> = Promise.resolve();

async function load(): Promise<Store> {
  if (store) return store;
  if (!loading) {
    loading = (async () => {
      const saved = await appStorage.getJSON<Store>(STORAGE_KEY);
      const base = saved ?? ((await buildSeed()) as Store);
      // Make sure tables added in later versions exist.
      const empty = emptyStore();
      store = { ...empty, ...base };
      if (!saved) await persist();
      return store;
    })();
  }
  return loading;
}

function emptyStore(): Store {
  const tables: TableName[] = [
    'profiles', 'customer_profiles', 'rental_partners', 'addresses', 'bikes', 'bike_images',
    'bike_availability', 'documents', 'document_verifications', 'bookings', 'booking_events',
    'bike_inspections', 'inspection_images', 'face_verifications', 'rental_sessions', 'rental_usage',
    'damage_reports', 'notifications', 'reviews', 'payments', 'support_tickets',
  ];
  return Object.fromEntries(tables.map((t) => [t, []])) as unknown as Store;
}

function persist(): Promise<void> {
  persistQueue = persistQueue.then(() => appStorage.setJSON(STORAGE_KEY, store)).catch(() => undefined);
  return persistQueue;
}

const latency = () => delay(config.demo.latencyMs * (0.6 + Math.random() * 0.8));

function matches<T>(row: T, where?: Partial<T>): boolean {
  if (!where) return true;
  return (Object.keys(where) as (keyof T)[]).every((k) => row[k] === where[k]);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const localDb: Database & { reset(): Promise<void> } = {
  async list<K extends TableName>(table: K, query?: ListQuery<Row<K>>) {
    const s = await load();
    await latency();
    let rows = (s[table] as Row<K>[]).filter((r) => matches(r, query?.where));
    if (query?.in) {
      const { field, values } = query.in;
      rows = rows.filter((r) => values.includes(r[field] as unknown as string | number));
    }
    if (query?.orderBy) {
      const { field, ascending = true } = query.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = a[field] as unknown as string | number;
        const bv = b[field] as unknown as string | number;
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (ascending ? 1 : -1);
      });
    }
    if (query?.limit) rows = rows.slice(0, query.limit);
    return clone(rows);
  },

  async get<K extends TableName>(table: K, id: string) {
    const s = await load();
    await latency();
    const row = (s[table] as Row<K>[]).find((r) => r.id === id);
    return row ? clone(row) : null;
  },

  async insert<K extends TableName>(table: K, row: InsertRow<K>) {
    const s = await load();
    const ts = nowISO();
    const full = { ...row, id: row.id ?? uuid(), createdAt: ts, updatedAt: ts } as unknown as Row<K>;
    (s[table] as Row<K>[]).push(full);
    await persist();
    return clone(full);
  },

  async update<K extends TableName>(table: K, id: string, patch: UpdateRow<K>) {
    const s = await load();
    const rows = s[table] as Row<K>[];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`Record not found (${table}).`);
    rows[idx] = { ...rows[idx], ...patch, updatedAt: nowISO() } as Row<K>;
    await persist();
    return clone(rows[idx]);
  },

  async remove<K extends TableName>(table: K, id: string) {
    const s = await load();
    (s as unknown as Record<string, TableMap[K][]>)[table] = (s[table] as Row<K>[]).filter((r) => r.id !== id);
    await persist();
  },

  /** Restore the seeded demo dataset */
  async reset() {
    store = (await buildSeed()) as Store;
    loading = Promise.resolve(store);
    await persist();
  },
};
