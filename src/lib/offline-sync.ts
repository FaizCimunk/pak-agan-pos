import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Transaksi } from './types';

export type PendingSyncOpType =
  | 'open_shift'
  | 'close_shift'
  | 'create_pengeluaran'
  | 'save_absensi';

export interface PendingSyncOp {
  id: string;
  type: PendingSyncOpType;
  cabang_id?: string;
  created_at: string;
  payload: unknown;
}

interface PosDB extends DBSchema {
  transaksi_pending: {
    key: string;
    value: Transaksi;
    indexes: { 'by-cabang': string };
  };
  pending_ops: {
    key: string;
    value: PendingSyncOp;
    indexes: { 'by-created': string };
  };
}

const DB_NAME = 'pak_agan_pos_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

function dispatchQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pak_agan_offline_queue_updated'));
  }
}

export function getOfflineDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB only available in browser'));
  }
  if (!dbPromise) {
    dbPromise = openDB<PosDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transaksi_pending')) {
          const store = db.createObjectStore('transaksi_pending', { keyPath: 'id' });
          store.createIndex('by-cabang', 'cabang_id');
        }
        if (!db.objectStoreNames.contains('pending_ops')) {
          const opsStore = db.createObjectStore('pending_ops', { keyPath: 'id' });
          opsStore.createIndex('by-created', 'created_at');
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineTransaction(trx: Transaksi): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.put('transaksi_pending', { ...trx, is_offline_synced: false });
    dispatchQueueChanged();
  } catch (err) {
    console.warn('Gagal menyimpan antrean transaksi offline ke IndexedDB:', err);
  }
}

export async function getPendingTransactions(): Promise<Transaksi[]> {
  try {
    const db = await getOfflineDB();
    const list = await db.getAll('transaksi_pending');
    return list.sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime());
  } catch {
    return [];
  }
}

export async function removePendingTransaction(id: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete('transaksi_pending', id);
    dispatchQueueChanged();
  } catch {
    // Abaikan jika sudah terhapus
  }
}

export async function clearAllPendingTransactions(): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.clear('transaksi_pending');
    dispatchQueueChanged();
  } catch {
    // Abaikan
  }
}

export async function countPendingTransactions(): Promise<number> {
  try {
    const db = await getOfflineDB();
    return await db.count('transaksi_pending');
  } catch {
    return 0;
  }
}

export async function queueOfflineOp(op: PendingSyncOp): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.put('pending_ops', op);
    dispatchQueueChanged();
  } catch (err) {
    console.warn('Gagal menyimpan antrean operasi offline ke IndexedDB:', err);
  }
}

export async function getPendingOps(): Promise<PendingSyncOp[]> {
  try {
    const db = await getOfflineDB();
    const list = await db.getAll('pending_ops');
    return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch {
    return [];
  }
}

export async function removePendingOp(id: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete('pending_ops', id);
    dispatchQueueChanged();
  } catch {
    // Abaikan jika sudah terhapus
  }
}

export async function countPendingOps(): Promise<number> {
  try {
    const db = await getOfflineDB();
    return await db.count('pending_ops');
  } catch {
    return 0;
  }
}

export async function countAllPendingSync(): Promise<number> {
  const [trxCount, opsCount] = await Promise.all([
    countPendingTransactions(),
    countPendingOps(),
  ]);
  return trxCount + opsCount;
}

export async function executeAutoSync(
  onSync: (transactions: Transaksi[]) => Promise<boolean>
): Promise<{ syncedCount: number; remainingCount: number }> {
  const pending = await getPendingTransactions();
  if (pending.length === 0) return { syncedCount: 0, remainingCount: 0 };

  let syncedCount = 0;
  try {
    const success = await onSync(pending);
    if (success) {
      for (const trx of pending) {
        await removePendingTransaction(trx.id);
        syncedCount++;
      }
    }
  } catch (err) {
    console.error('Auto sync offline error:', err);
  }

  const remainingCount = await countPendingTransactions();
  return { syncedCount, remainingCount };
}
