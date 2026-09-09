import type { SaveDoc } from './types'

export const MAX_LOCAL_GAMES = 5
export const ACTIVE_LOCAL_GAME_KEY = 'myMentat.activeLocalGameId'

const DB_NAME = 'my-mentat-local-games'
const DB_VERSION = 1
const STORE_NAME = 'games'

export interface LocalGameMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface LocalGameRecord extends LocalGameMeta {
  doc: SaveDoc
}

export class LocalGamesFullError extends Error {
  readonly oldest: LocalGameMeta

  constructor(oldest: LocalGameMeta) {
    super(`Local draft limit reached (${MAX_LOCAL_GAMES})`)
    this.name = 'LocalGamesFullError'
    this.oldest = oldest
  }
}

export interface LocalGamesBackend {
  list(): Promise<LocalGameRecord[]>
  get(id: string): Promise<LocalGameRecord | undefined>
  put(record: LocalGameRecord): Promise<void>
  delete(id: string): Promise<void>
}

function titleFromDoc(doc: SaveDoc): string {
  const title = doc.meta?.title?.trim()
  return title || 'Untitled draft'
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createMemoryBackend(): LocalGamesBackend {
  const map = new Map<string, LocalGameRecord>()
  return {
    async list() {
      return [...map.values()]
    },
    async get(id) {
      return map.get(id)
    },
    async put(record) {
      map.set(record.id, record)
    },
    async delete(id) {
      map.delete(id)
    },
  }
}

function isRetriableIdbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as DOMException
  const name = err.name ?? ''
  const message = String(err.message ?? error)
  return (
    name === 'InvalidStateError' ||
    name === 'UnknownError' ||
    name === 'AbortError' ||
    /internal error/i.test(message) ||
    /connection is closing/i.test(message) ||
    /database connection is closing/i.test(message)
  )
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms)
  })
}

const LS_RECORDS_KEY = 'myMentat.localGames.v1'

function createLocalStorageBackend(): LocalGamesBackend {
  const readAll = (): LocalGameRecord[] => {
    try {
      const raw = localStorage.getItem(LS_RECORDS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as LocalGameRecord[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  const writeAll = (rows: LocalGameRecord[]) => {
    localStorage.setItem(LS_RECORDS_KEY, JSON.stringify(rows))
  }
  return {
    async list() {
      return readAll()
    },
    async get(id) {
      return readAll().find(row => row.id === id)
    },
    async put(record) {
      const rows = readAll().filter(row => row.id !== record.id)
      rows.push(record)
      writeAll(rows)
    },
    async delete(id) {
      writeAll(readAll().filter(row => row.id !== id))
    },
  }
}

function deleteIndexedDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Failed to delete IndexedDB'))
    request.onblocked = () => {
      // Other connections closing; onsuccess still fires when done.
    }
  })
}

/**
 * Chrome is unreliable with long-lived IDB handles (multi-tab, HMR, idle close).
 * Open → one transaction → close. Serialize ops; retry; wipe DB once if still broken.
 */
function createIndexedDbBackend(): LocalGamesBackend {
  let queue: Promise<unknown> = Promise.resolve()
  let wipedOnce = false

  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn)
    queue = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  const runOnce = <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> =>
    new Promise((resolve, reject) => {
      let settled = false
      let dbRef: IDBDatabase | null = null
      let openTimer = 0
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        window.clearTimeout(openTimer)
        fn()
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)
      openTimer = window.setTimeout(() => {
        settle(() => {
          if (dbRef) {
            try {
              dbRef.close()
            } catch {
              /* ignore */
            }
          }
          reject(new Error('IndexedDB open timed out'))
        })
      }, 8000)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onerror = () => {
        settle(() => reject(request.error ?? new Error('Failed to open IndexedDB')))
      }
      request.onblocked = () => {
        // Wait for other connections to close; onsuccess/onerror still fire.
      }
      request.onsuccess = () => {
        const db = request.result
        dbRef = db
        if (settled) {
          try {
            db.close()
          } catch {
            /* ignore */
          }
          return
        }
        window.clearTimeout(openTimer)

        db.onversionchange = () => {
          try {
            db.close()
          } catch {
            /* ignore */
          }
        }

        const closeDb = () => {
          try {
            db.close()
          } catch {
            /* ignore */
          }
          dbRef = null
        }

        try {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            settle(() => {
              closeDb()
              reject(new Error(`IndexedDB missing store "${STORE_NAME}"`))
            })
            return
          }
          const tx = db.transaction(STORE_NAME, mode)
          const storeRequest = run(tx.objectStore(STORE_NAME))
          let result: T
          storeRequest.onsuccess = () => {
            result = storeRequest.result
          }
          storeRequest.onerror = () => {
            settle(() => {
              closeDb()
              reject(storeRequest.error ?? new Error('IndexedDB request failed'))
            })
          }
          tx.oncomplete = () => {
            settle(() => {
              closeDb()
              resolve(result!)
            })
          }
          tx.onerror = () => {
            settle(() => {
              closeDb()
              reject(tx.error ?? new Error('IndexedDB transaction failed'))
            })
          }
          tx.onabort = () => {
            settle(() => {
              closeDb()
              reject(tx.error ?? new Error('IndexedDB transaction aborted'))
            })
          }
        } catch (error) {
          settle(() => {
            closeDb()
            reject(error)
          })
        }
      }
    })

  const withStore = <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> =>
    enqueue(async () => {
      let lastError: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await runOnce(mode, run)
        } catch (error) {
          lastError = error
          if (!isRetriableIdbError(error) || attempt === 2) break
          await delay(40 * (attempt + 1))
        }
      }
      if (lastError && isRetriableIdbError(lastError) && !wipedOnce) {
        wipedOnce = true
        try {
          await deleteIndexedDb()
          return await runOnce(mode, run)
        } catch (error) {
          lastError = error
        }
      }
      throw lastError
    })

  return {
    async list() {
      return withStore('readonly', store => store.getAll() as IDBRequest<LocalGameRecord[]>)
    },
    async get(id) {
      return withStore('readonly', store => store.get(id) as IDBRequest<LocalGameRecord | undefined>)
    },
    async put(record) {
      await withStore('readwrite', store => store.put(record))
    },
    async delete(id) {
      await withStore('readwrite', store => store.delete(id))
    },
  }
}

