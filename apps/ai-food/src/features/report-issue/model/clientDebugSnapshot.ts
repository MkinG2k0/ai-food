import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { getAppVersion } from '@/shared/lib/appVersion';

export const CLIENT_DEBUG_SNAPSHOT_VERSION = 1 as const;

/** Stay under the gateway JSON body limit (32mb) with room for the report text. */
export const MAX_CLIENT_DEBUG_SNAPSHOT_CHARS = 24_000_000;

/** Oldest, middle, and newest meals. Two photos from each, when they exist. */
export const MEAL_PHOTO_RANGE_COUNT = 3;
export const MEAL_PHOTOS_PER_RANGE = 2;
/** Base64 chars for sampled photos. The diary and file list stay complete. */
export const MEAL_PHOTO_BASE64_BUDGET = 8_000_000;
const OMIT_IDB_STRING_CHARS = 4_096;

export type ClientDebugMealFile = {
  path: string;
  base64: string;
};

export type ClientDebugMealFileIndex = {
  path: string;
  bytes?: number;
};

type IdKeyPath = string | string[];

export type ClientDebugIdbIndex = {
  name: string;
  keyPath: IdKeyPath;
  unique: boolean;
  multiEntry: boolean;
};

export type ClientDebugIdbStore = {
  name: string;
  keyPath: IdKeyPath | null;
  autoIncrement: boolean;
  indexes: ClientDebugIdbIndex[];
  records: Array<{ key: unknown; value: unknown }>;
};

export type ClientDebugIdbDatabase = {
  name: string;
  version: number;
  stores: ClientDebugIdbStore[];
};

export type ClientDebugSnapshot = {
  version: typeof CLIENT_DEBUG_SNAPSHOT_VERSION;
  exportedAt: string;
  appVersion: string;
  platform: string;
  userAgent: string;
  href: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  /** Capacitor Preferences, including the persisted auth/Telegram session. */
  preferences: Record<string, string>;
  indexedDB: ClientDebugIdbDatabase[];
  /** Every meal-images file, without the bytes. */
  mealFileIndex: ClientDebugMealFileIndex[];
  /** A few photos from different date ranges. Enough to look at, not the whole library. */
  mealFiles: ClientDebugMealFile[];
  errors: string[];
};

type BlobMarker = { __type: 'blob'; mime: string; base64: string };
type BytesMarker = { __type: 'bytes'; base64: string };
type DateMarker = { __type: 'date'; iso: string };

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.readAsDataURL(blob);
  });
}

export async function toJsonSafe(value: unknown): Promise<unknown> {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const marker: BlobMarker = {
      __type: 'blob',
      mime: value.type,
      base64: await blobToBase64(value),
    };
    return marker;
  }
  if (value instanceof ArrayBuffer) {
    const marker: BytesMarker = {
      __type: 'bytes',
      base64: uint8ToBase64(new Uint8Array(value)),
    };
    return marker;
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const view = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const marker: BytesMarker = { __type: 'bytes', base64: uint8ToBase64(view) };
    return marker;
  }
  if (value instanceof Date) {
    const marker: DateMarker = { __type: 'date', iso: value.toISOString() };
    return marker;
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const item of value) next.push(await toJsonSafe(item));
    return next;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await toJsonSafe(item);
    }
    return out;
  }
  return value;
}

/** IndexedDB file bodies are omitted. The diary and the sampled photos carry the useful bytes. */
export async function toDebugJson(value: unknown): Promise<unknown> {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return { __type: 'omitted', mime: value.type, bytes: value.size };
  }
  if (value instanceof ArrayBuffer) {
    return { __type: 'omitted', bytes: value.byteLength };
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return { __type: 'omitted', bytes: value.byteLength };
  }
  if (typeof value === 'string' && value.length > OMIT_IDB_STRING_CHARS) {
    return { __type: 'omitted', bytes: value.length };
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const item of value) next.push(await toDebugJson(item));
    return next;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = await toDebugJson(item);
    }
    return out;
  }
  return value;
}

export function reviveJsonSafe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveJsonSafe);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (record.__type === 'blob' && typeof record.base64 === 'string') {
    const bytes = base64ToUint8Array(record.base64);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const mime = typeof record.mime === 'string' ? record.mime : '';
    return new Blob([copy], mime ? { type: mime } : undefined);
  }
  if (record.__type === 'bytes' && typeof record.base64 === 'string') {
    return base64ToUint8Array(record.base64);
  }
  if (record.__type === 'date' && typeof record.iso === 'string') {
    return new Date(record.iso);
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    out[key] = reviveJsonSafe(item);
  }
  return out;
}

function readStorage(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    out[key] = storage.getItem(key) ?? '';
  }
  return out;
}

