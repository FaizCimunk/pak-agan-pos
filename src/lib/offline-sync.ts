// Offline-First IndexedDB & Background Synchronization Module for Pak Agan POS
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Transaksi } from './types';

interface PosDB extends DBSchema {
  transaksi_pending: {
    key: string;
    value: Transaksi;
    indexes: { 'by-cabang': string };
  };
}

const DB_NAME = 'pak_agan_pos_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PosDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }
  if (!dbPromise) {
    dbPromise = openDB<PosDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transaksi_pending')) {
          const store = db.createObjectStore('transaksi_pending', { keyPath: 'id' });
          store.createIndex('by-cabang', 'cabang_id');
        }
      },
    });
  }
  return dbPromise;
}

// Save transaction into local IndexedDB queue
export async function queueOfflineTransaction(transaksi: Transaksi): Promise<void> {
  try {
    const db = await getDb();
    const offlineItem: Transaksi = {
      ...transaksi,
      is_offline_synced: false,
      offline_created_at: new Date().toISOString(),
    };
    await db.put('transaksi_pending', offlineItem);
    console.log(`[Offline Sync] Transaksi ${transaksi.invoice_no} disimpan ke IndexedDB antrean lokal.`);
  } catch (err) {
    console.error('[Offline Sync] Gagal menyimpan ke IndexedDB:', err);
  }
}

// Get all pending transactions in local queue
export async function getPendingTransactions(): Promise<Transaksi[]> {
  try {
    const db = await getDb();
    return await db.getAll('transaksi_pending');
  } catch (err) {
    console.warn('[Offline Sync] Gagal membaca antrean lokal:', err);
    return [];
  }
}

// Delete item after successful sync to server
export async function removePendingTransaction(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('transaksi_pending', id);
  } catch (err) {
    console.warn('[Offline Sync] Gagal menghapus transaksi tersinkronisasi:', err);
  }
}

// Clear all pending queue
export async function clearAllPendingTransactions(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear('transaksi_pending');
  } catch (err) {
    console.warn('[Offline Sync] Gagal membersihkan antrean:', err);
  }
}

// Count items in queue
export async function countPendingTransactions(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count('transaksi_pending');
  } catch (err) {
    return 0;
  }
}

// Sync execution helper
export async function executeAutoSync(
  syncHandler: (transactions: Transaksi[]) => Promise<boolean>
): Promise<{ success: boolean; count: number }> {
  try {
    const pending = await getPendingTransactions();
    if (pending.length === 0) return { success: true, count: 0 };

    console.log(`[Offline Sync] Mencoba menyinkronkan ${pending.length} transaksi tertunda...`);
    const success = await syncHandler(pending);

    if (success) {
      for (const item of pending) {
        await removePendingTransaction(item.id);
      }
      console.log(`[Offline Sync] Berhasil menyinkronkan ${pending.length} transaksi ke pusat.`);
      return { success: true, count: pending.length };
    }
    return { success: false, count: 0 };
  } catch (err) {
    console.error('[Offline Sync] Gagal auto-sync:', err);
    return { success: false, count: 0 };
  }
}