/** Prefer IDB; on hard failure use localStorage for this page session. */
function createResilientBackend(): LocalGamesBackend {
  if (typeof indexedDB === 'undefined') {
    return createLocalStorageBackend()
  }

  const idb = createIndexedDbBackend()
  const ls = createLocalStorageBackend()
  let useLs = false

  return {
    async list() {
      if (useLs) return ls.list()
      try {
        return await idb.list()
      } catch {
        useLs = true
        return ls.list()
      }
    },
    async get(id) {
      if (useLs) return ls.get(id)
      try {
        return await idb.get(id)
      } catch {
        useLs = true
        return ls.get(id)
      }
    },
    async put(record) {
      if (useLs) return ls.put(record)
      try {
        return await idb.put(record)
      } catch {
        useLs = true
        return ls.put(record)
      }
    },
    async delete(id) {
      if (useLs) return ls.delete(id)
      try {
        return await idb.delete(id)
      } catch {
        useLs = true
        return ls.delete(id)
      }
    },
  }
}

let backendOverride: LocalGamesBackend | null = null
let defaultBackend: LocalGamesBackend | null = null

function getBackend(): LocalGamesBackend {
  if (backendOverride) return backendOverride
  if (!defaultBackend) {
    defaultBackend = createResilientBackend()
  }
  return defaultBackend
}

/** Test helper — swap storage and clear active-id coupling. */
export function __setLocalGamesBackendForTests(backend: LocalGamesBackend | null): void {
  backendOverride = backend
}

export function createMemoryLocalGamesBackend(): LocalGamesBackend {
  return createMemoryBackend()
}

export function getActiveLocalGameId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_LOCAL_GAME_KEY)
    return raw && raw.trim() ? raw : null
  } catch {
    return null
  }
}

export function setActiveLocalGameId(id: string | null): void {
  try {
    if (id == null) localStorage.removeItem(ACTIVE_LOCAL_GAME_KEY)
    else localStorage.setItem(ACTIVE_LOCAL_GAME_KEY, id)
  } catch {
    /* private mode / quota */
  }
}

export async function listLocalGames(): Promise<LocalGameMeta[]> {
  const rows = await getBackend().list()
  return rows
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getLocalGame(id: string): Promise<LocalGameRecord | undefined> {
  return getBackend().get(id)
}

export async function deleteLocalGame(id: string): Promise<void> {
  await getBackend().delete(id)
  if (getActiveLocalGameId() === id) setActiveLocalGameId(null)
}

export async function upsertLocalGame(id: string, doc: SaveDoc): Promise<LocalGameRecord> {
  const backend = getBackend()
  const existing = await backend.get(id)
  const now = Date.now()
  const record: LocalGameRecord = {
    id,
    title: titleFromDoc(doc),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    doc,
  }
  await backend.put(record)
  return record
}

/**
 * Insert a new draft. Throws LocalGamesFullError when at capacity
 * (caller may delete oldest then retry with `evictOldest: true`).
 */
export async function createLocalGame(
  doc: SaveDoc,
  opts?: { evictOldest?: boolean }
): Promise<LocalGameRecord> {
  const backend = getBackend()
  const rows = await backend.list()
  if (rows.length >= MAX_LOCAL_GAMES) {
    const oldest = [...rows].sort((a, b) => a.updatedAt - b.updatedAt)[0]
    if (!opts?.evictOldest || !oldest) {
      throw new LocalGamesFullError({
        id: oldest.id,
        title: oldest.title,
        createdAt: oldest.createdAt,
        updatedAt: oldest.updatedAt,
      })
    }
    await backend.delete(oldest.id)
    if (getActiveLocalGameId() === oldest.id) setActiveLocalGameId(null)
  }
  const now = Date.now()
  const record: LocalGameRecord = {
    id: newId(),
    title: titleFromDoc(doc),
    createdAt: now,
    updatedAt: now,
    doc,
  }
  await backend.put(record)
  return record
}

/** Create a draft, prompting via `confirmEvict` when the slot cap is hit. */
export async function createLocalGameWithConfirm(
  doc: SaveDoc,
  confirmEvict: (oldest: LocalGameMeta) => boolean
): Promise<LocalGameRecord | null> {
  try {
    return await createLocalGame(doc)
  } catch (error) {
    if (!(error instanceof LocalGamesFullError)) throw error
    if (!confirmEvict(error.oldest)) return null
    return createLocalGame(doc, { evictOldest: true })
  }
}

export function confirmLocalDraftEvict(oldest: LocalGameMeta): boolean {
  return window.confirm(
    `You already have ${MAX_LOCAL_GAMES} drafts in this browser. Delete the oldest ("${oldest.title}") to start a new one?`
  )
}

/** Update an existing draft, or create one (with default cap confirm). */
export async function persistLocalDraft(
  doc: SaveDoc,
  existingId?: string | null
): Promise<LocalGameRecord | null> {
  if (existingId) return upsertLocalGame(existingId, doc)
  return createLocalGameWithConfirm(doc, confirmLocalDraftEvict)
}
