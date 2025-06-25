import { normalizePhone } from '@shared/utils/phoneUtils';

export type LifetimeCounts = Record<string, number>;

const STORAGE_KEY = 'lifetimeDialCounts';

// Internal realtime pub-sub for same-tab updates
type Listener = (counts: LifetimeCounts) => void;
const listeners: Set<Listener> = new Set();

// BroadcastChannel for cross-tab (falls back to storage event)
const bc: BroadcastChannel | undefined =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('lifetimeDialCounts')
    : undefined;

function notifyAll(counts: LifetimeCounts) {
  debug('notifyAll', counts);
  listeners.forEach((l) => l(counts));
  bc?.postMessage({ type: 'lifetimeCounts', payload: counts });
}

function canonicalizeMap(obj: LifetimeCounts): LifetimeCounts {
  const out: LifetimeCounts = {};
  for (const [k, v] of Object.entries(obj)) {
    const canon = normalizePhone(k);
    if (!canon) continue;
    out[canon] = (out[canon] || 0) + v;
  }
  return out;
}

export function loadLifetimeCounts(): LifetimeCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: LifetimeCounts = raw ? (JSON.parse(raw) as LifetimeCounts) : {};
    const migrated = canonicalizeMap(parsed);

    // If structure changed, persist & broadcast
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      notifyAll({ ...migrated });
    }

    return migrated;
  } catch {
    return {};
  }
}

function saveLifetimeCounts(data: LifetimeCounts): void {
  try {
    // Persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Emit a fresh object reference so React state setters detect change
    notifyAll({ ...data });
  } catch {
    /* swallow */
  }
}

/**
 * Increment the dial count for a phone number (digits only or raw). Returns the new total.
 */
export function incrementLifetimeCount(rawPhone: string): number {
  console.debug('[LifetimeCounts] incrementLifetimeCount called with', rawPhone);
  const phone = normalizePhone(rawPhone);
  if (!phone) return 0;

  const counts = loadLifetimeCounts();
  counts[phone] = (counts[phone] || 0) + 1;
  saveLifetimeCounts(counts);

  // Fire-and-forget backend sync
  try {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/dial-counts/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: rawPhone }),
      })
        .then((res) => {
          if (!res.ok) {
            console.error('Failed to sync call count with server:', res.status, res.statusText);
          }
        })
        .catch((err) => {
          console.error('Error syncing call count with server:', err);
        });
    }
  } catch (err) {
    console.error('An unexpected error occurred while preparing to sync call count:', err);
  }

  return counts[phone];
}

/**
 * Subscribe to StorageEvents that affect lifetime counts. Returns an unsubscribe fn.
 */
export function subscribeLifetimeCounts(cb: (counts: LifetimeCounts) => void): () => void {
  listeners.add(cb);

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(loadLifetimeCounts());
  };
  window.addEventListener('storage', storageHandler);

  const bcHandler = (e: MessageEvent) => {
    if (e.data?.type === 'lifetimeCounts') cb(loadLifetimeCounts());
  };
  bc?.addEventListener('message', bcHandler);

  cb(loadLifetimeCounts());

  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', storageHandler);
    bc?.removeEventListener('message', bcHandler);
  };
}

/**
 * Fetch counts for an array of phone numbers from the backend and merge into localStorage.
 */
export async function refreshCountsFromServer(phones: string[]): Promise<void> {
  try {
    if (!phones.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const qs = encodeURIComponent(phones.join(','));
    const res = await fetch(`/api/dial-counts?phones=${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data: { counts: Record<string, number> } = await res.json();
    const local = loadLifetimeCounts();
    let changed = false;
    for (const [p, serverCount] of Object.entries(data.counts)) {
      const localCount = local[p] ?? 0;
      const merged = Math.max(localCount, serverCount);
      if (merged !== localCount) {
        local[p] = merged;
        changed = true;
      }
    }
    if (changed) {
      saveLifetimeCounts(local);
    }
  } catch {/* ignore */}
}

function debug(...args: any[]) {
  if (process.env.NODE_ENV === 'development') console.debug('[LifetimeCounts]', ...args);
}

// Re-export for convenience so other components don't need to change imports
export { normalizePhone };