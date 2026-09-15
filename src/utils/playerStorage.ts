import { Player } from '../types.ts';
import { DEFAULT_PLAYERS } from '../data/defaultPlayers.ts';

const DB_NAME = 'OrnavasseseLineupDB';
const DB_VERSION = 1;
const STORE_NAME = 'players_store';
const KEY_PLAYERS = 'current_players';
export const STORAGE_KEY_PLAYERS = 'lineup_app_players_v2';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB non disponibile'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Clean up invalid or placeholder paths from player list
 */
export function sanitizePlayersList(list: Player[]): Player[] {
  return list.map((p) => {
    if (p.photoUrl && (p.photoUrl.startsWith('/players/') || p.photoUrl.startsWith('data:image/svg+xml'))) {
      const { photoUrl: _, ...rest } = p;
      return rest as Player;
    }
    return p;
  });
}

/**
 * Sync players with photos directly to server so iPhone/other devices get them
 */
export async function syncPlayersToServer(players: Player[]): Promise<boolean> {
  try {
    const sanitized = sanitizePlayersList(players);
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: sanitized }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Storage] Server sync failed:', err);
    return false;
  }
}

/**
 * Fetch players with photos from server
 */
export async function fetchPlayersFromServer(): Promise<Player[] | null> {
  try {
    const res = await fetch('/api/players');
    if (res.ok) {
      const data = await res.json();
      if (data?.players && Array.isArray(data.players) && data.players.length > 0) {
        return sanitizePlayersList(data.players);
      }
    }
  } catch (err) {
    console.warn('[Storage] Fetch from server failed:', err);
  }
  return null;
}

/**
 * Save players to IndexedDB, localStorage, and the server
 */
export async function savePlayersToStorage(players: Player[]): Promise<void> {
  const sanitized = sanitizePlayersList(players);

  // 1. IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sanitized, KEY_PLAYERS);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Storage] IndexedDB save failed:', err);
  }

  // 2. localStorage safely
  try {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(sanitized));
  } catch {
    try {
      const lightweight = sanitized.map((p) => {
        if (p.photoUrl && p.photoUrl.length > 500) {
          const { photoUrl: _, ...rest } = p;
          return rest as Player;
        }
        return p;
      });
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(lightweight));
    } catch {
      // Ignore
    }
  }

  // 3. Server sync
  const photosCount = sanitized.filter((p) => p.photoUrl && p.photoUrl.length > 50).length;
  if (photosCount > 0) {
    syncPlayersToServer(sanitized);
  }
}

/**
 * Load players asynchronously: Server first (for iPhone/cross-device), then IndexedDB, then localStorage
 */
export async function loadPlayersFromStorage(): Promise<Player[]> {
  // 1. Try server first
  const serverPlayers = await fetchPlayersFromServer();
  const serverPhotosCount = serverPlayers?.filter((p) => p.photoUrl && p.photoUrl.length > 50).length || 0;

  // 2. Try IndexedDB
  let localPlayers: Player[] | null = null;
  try {
    const db = await openDatabase();
    localPlayers = await new Promise<Player[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_PLAYERS);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Storage] IndexedDB load failed:', err);
  }

  // Fallback to localStorage if no IndexedDB result
  if (!localPlayers) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
      if (saved) {
        localPlayers = JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
  }

  const localSanitized = localPlayers ? sanitizePlayersList(localPlayers) : null;
  const localPhotosCount = localSanitized?.filter((p) => p.photoUrl && p.photoUrl.length > 50).length || 0;

  // If local device (Mac) has more photos than server, sync them to server
  if (localSanitized && localPhotosCount > serverPhotosCount) {
    syncPlayersToServer(localSanitized);
    return localSanitized;
  }

  // If server has players and photos (e.g. iPhone loading from server), use and cache them
  if (serverPlayers && serverPhotosCount > 0) {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(serverPlayers, KEY_PLAYERS);
    } catch {}
    return serverPlayers;
  }

  if (serverPlayers && serverPlayers.length > 0) {
    return serverPlayers;
  }

  if (localSanitized && localSanitized.length > 0) {
    return localSanitized;
  }

  return DEFAULT_PLAYERS;
}

/**
 * Synchronous initial state for fast first render
 */
export function getInitialPlayersSync(): Player[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
    if (saved) {
      const parsed: Player[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizePlayersList(parsed);
      }
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_PLAYERS;
}
