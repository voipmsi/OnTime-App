import { OfflineQueuedPunch, Punch } from '../types';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'workpulse_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_punches';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'queueId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add punch to offline IndexedDB queue
 */
export async function enqueueOfflinePunch(punch: Omit<Punch, 'id'>, photoDataUri?: string): Promise<OfflineQueuedPunch> {
  const queueId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const item: OfflineQueuedPunch = {
    ...punch,
    queueId,
    createdOffline: true,
    photoBlobData: photoDataUri,
    photoUrl: photoDataUri, // Local preview until synced
    attempts: 0,
    syncStatus: 'pending',
  };

  try {
    const database = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback to memory/localStorage queue:', err);
    const existing = JSON.parse(localStorage.getItem('pending_punches_backup') || '[]');
    existing.push(item);
    localStorage.setItem('pending_punches_backup', JSON.stringify(existing));
  }

  notifySyncListeners();
  return item;
}

/**
 * Get all pending punches from IndexedDB
 */
export async function getPendingOfflinePunches(): Promise<OfflineQueuedPunch[]> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const backup = JSON.parse(localStorage.getItem('pending_punches_backup') || '[]');
    return backup;
  }
}

/**
 * Remove an item from the offline queue
 */
export async function removeOfflinePunch(queueId: string): Promise<void> {
  try {
    const database = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(queueId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const backup = JSON.parse(localStorage.getItem('pending_punches_backup') || '[]');
    const filtered = backup.filter((p: OfflineQueuedPunch) => p.queueId !== queueId);
    localStorage.setItem('pending_punches_backup', JSON.stringify(filtered));
  }
  notifySyncListeners();
}

/**
 * Process and sync all pending punches to Firebase
 */
export async function syncOfflinePunches(orgId: string): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const items = await getPendingOfflinePunches();
  if (!items.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      let finalPhotoUrl = item.photoUrl;

      // If photo was stored as base64 string, upload to Cloud Storage
      if (item.photoBlobData && item.photoBlobData.startsWith('data:image')) {
        try {
          const photoStorageRef = ref(
            storage,
            `organizations/${orgId}/punches/${item.userId}/${Date.now()}_${item.type}.jpg`
          );
          await uploadString(photoStorageRef, item.photoBlobData, 'data_url');
          finalPhotoUrl = await getDownloadURL(photoStorageRef);
        } catch (storageErr) {
          console.warn('Storage upload error during offline sync, keeping local data preview:', storageErr);
          // Keep existing data uri or placeholder
        }
      }

      // Write to Firestore punches collection
      const punchesRef = collection(db, 'organizations', orgId, 'punches');
      const docData: any = {
        organizationId: orgId,
        userId: item.userId,
        userEmail: item.userEmail,
        userName: item.userName,
        jobId: item.jobId,
        jobName: item.jobName,
        type: item.type,
        timestamp: item.timestamp,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        gpsAccuracyMeters: item.gpsAccuracyMeters || null,
        distanceFromJobMeters: item.distanceFromJobMeters || null,
        createdOffline: true,
        syncedAt: Date.now(),
        syncStatus: 'synced',
      };

      if (finalPhotoUrl) docData.photoUrl = finalPhotoUrl;
      if (item.breakType) docData.breakType = item.breakType;
      if (item.notes) docData.notes = item.notes;

      await addDoc(punchesRef, docData);
      await removeOfflinePunch(item.queueId);
      synced++;
    } catch (err) {
      console.error('Failed to sync item:', item.queueId, err);
      failed++;
    }
  }

  notifySyncListeners();
  return { synced, failed };
}

// Global sync listeners for reactive UI badges
type SyncListener = (count: number) => void;
const listeners: Set<SyncListener> = new Set();

export function subscribeToSyncQueue(callback: SyncListener): () => void {
  listeners.add(callback);
  getPendingOfflinePunches().then((items) => callback(items.length));
  return () => {
    listeners.delete(callback);
  };
}

function notifySyncListeners() {
  getPendingOfflinePunches().then((items) => {
    listeners.forEach((fn) => fn(items.length));
  });
}

// Set up online listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifySyncListeners();
  });
}
