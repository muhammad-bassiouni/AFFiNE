import { Slot } from '@blocksuite/global/utils';
import Y from 'yjs';

type CRDTUpdate = Uint8Array;

type StateVector = Uint8Array;

export interface CRDT {
  name: string;

  pull(
    docId: string,
    state: StateVector
  ): Promise<{ data: CRDTUpdate; state?: StateVector } | null>;
  push(docId: string, data: CRDTUpdate): Promise<void>;

  subscribe(cb: (docId: string, data: CRDTUpdate) => void): () => void;
}

/**
 * # SyncEngine
 *
 *                    ┌────────────┐
 *                    │ SyncEngine │
 *                    └─────┬──────┘
 *                          │
 *                          ▼
 *                    ┌────────────┐
 *                    │  SyncPeer  │
 *          ┌─────────┤   local    ├─────────┐
 *          │         └─────┬──────┘         │
 *          │               │                │
 *          ▼               ▼                ▼
 *   ┌────────────┐   ┌────────────┐   ┌────────────┐
 *   │  SyncPeer  │   │  SyncPeer  │   │  SyncPeer  │
 *   │   Remote   │   │   Remote   │   │   Remote   │
 *   └────────────┘   └────────────┘   └────────────┘
 *
 *
 * Sync engine manage sync peers
 *
 * Sync steps:
 * 1. start local sync
 * 2. wait for local sync complete
 * 3. start remote sync
 * 4. continuously sync local and remote
 */
export class SyncEngine {
  private abort = new AbortController();

  get rootDocId() {
    return this.rootDoc.guid;
  }

  constructor(
    private local: CRDT,
    private remotes: CRDT[],
    private rootDoc: Y.Doc
  ) {}

  start() {
    this.stop();
    this.abort = new AbortController();

    this.sync(this.abort.signal).catch(err => {
      // should never reach here
      console.error(err);
    });
  }

  stop() {
    this.abort.abort('manually-stop');
  }

  // main sync process, should never return until abort
  async sync(signal: AbortSignal) {
    let localPeer: SyncPeer | null = null;
    const remotePeers: SyncPeer[] = [];
    try {
      // Step 1: start local sync
      localPeer = new SyncPeer(this.local, this.rootDoc);
      localPeer.start();

      // Step 2: wait for local sync complete
      await localPeer.waitForSync(signal);

      remotePeers.push(
        ...this.remotes.map(remote => new SyncPeer(remote, this.rootDoc))
      );

      // Step 3: start remote sync
      for (const remotePeer of remotePeers) {
        remotePeer.start();
      }

      // Step 4: continuously sync local and remote

      // wait for abort
      await new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(signal.reason);
        });
      });
    } catch (error) {
      if (error === 'manually-stop') {
        return;
      }
      throw error;
    } finally {
      // stop peers
      localPeer?.stop();
      for (const remotePeer of remotePeers) {
        remotePeer.stop();
      }
    }
  }
}

/**
 * # SyncPeer
 * A SyncPeer is responsible for syncing one CRDT with one Y.Doc and its subdocs.
 *
 *                    ┌─────┐
 *                    │Start│
 *                    └──┬──┘
 *                       │
 *    ┌──────┐     ┌─────▼──────┐        ┌────┐
 *    │listen◄─────┤pull rootdoc│        │peer│
 *    └──┬───┘     └─────┬──────┘        └──┬─┘
 *       │               │ onLoad()         │
 *    ┌──▼───┐     ┌─────▼──────┐      ┌────▼────┐
 *    │listen◄─────┤pull subdocs│      │subscribe│
 *    └──┬───┘     └─────┬──────┘      └────┬────┘
 *       │               │ onSync()         │
 *    ┌──▼──┐      ┌─────▼───────┐       ┌──▼──┐
 *    │queue├──────►apply updates◄───────┤queue│
 *    └─────┘      └─────────────┘       └─────┘
 *
 * listen: listen for updates from ydoc, typically from user modifications.
 * subscribe: listen for updates from peer, typically from other users.
 *
 *
 */
export class SyncPeer {
  isStarted = false;
  isLoaded = false;
  isSynced = false;
  onSync = new Slot();
  onLoad = new Slot();
  abort = new AbortController();
  get name() {
    return this.peer.name;
  }

  constructor(
    private peer: CRDT,
    private rootDoc: Y.Doc
  ) {}

  start() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.abort = new AbortController();

