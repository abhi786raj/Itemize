import { generateId } from './state.js'

const DB_NAME = 'ItemizeDB'
const STORE = 'receipts'
const DB_VERSION = 1

export class DuplicateOrderError extends Error {
  constructor(orderId) {
    super(`Order ID "${orderId}" already exists`)
    this.code = 'DUPLICATE_ORDER_ID'
    this.orderId = orderId
  }
}

export function normalizeOrderId(orderId) {
  if (orderId === null || orderId === undefined) return null
  const trimmed = String(orderId).trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('order_id', 'order_id', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getReceiptByOrderId(orderId, excludeId = null) {
  const normalized = normalizeOrderId(orderId)
  if (!normalized) return null

  const all = await getAllReceipts()
  return all.find((r) => {
    if (excludeId && r.id === excludeId) return false
    return normalizeOrderId(r.order_id) === normalized
  }) || null
}

export async function saveReceipt(receiptData) {
  const existing = await getReceiptByOrderId(receiptData.order_id)
  if (existing) {
    throw new DuplicateOrderError(receiptData.order_id)
  }

  const record = {
    ...receiptData,
    id: generateId(),
    savedAt: new Date().toISOString(),
  }

  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.add(record)
    req.onsuccess = () => resolve(record)
    req.onerror = () => reject(req.error)
  }))
}

export async function updateReceipt(record) {
  const existing = await getReceipt(record.id)
  if (!existing) {
    throw new Error('Receipt not found')
  }

  const duplicate = await getReceiptByOrderId(record.order_id, record.id)
  if (duplicate) {
    throw new DuplicateOrderError(record.order_id)
  }

  const updated = {
    ...existing,
    ...record,
    id: record.id,
    savedAt: existing.savedAt,
    updatedAt: new Date().toISOString(),
  }

  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.put(updated)
    req.onsuccess = () => resolve(updated)
    req.onerror = () => reject(req.error)
  }))
}

export function getReceipt(id) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  }))
}

export function getAllReceipts() {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const sorted = (req.result || []).sort(
        (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
      )
      resolve(sorted)
    }
    req.onerror = () => reject(req.error)
  }))
}

export function deleteReceipt(id) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

export function clearAll() {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

export async function exportAllReceipts() {
  const receipts = await getAllReceipts()
  return {
    version: 1,
    app: 'Itemize',
    exportedAt: new Date().toISOString(),
    receipts,
  }
}

export async function importReceipts(rawData, mode = 'merge') {
  const receipts = Array.isArray(rawData) ? rawData : rawData?.receipts
  if (!Array.isArray(receipts)) {
    throw new Error('Invalid import file: expected a receipts array')
  }

  if (mode === 'replace') {
    await clearAll()
  }

  const existingByOrderId = new Map()
  if (mode === 'merge') {
    const existing = await getAllReceipts()
    for (const r of existing) {
      const key = normalizeOrderId(r.order_id)
      if (key) existingByOrderId.set(key, r)
    }
  }

  let imported = 0

  for (const receipt of receipts) {
    if (!receipt || typeof receipt !== 'object') continue

    const { id, savedAt, order, updatedAt, wasUpsert, ...fields } = receipt
    const orderKey = normalizeOrderId(fields.order_id)

    if (mode === 'merge' && orderKey && existingByOrderId.has(orderKey)) {
      const existing = existingByOrderId.get(orderKey)
      await updateReceipt({ ...existing, ...fields, id: existing.id, savedAt: existing.savedAt })
    } else {
      await saveReceipt(fields)
      if (orderKey) {
        const saved = await getReceiptByOrderId(fields.order_id)
        if (saved) existingByOrderId.set(orderKey, saved)
      }
    }
    imported++
  }

  return imported
}
