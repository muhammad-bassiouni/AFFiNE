import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import Y from 'yjs';

import type { CRDT } from '../..';

export const dbVersion = 1;
export const DEFAULT_DB_NAME = 'affine-local';

type UpdateMessage = {
  timestamp: number;
  update: Uint8Array;
};

type WorkspacePersist = {
  id: string;
  updates: UpdateMessage[];
};

interface BlockSuiteBinaryDB extends DBSchema {
  workspace: {
    key: string;
    value: WorkspacePersist;
  };
  milestone: {
    key: string;
    value: unknown;
  };
}

export function upgradeDB(db: IDBPDatabase<BlockSuiteBinaryDB>) {
  db.createObjectStore('workspace', { keyPath: 'id' });
  db.createObjectStore('milestone', { keyPath: 'id' });
}

export function createIndexedDBPeer({
  dbName = DEFAULT_DB_NAME,
  mergeCount = 1,
}: {
  dbName?: string;
  mergeCount?: number;
}): CRDT {
  let dbPromise: Promise<IDBPDatabase<BlockSuiteBinaryDB>> | null = null;
  const getDb = async () => {
    if (dbPromise === null) {
      dbPromise = openDB<BlockSuiteBinaryDB>(dbName, dbVersion, {
        upgrade: upgradeDB,
      });
    }
    return dbPromise;
  };

  return {
    name: 'indexeddb',
    async pull(docId, state) {
      const db = await getDb();
      const store = db
        .transaction('workspace', 'readonly')
        .objectStore('workspace');
      const data = await store.get(docId);

      if (!data) {
        return null;
      }

      const { updates } = data;
      const update = Y.mergeUpdates(updates.map(({ update }) => update));

      const diff = state ? Y.diffUpdate(update, state) : update;

      return { data: diff, state: Y.encodeStateVectorFromUpdate(update) };
    },
    async push(docId, update) {
      const db = await getDb();
      const store = db
        .transaction('workspace', 'readwrite')
        .objectStore('workspace');

      // TODO: maybe we do not need to get data every time
      const { updates } = (await store.get(docId)) ?? { updates: [] };
      let rows: UpdateMessage[] = [
        ...updates,
        { timestamp: Date.now(), update },
      ];
      if (mergeCount && rows.length >= mergeCount) {
        const merged = Y.mergeUpdates(rows.map(({ update }) => update));
        rows = [{ timestamp: Date.now(), update: merged }];
      }
      await store.put({
        id: docId,
        updates: rows,
      });
    },
    subscribe(_) {
      // TODO
      return () => {};
    },
  };
}
