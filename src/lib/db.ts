/**
 * Persistence layer for saved chats, spec section 12.
 *
 * IndexedDB, not localStorage: a user can accumulate many chats with many
 * messages each, and localStorage's ~5MB synchronous-string-blob model does
 * not scale to that. Every call here is async and every failure is caught by
 * the caller — a broken database must never crash the chat, same rule as
 * api.ts section 5.
 */

import type { Chat } from './types'

const DB_NAME = 'weathergpt'
const DB_VERSION = 1
const STORE = 'chats'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

export async function dbListChats(): Promise<Chat[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const chats = (req.result as Chat[]).sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(chats)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function dbSaveChat(chat: Chat): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(chat)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function dbDeleteChat(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}