function writeStorage(storage: Storage, entries: Record<string, string>) {
  storage.clear();
  for (const [key, value] of Object.entries(entries)) {
    storage.setItem(key, value);
  }
}

async function readPreferences(): Promise<Record<string, string>> {
  const { keys } = await Preferences.keys();
  const out: Record<string, string> = {};
  for (const key of keys) {
    const { value } = await Preferences.get({ key });
    if (value != null) out[key] = value;
  }
  return out;
}

function base64DecodedBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function diaryPhotoRefs(
  preferences: Record<string, string>,
  storage: Record<string, string>,
): Array<{ path: string; at: number }> {
  const raw =
    preferences['ai-food-diary'] ??
    storage['CapacitorStorage.ai-food-diary'] ??
    storage['ai-food-diary'];
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const root =
    parsed && typeof parsed === 'object' && 'state' in parsed
      ? (parsed as { state?: unknown }).state
      : parsed;
  const meals =
    root && typeof root === 'object' && 'meals' in root
      ? (root as { meals?: unknown }).meals
      : null;
  if (!Array.isArray(meals)) return [];
  const refs: Array<{ path: string; at: number }> = [];
  for (const meal of meals) {
    if (!meal || typeof meal !== 'object') continue;
    const record = meal as { timestamp?: unknown; imageUri?: unknown; imageUris?: unknown };
    const at = typeof record.timestamp === 'string' ? Date.parse(record.timestamp) : NaN;
    const time = Number.isFinite(at) ? at : 0;
    const paths = new Set<string>();
    if (typeof record.imageUri === 'string' && record.imageUri) paths.add(record.imageUri);
    if (Array.isArray(record.imageUris)) {
      for (const path of record.imageUris) {
        if (typeof path === 'string' && path) paths.add(path);
      }
    }
    for (const path of paths) refs.push({ path, at: time });
  }
  return refs;
}

/** Oldest, middle, newest. One photo from each range first, then a second if the range has more. */
export function pickMealPhotoSample(
  paths: string[],
  refs: Array<{ path: string; at: number }>,
): string[] {
  const onDisk = new Set(paths);
  const dated = new Map<string, number>();
  for (const ref of refs) {
    if (!onDisk.has(ref.path)) continue;
    const prev = dated.get(ref.path);
    if (prev == null || ref.at < prev) dated.set(ref.path, ref.at);
  }
  const ordered = [...onDisk].sort((a, b) => {
    const left = dated.get(a);
    const right = dated.get(b);
    if (left != null && right != null && left !== right) return left - right;
    if (left != null && right == null) return -1;
    if (left == null && right != null) return 1;
    return a.localeCompare(b);
  });
  if (ordered.length <= MEAL_PHOTO_RANGE_COUNT * MEAL_PHOTOS_PER_RANGE) return ordered;

  const primary: string[] = [];
  const extra: string[] = [];
  const rangeSize = ordered.length / MEAL_PHOTO_RANGE_COUNT;
  for (let range = 0; range < MEAL_PHOTO_RANGE_COUNT; range += 1) {
    const start = Math.floor(range * rangeSize);
    const end =
      range === MEAL_PHOTO_RANGE_COUNT - 1
        ? ordered.length
        : Math.floor((range + 1) * rangeSize);
    const slice = ordered.slice(start, Math.max(end, start + 1));
    if (slice.length === 0) continue;
    primary.push(slice[0]);
    if (slice.length > 1) extra.push(slice[slice.length - 1]);
  }
  return [...new Set([...primary, ...extra])];
}

export function photoBodiesWithinBudget(
  orderedPaths: string[],
  sizes: Map<string, number>,
  budget: number,
): string[] {
  const chosen: string[] = [];
  let used = 0;
  for (const path of orderedPaths) {
    const size = sizes.get(path) ?? 0;
    if (chosen.length > 0 && used + size > budget) continue;
    chosen.push(path);
    used += size;
  }
  return chosen;
}

