const REQUIRED_KEYS = [
  'order_id',
  'platform',
  'status',
  'order_date',
  'currency',
  'items',
  'pricing',
  'fees',
  'discounts',
  'payment',
]

export function createEmptyReceipt() {
  return {
    order_id: '',
    platform: '',
    status: '',
    order_date: '',
    currency: '',
    items: [
      {
        name: '',
        quantity: { count: 1, unit: '' },
        price: 0,
        original_price: 0,
      },
    ],
    pricing: { subtotal: 0, total_amount: 0 },
    fees: {
      delivery_fee: 0,
      handling_fee: 0,
      convenience_fee: 0,
      platform_fee: 0,
      packaging_fee: 0,
      surge_fee: 0,
      small_cart_fee: 0,
      service_fee: 0,
      tip: 0,
      tax: 0,
      other_fees: [{ name: '', amount: 0 }],
    },
    discounts: {
      offer_discount: null,
      coupon_discount: null,
      wallet_discount: null,
      promotional_discount: null,
      other_discounts: [],
    },
    payment: { method: '', status: null },
  }
}

export function parseJson(text) {
  if (!text || !text.trim()) {
    return { ok: false, data: null, error: 'JSON is empty' }
  }
  try {
    const data = JSON.parse(text)
    return { ok: true, data, error: null }
  } catch (err) {
    return { ok: false, data: null, error: err.message }
  }
}

export function validateSchema(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Root value must be a JSON object' }
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in data)) {
      return { ok: false, error: `Missing required field: "${key}"` }
    }
  }

  if (!Array.isArray(data.items)) {
    return { ok: false, error: '"items" must be an array' }
  }

  if (!data.pricing || typeof data.pricing !== 'object') {
    return { ok: false, error: '"pricing" must be an object' }
  }

  if (!data.fees || typeof data.fees !== 'object') {
    return { ok: false, error: '"fees" must be an object' }
  }

  if (!data.discounts || typeof data.discounts !== 'object') {
    return { ok: false, error: '"discounts" must be an object' }
  }

  if (!data.payment || typeof data.payment !== 'object') {
    return { ok: false, error: '"payment" must be an object' }
  }

  return { ok: true, error: null }
}

export function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'At least one item is required' }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const label = `Item ${i + 1}`

    if (!item?.name || !String(item.name).trim()) {
      return { ok: false, error: `${label}: name cannot be empty` }
    }

    const count = item?.quantity?.count
    const num = typeof count === 'number' ? count : parseFloat(count)
    if (!Number.isFinite(num) || !Number.isInteger(num) || num < 1) {
      return { ok: false, error: `${label}: quantity must be a natural number (at least 1)` }
    }
  }

  return { ok: true, error: null }
}

export function validateReceipt(data) {
  const schema = validateSchema(data)
  if (!schema.ok) return schema
  return validateItems(data.items)
}

export function validateJson(text) {
  const parsed = parseJson(text)
  if (!parsed.ok) return parsed
  const receipt = validateReceipt(parsed.data)
  if (!receipt.ok) return { ok: false, data: null, error: receipt.error }
  return { ok: true, data: parsed.data, error: null }
}

export function formatJson(text) {
  const parsed = parseJson(text)
  if (!parsed.ok) return parsed
  return { ok: true, data: JSON.stringify(parsed.data, null, 2), error: null }
}