    this.sync(this.abort.signal).catch(err => {
      // should not reach here
      console.error(err);
    });
  }

  stop() {
    this.abort.abort('manually-stop');
    this.isStarted = false;
  }

  async sync(abort: AbortSignal) {
    const cleanUp: (() => void)[] = [];
    try {
      // store updates, don't apply them until loading is complete
      const pushUpdatesQueue = new AsyncQueue<{
        docId: string;
        data: CRDTUpdate;
      }>();
      const pullUpdatesQueue = new AsyncQueue<{
        docId: string;
        data: CRDTUpdate;
      }>();

      // handle updates from ydoc
      const handleYDocUpdates = (
        update: Uint8Array,
        origin: string,
        doc: Y.Doc
      ) => {
        // don't push updates from peer
        if (origin === this.name) {
          return;
        }
        pushUpdatesQueue.push({
          docId: doc.guid,
          data: update,
        });
      };

      // handle updates from peer
      const handlePeerUpdates = (docId: string, data: CRDTUpdate) => {
        pullUpdatesQueue.push({
          docId,
          data,
        });
      };

      // start listen peer updates
      const dispose = this.peer.subscribe(handlePeerUpdates);
      cleanUp.push(() => dispose());

      const connectedDocs = new Map<string, Y.Doc>();
      cleanUp.push(() => {
        for (const subdoc of connectedDocs.values()) {
          subdoc.off('update', handleYDocUpdates);
        }
      });

      const connectDoc = async (doc: Y.Doc) => {
        const { data: docData, state: peerState } =
          (await this.peer.pull(doc.guid, Y.encodeStateVector(doc))) ?? {};
        abort.throwIfAborted();

        if (docData) {
          Y.applyUpdate(doc, docData, 'load');
        }

        // diff root doc and peer, save updates to pendingUpdates
        pushUpdatesQueue.push({
          docId: doc.guid,
          data: Y.encodeStateAsUpdate(doc, peerState),
        });

        connectedDocs.set(doc.guid, doc);

        // start listen root doc changes
        doc.on('update', handleYDocUpdates);

        // mark rootDoc as loaded
        doc.emit('sync', [true]);
      };

      const disconnectDoc = (doc: Y.Doc) => {
        doc.off('update', handleYDocUpdates);
        connectedDocs.delete(doc.guid);
      };

      // Step 1: load root doc
      await connectDoc(this.rootDoc);

      this.isLoaded = true;
      this.onLoad.emit();

      // Step 2: load subdocs
      const subdocsLoadQueue = new AsyncQueue(
        Array.from(this.rootDoc.getSubdocs())
      );

      // start listen subdocs changes, append new subdocs to queue, remove subdocs from queue
      const handleSubdocsUpdate = ({
        loaded,
        added,
        removed,
      }: {
        loaded: Set<Y.Doc>;
        added: Set<Y.Doc>;
        removed: Set<Y.Doc>;
      }) => {
        if (loaded) {
          // do nothing, sense we always load all subdocs
        }

        if (added) {
          for (const subdoc of added) {
            subdocsLoadQueue.push(subdoc);
          }
        }

        if (removed) {
          for (const subdoc of removed) {
            disconnectDoc(subdoc);
            subdocsLoadQueue.remove(doc => doc === subdoc);
          }
        }
      };
      this.rootDoc.on('subdocs', handleSubdocsUpdate);
      cleanUp.push(() => this.rootDoc.off('subdocs', handleSubdocsUpdate));

      while (subdocsLoadQueue.length > 0) {
        const subdoc = await subdocsLoadQueue.next(abort);
        await connectDoc(subdoc);
      }

      this.isSynced = true;
      this.onSync.emit();

      // Finally: start sync
      await Promise.all([
        // listen subdocs
        async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const subdoc = await subdocsLoadQueue.next(abort);
            await connectDoc(subdoc);
          }
        },
        // pull updates
        async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { docId, data } = await pullUpdatesQueue.next(abort);
            const subdoc = connectedDocs.get(docId);
            if (subdoc) {
              Y.applyUpdate(subdoc, data, this.name);
            }
          }
        },
        // push updates
        async () => {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { docId, data } = await pushUpdatesQueue.next(abort);
            await this.peer.push(docId, data);
          }
        },
      ]);
    } catch (err) {
      if (err === 'manually-stop') {
        return;
      }
      throw err;
    } finally {
      for (const clean of cleanUp) {
        clean();
      }
    }
  }

  async waitForSync(abort: AbortSignal) {
    if (this.isSynced) {
      return;
    } else {
      return Promise.race([
        new Promise<void>(resolve => {
          this.onSync.once(() => {
            resolve();
          });
        }),
        new Promise((_, reject) => {
          abort.throwIfAborted();
          abort.addEventListener('abort', () => {
            reject(abort.reason);
          });
        }),
      ]);
    }
  }

  async waitForLoad(abort: AbortSignal) {
    if (this.isLoaded) {
      return;
    } else {
      return Promise.race([
        new Promise<void>(resolve => {
          this.onLoad.once(() => {
            resolve();
          });
        }),
        new Promise((_, reject) => {
          abort.throwIfAborted();
          abort.addEventListener('abort', () => {
            reject(abort.reason);
          });
        }),
      ]);
    }
  }
}

class AsyncQueue<T> {
  private _queue: T[];

  private _resolveUpdate: (() => void) | null = null;
  private _waitForUpdate: Promise<void> | null = null;

  constructor(init: T[] = []) {
    this._queue = init;
  }

  get length() {
    return this._queue.length;
  }

  async next(abort: AbortSignal): Promise<T> {
    const update = this._queue.shift();
    if (update) {
      return update;
    } else {
      if (!this._waitForUpdate) {
        this._waitForUpdate = new Promise(resolve => {
          this._resolveUpdate = resolve;
        });
      }

      await Promise.race([
        this._waitForUpdate,
        new Promise((_, reject) => {
          abort.throwIfAborted();
          abort.addEventListener('abort', () => {
            reject(abort.reason);
          });
        }),
      ]);

      return this.next(abort);
    }
  }

  push(update: T) {
    this._queue.push(update);
    if (this._resolveUpdate) {
      const resolve = this._resolveUpdate;
      this._resolveUpdate = null;
      this._waitForUpdate = null;
      resolve();
    }
  }

  remove(predicate: (update: T) => boolean) {
    const index = this._queue.findIndex(predicate);
    if (index !== -1) {
      this._queue.splice(index, 1);
    }
  }
}