async function readMealFiles(
  preferences: Record<string, string>,
  storage: Record<string, string>,
): Promise<{
  files: ClientDebugMealFile[];
  index: ClientDebugMealFileIndex[];
  error?: string;
}> {
  try {
    const listed = await Filesystem.readdir({
      path: 'meal-images',
      directory: Directory.Data,
    });
    const paths = listed.files
      .filter((entry) => entry.type !== 'directory')
      .map((entry) => `meal-images/${entry.name}`);
    const picked = pickMealPhotoSample(paths, diaryPhotoRefs(preferences, storage));
    const loaded: ClientDebugMealFile[] = [];
    for (const path of picked) {
      const { data } = await Filesystem.readFile({
        path,
        directory: Directory.Data,
      });
      const base64 = typeof data === 'string' ? data : await blobToBase64(data);
      loaded.push({ path, base64 });
    }
    const sizes = new Map(loaded.map((file) => [file.path, file.base64.length]));
    const keep = new Set(
      photoBodiesWithinBudget(
        loaded.map((file) => file.path),
        sizes,
        MEAL_PHOTO_BASE64_BUDGET,
      ),
    );
    const files = loaded.filter((file) => keep.has(file.path));
    const knownBytes = new Map(
      loaded.map((file) => [file.path, base64DecodedBytes(file.base64)]),
    );
    const index: ClientDebugMealFileIndex[] = [];
    for (const path of paths) {
      const bytes = knownBytes.get(path);
      if (bytes != null) {
        index.push({ path, bytes });
        continue;
      }
      try {
        const stat = await Filesystem.stat({ path, directory: Directory.Data });
        index.push({ path, bytes: stat.size });
      } catch {
        index.push({ path });
      }
    }
    return { files, index };
  } catch (error) {
    return {
      files: [],
      index: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type IdbFactoryWithList = IDBFactory & {
  databases?: () => Promise<Array<{ name?: string; version?: number }>>;
};

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB != null;
}

async function listIdbDatabases(): Promise<Array<{ name: string; version: number }>> {
  if (!hasIndexedDb()) return [];
  const factory = indexedDB as IdbFactoryWithList;
  if (typeof factory.databases === 'function') {
    const rows = await factory.databases();
    return rows
      .filter((row): row is { name: string; version?: number } => Boolean(row.name))
      .map((row) => ({ name: row.name, version: row.version ?? 1 }));
  }
  return [{ name: 'Disc', version: 1 }];
}

function dumpDatabase(
  name: string,
  version: number,
): Promise<ClientDebugIdbDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let created = false;
    request.onerror = () => reject(request.error ?? new Error(`open ${name}`));
    request.onupgradeneeded = () => {
      created = true;
    };
    request.onsuccess = () => {
      const db = request.result;
      if (created) {
        db.close();
        indexedDB.deleteDatabase(name);
        resolve({ name, version: 0, stores: [] });
        return;
      }
      const storeNames = [...db.objectStoreNames];
      if (storeNames.length === 0) {
        const dumped: ClientDebugIdbDatabase = {
          name,
          version: db.version || version || 1,
          stores: [],
        };
        db.close();
        resolve(dumped);
        return;
      }
      const tx = db.transaction(storeNames, 'readonly');
      const stores: ClientDebugIdbStore[] = storeNames.map((storeName) => {
        const store = tx.objectStore(storeName);
        const indexes: ClientDebugIdbIndex[] = [...store.indexNames].map((indexName) => {
          const index = store.index(indexName);
          return {
            name: index.name,
            keyPath: index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry,
          };
        });
        return {
          name: storeName,
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes,
          records: [],
        };
      });

      let pending = stores.length;
      const finish = () => {
        pending -= 1;
        if (pending > 0) return;
        db.close();
        resolve({ name, version: db.version || version || 1, stores });
      };

      stores.forEach((dumped) => {
        const store = tx.objectStore(dumped.name);
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        let keys: IDBValidKey[] | null = null;
        let values: unknown[] | null = null;
        const pair = () => {
          if (!keys || !values) return;
          dumped.records = keys.map((key, recordIndex) => ({
            key,
            value: values![recordIndex],
          }));
          finish();
        };
        keysRequest.onsuccess = () => {
          keys = keysRequest.result;
          pair();
        };
        valuesRequest.onsuccess = () => {
          values = valuesRequest.result;
          pair();
        };
        keysRequest.onerror = () => reject(keysRequest.error ?? new Error(dumped.name));
        valuesRequest.onerror = () =>
          reject(valuesRequest.error ?? new Error(dumped.name));
      });
      tx.onerror = () => reject(tx.error ?? new Error(name));
    };
  });
}

