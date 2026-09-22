// Persistence: the whole store is saved as one JSON document. This is the only
// file that knows the concept persists to the device instead of an API.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Store } from '@/state/store';

const STORAGE_KEY = 'swippers.concept.store';
// Bump when the shape of Store changes so old data is discarded, not misread.
const STORAGE_VERSION = 3;

interface Envelope {
  version: number;
  store: Store;
}

export async function loadStore(): Promise<Store | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Envelope;
    return envelope.version === STORAGE_VERSION ? envelope.store : null;
  } catch {
    return null;
  }
}

export async function saveStore(store: Store): Promise<void> {
  try {
    const envelope: Envelope = { version: STORAGE_VERSION, store };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage is best-effort in the concept; the in-memory store keeps working.
  }
}