async function readIndexedDb(): Promise<{
  databases: ClientDebugIdbDatabase[];
  error?: string;
}> {
  try {
    const listed = await listIdbDatabases();
    const databases: ClientDebugIdbDatabase[] = [];
    for (const db of listed) {
      const dumped = await dumpDatabase(db.name, db.version);
      if (dumped.version === 0) continue;
      dumped.stores = await Promise.all(
        dumped.stores.map(async (store) => ({
          ...store,
          records: await Promise.all(
            store.records.map(async (record) => ({
              key: await toDebugJson(record.key),
              value: await toDebugJson(record.value),
            })),
          ),
        })),
      );
      databases.push(dumped);
    }
    return { databases };
  } catch (error) {
    return {
      databases: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function collectClientDebugSnapshot(): Promise<ClientDebugSnapshot> {
  const errors: string[] = [];
  let preferences: Record<string, string> = {};
  try {
    preferences = await readPreferences();
  } catch (error) {
    errors.push(
      `preferences: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const storage = readStorage(localStorage);
  const meal = await readMealFiles(preferences, storage);
  if (meal.error) errors.push(`meal-images: ${meal.error}`);

  const idb = await readIndexedDb();
  if (idb.error) errors.push(`indexedDB: ${idb.error}`);

  return {
    version: CLIENT_DEBUG_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    platform: Capacitor.getPlatform(),
    userAgent: navigator.userAgent,
    href: location.href,
    localStorage: storage,
    sessionStorage: readStorage(sessionStorage),
    preferences,
    indexedDB: idb.databases,
    mealFileIndex: meal.index,
    mealFiles: meal.files,
    errors,
  };
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`delete ${name}`));
    request.onblocked = () =>
      reject(new Error(`База ${name} открыта в другой вкладке`));
  });
}

async function replaceIndexedDb(databases: ClientDebugIdbDatabase[]): Promise<void> {
  if (!hasIndexedDb()) {
    if (databases.length > 0) {
      throw new Error('IndexedDB недоступен');
    }
    return;
  }
  const existing = await listIdbDatabases();
  const names = new Set<string>([
    ...existing.map((database) => database.name),
    ...databases.map((database) => database.name),
  ]);
  for (const name of names) {
    await deleteDatabase(name);
  }
  for (const database of databases) {
    await restoreDatabase(database);
  }
}

async function replaceMealFiles(files: ClientDebugMealFile[]): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: 'meal-images',
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // Directory may not exist yet.
  }
  for (const file of files) {
    await Filesystem.writeFile({
      path: file.path,
      data: file.base64,
      directory: Directory.Data,
      recursive: true,
    });
  }
}

function restoreDatabase(database: ClientDebugIdbDatabase): Promise<void> {
  const version = database.version > 0 ? database.version : 1;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database.name, version);
    request.onerror = () => reject(request.error ?? new Error(database.name));
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeDef of database.stores) {
        if (db.objectStoreNames.contains(storeDef.name)) continue;
        const store = db.createObjectStore(storeDef.name, {
          keyPath: storeDef.keyPath ?? undefined,
          autoIncrement: storeDef.autoIncrement,
        });
        for (const index of storeDef.indexes) {
          store.createIndex(index.name, index.keyPath, {
            unique: index.unique,
            multiEntry: index.multiEntry,
          });
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (database.stores.length === 0) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(
        database.stores.map((store) => store.name),
        'readwrite',
      );
      for (const storeDef of database.stores) {
        const store = tx.objectStore(storeDef.name);
        for (const record of storeDef.records) {
          const value = reviveJsonSafe(record.value);
          if (store.keyPath == null) {
            store.put(value, reviveJsonSafe(record.key) as IDBValidKey);
          } else {
            store.put(value);
          }
        }
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error(database.name));
    };
  });
}

export function unwrapClientDebugSnapshot(input: unknown): ClientDebugSnapshot {
  if (!input || typeof input !== 'object') {
    throw new Error('Неверный файл данных');
  }
  const record = input as Record<string, unknown>;
  const candidate =
    record.version === CLIENT_DEBUG_SNAPSHOT_VERSION ? record : record.clientSnapshot;
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    (candidate as { version?: unknown }).version !== CLIENT_DEBUG_SNAPSHOT_VERSION
  ) {
    throw new Error('Неверный файл данных');
  }
  const snapshot = candidate as ClientDebugSnapshot;
  return {
    ...snapshot,
    localStorage: snapshot.localStorage ?? {},
    sessionStorage: snapshot.sessionStorage ?? {},
    preferences: snapshot.preferences ?? {},
    indexedDB: snapshot.indexedDB ?? [],
    mealFileIndex: snapshot.mealFileIndex ?? [],
    mealFiles: snapshot.mealFiles ?? [],
    errors: snapshot.errors ?? [],
  };
}

export async function applyClientDebugSnapshot(input: unknown): Promise<void> {
  const snapshot = unwrapClientDebugSnapshot(input);
  writeStorage(localStorage, snapshot.localStorage);
  writeStorage(sessionStorage, snapshot.sessionStorage);
  await Preferences.clear();
  for (const [key, value] of Object.entries(snapshot.preferences)) {
    await Preferences.set({ key, value });
  }
  await replaceIndexedDb(snapshot.indexedDB);
  const mealReadFailed = snapshot.errors.some((error) =>
    error.startsWith('meal-images:'),
  );
  if (!(mealReadFailed && snapshot.mealFiles.length === 0)) {
    await replaceMealFiles(snapshot.mealFiles);
  }
}
