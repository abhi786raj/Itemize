import { state, resetForNewReceipt, clearSessionAfterSave } from '../state.js'
import { saveReceipt, updateReceipt, getReceipt, getReceiptByOrderId, DuplicateOrderError } from '../db.js'
import { validateItems } from '../validation.js'
import { navigate, back } from '../router.js'
import { showToast } from './home.js'
import { refreshHistoryOnDetailEnter } from './history.js'

const DUPLICATE_MSG = 'Bill already uploaded. Edit in History.'

const FEE_FIELDS = [
  'delivery_fee', 'handling_fee', 'convenience_fee', 'platform_fee',
  'packaging_fee', 'surge_fee', 'small_cart_fee', 'service_fee', 'tip', 'tax',
]

const DISCOUNT_FIELDS = [
  'offer_discount', 'coupon_discount', 'wallet_discount', 'promotional_discount',
]

export function initReview() {
  const container = document.getElementById('review-sections')
  const backBtn = document.getElementById('review-back-btn')
  const editJsonBtn = document.getElementById('edit-json-btn')
  const saveBtn = document.getElementById('confirm-save-btn')

  container?.addEventListener('input', (e) => {
    const input = e.target.closest('[data-path]')
    if (!input || !container.contains(input) || !state.receiptData) return
    setNestedValue(state.receiptData, input.dataset.path, coerceValue(input))
  })

  container?.addEventListener('change', (e) => {
    const input = e.target.closest('[data-path]')
    if (!input || !container.contains(input) || !state.receiptData) return
    setNestedValue(state.receiptData, input.dataset.path, coerceValue(input))
  })

  container?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn || !container.contains(btn) || !state.receiptData) return

    const action = btn.dataset.action
    const index = parseInt(btn.dataset.index, 10)

    if (action === 'add-item') {
      state.receiptData.items.push({
        name: '', quantity: { count: 1, unit: '' }, price: 0, original_price: 0,
      })
    } else if (action === 'remove-item') {
      if (state.receiptData.items.length <= 1) {
        showToast('At least one item is required')
        return
      }
      state.receiptData.items.splice(index, 1)
    } else if (action === 'add-other-fee') {
      if (!state.receiptData.fees.other_fees) state.receiptData.fees.other_fees = []
      state.receiptData.fees.other_fees.push({ name: '', amount: 0 })
    } else if (action === 'remove-other-fee') {
      state.receiptData.fees.other_fees.splice(index, 1)
    } else if (action === 'add-other-discount') {
      if (!state.receiptData.discounts.other_discounts) state.receiptData.discounts.other_discounts = []
      state.receiptData.discounts.other_discounts.push(null)
    } else if (action === 'remove-other-discount') {
      state.receiptData.discounts.other_discounts.splice(index, 1)
    }

    renderReview(container)
  })

  backBtn?.addEventListener('click', () => {
    if (state.editingId) {
      navigate('history-detail', { push: false, reload: true })
    } else {
      back()
    }
  })

  editJsonBtn?.addEventListener('click', () => {
    state.rawJson = JSON.stringify(cleanReceiptData(state.receiptData), null, 2)
    navigate('json-input', { reload: true })
  })

  saveBtn?.addEventListener('click', async () => {
    if (!state.receiptData) return
    saveBtn.disabled = true

    try {
      const data = cleanReceiptData(state.receiptData)

      const itemsCheck = validateItems(data.items)
      if (!itemsCheck.ok) {
        showToast(itemsCheck.error)
        saveBtn.disabled = false
        return
      }

      if (state.editingId) {
        const existing = await getReceipt(state.editingId)
        if (!existing) {
          showToast('Receipt not found. It may have been deleted.')
          saveBtn.disabled = false
          return
        }
        await updateReceipt({ ...existing, ...data, id: state.editingId })
        await refreshHistoryOnDetailEnter()
        showToast('Receipt updated successfully')
      } else {
        const duplicate = await getReceiptByOrderId(data.order_id)
        if (duplicate) {
          showToast(DUPLICATE_MSG)
          saveBtn.disabled = false
          return
        }
        await saveReceipt(data)
      }

      clearSessionAfterSave()
      navigate('success', { reload: true })
    } catch (err) {
      saveBtn.disabled = false
      if (err instanceof DuplicateOrderError) {
        showToast(DUPLICATE_MSG)
      } else {
        showToast('Failed to save receipt. Please try again.')
      }
    }
  })

  return {
    onEnter() {
      if (saveBtn) {
        saveBtn.disabled = false
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed')
      }
      if (!state.receiptData) {
        showToast('No receipt data to review')
        navigate('home', { push: false, resetStack: true })
        return
      }
      ensureReceiptShape(state.receiptData)
      renderReview(container)
    },
  }
}

function cleanReceiptData(data) {
  const { order, id, savedAt, updatedAt, wasUpsert, ...rest } = data
  return JSON.parse(JSON.stringify(rest))
}

function ensureReceiptShape(d) {
  if (!d.items) d.items = []
  if (!d.pricing) d.pricing = { subtotal: 0, total_amount: 0 }
  if (!d.fees) d.fees = { other_fees: [] }
  if (!d.fees.other_fees) d.fees.other_fees = []
  if (!d.discounts) d.discounts = { other_discounts: [] }
  if (!d.discounts.other_discounts) d.discounts.other_discounts = []
  if (!d.payment) d.payment = { method: '', status: null }
  delete d.order
}

function renderReview(container) {
  if (!container || !state.receiptData) return
  ensureReceiptShape(state.receiptData)
  const d = state.receiptData

  container.innerHTML = `
    ${renderSection('Order Information', renderOrderFields(d))}
    ${renderSection('Items', renderItems(d))}
    ${renderSection('Pricing', renderPricing(d))}
    ${renderSection('Fees', renderFees(d))}
    ${renderSection('Discounts', renderDiscounts(d))}
    ${renderSection('Payment', renderPayment(d))}
  `
}

function renderSection(title, content) {
  return `
    <div class="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">${title}</h3>
      ${content}
    </div>
  `
}

function renderOrderFields(d) {
  const fields = [
    ['order_id', 'Order ID', 'text'],
    ['platform', 'Platform', 'text'],
    ['status', 'Status', 'text'],
    ['order_date', 'Order Date', 'text'],
    ['currency', 'Currency', 'text'],
  ]
  return fields.map(([key, label, type]) => fieldInput(key, label, d[key], type)).join('')
}

function renderItems(d) {
  const items = d.items || []
  const itemsHtml = items.map((item, i) => `
    <div class="border border-gray-100 rounded-xl p-3 mb-3" data-item-index="${i}">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs font-medium text-gray-500">Item ${i + 1}</span>
        <button type="button" data-action="remove-item" data-index="${i}" class="text-red-500 text-xs min-h-[44px] px-2">Remove</button>
      </div>
      ${fieldInput(`items.${i}.name`, 'Name', item.name, 'text', false, { required: true })}
      ${fieldInput(`items.${i}.quantity.count`, 'Quantity', item.quantity?.count, 'number', false, { min: 1, step: 1 })}
      ${fieldInput(`items.${i}.quantity.unit`, 'Unit', item.quantity?.unit, 'text')}
      ${fieldInput(`items.${i}.price`, 'Price', item.price, 'number')}
      ${fieldInput(`items.${i}.original_price`, 'Original Price', item.original_price, 'number')}
    </div>
  `).join('')

  return itemsHtml + `<button type="button" data-action="add-item" class="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-indigo-600 min-h-[44px] transition-all active:scale-[0.98]">+ Add Item</button>`
}

function renderPricing(d) {
  return [
    fieldInput('pricing.subtotal', 'Subtotal', d.pricing?.subtotal, 'number'),
    fieldInput('pricing.total_amount', 'Total Amount', d.pricing?.total_amount, 'number'),
  ].join('')
}

function renderFees(d) {
  const fees = d.fees || {}
  const standard = FEE_FIELDS.map((key) =>
    fieldInput(`fees.${key}`, formatLabel(key), fees[key], 'number')
  ).join('')

  const otherFees = (fees.other_fees || []).map((fee, i) => `
    <div class="border border-gray-100 rounded-xl p-3 mb-2" data-other-fee="${i}">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs text-gray-500">Other Fee ${i + 1}</span>
        <button type="button" data-action="remove-other-fee" data-index="${i}" class="text-red-500 text-xs min-h-[44px] px-2">Remove</button>
      </div>
      ${fieldInput(`fees.other_fees.${i}.name`, 'Name', fee.name, 'text')}
      ${fieldInput(`fees.other_fees.${i}.amount`, 'Amount', fee.amount, 'number')}
    </div>
  `).join('')

  return standard + otherFees +
    `<button type="button" data-action="add-other-fee" class="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-indigo-600 min-h-[44px] mt-2">+ Add Other Fee</button>`
}

function renderDiscounts(d) {
  const discounts = d.discounts || {}
  const standard = DISCOUNT_FIELDS.map((key) =>
    fieldInput(`discounts.${key}`, formatLabel(key), discounts[key], 'number', true)
  ).join('')

  const other = (discounts.other_discounts || []).map((disc, i) => `
    <div class="border border-gray-100 rounded-xl p-3 mb-2" data-other-discount="${i}">
      <div class="flex justify-between mb-2">
        <span class="text-xs text-gray-500">Other Discount ${i + 1}</span>
        <button type="button" data-action="remove-other-discount" data-index="${i}" class="text-red-500 text-xs min-h-[44px] px-2">Remove</button>
      </div>
      ${fieldInput(`discounts.other_discounts.${i}`, 'Value', disc, 'number', true)}
    </div>
  `).join('')

  return standard + other +
    `<button type="button" data-action="add-other-discount" class="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-indigo-600 min-h-[44px] mt-2">+ Add Other Discount</button>`
}

function renderPayment(d) {
  return [
    fieldInput('payment.method', 'Method', d.payment?.method, 'text'),
    fieldInput('payment.status', 'Status', d.payment?.status, 'text', true),
  ].join('')
}

function fieldInput(path, label, value, type, nullable = false, constraints = {}) {
  const displayValue = value === null || value === undefined ? '' : value
  const fieldId = `field-${path.replace(/\./g, '-')}`
  const attrs = []
  if (constraints.required) attrs.push('required')
  if (constraints.min !== undefined) attrs.push(`min="${constraints.min}"`)
  if (constraints.step !== undefined) attrs.push(`step="${constraints.step}"`)
  return `
    <label class="block mb-3" for="${fieldId}">
      <span class="text-xs text-gray-500 mb-1 block">${label}</span>
      <input
        id="${fieldId}"
        name="${fieldId}"
        type="${type}"
        data-path="${path}"
        value="${escapeAttr(String(displayValue))}"
        autocomplete="off"
        class="w-full rounded-xl border border-gray-200 p-3 text-base min-h-[44px] focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
        ${nullable ? 'placeholder="null"' : ''}
        ${attrs.join(' ')}
      />
    </label>
  `
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function coerceValue(input) {
  const path = input.dataset.path || ''

  if (input.type === 'number') {
    if (input.value === '') return input.placeholder === 'null' ? null : 0
    const num = parseFloat(input.value)
    if (isNaN(num)) return 0
    if (path.endsWith('quantity.count')) {
      return Math.max(1, Math.floor(num))
    }
    return num
  }
  if (input.placeholder === 'null' && input.value === '') return null
  return input.value
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const nextIsIndex = /^\d+$/.test(nextKey)

    if (/^\d+$/.test(key)) {
      const idx = parseInt(key, 10)
      if (current[idx] === undefined || current[idx] === null) {
        current[idx] = nextIsIndex ? [] : {}
      }
      current = current[idx]
    } else {
      if (current[key] === undefined || current[key] === null) {
        current[key] = nextIsIndex ? [] : {}
      }
      current = current[key]
    }
  }

  const lastKey = keys[keys.length - 1]
  if (/^\d+$/.test(lastKey)) {
    current[parseInt(lastKey, 10)] = value
  } else {
    current[lastKey] = value
  }
}

export function initSuccess() {
  const viewHistoryBtn = document.getElementById('view-history-btn')
  const addAnotherBtn = document.getElementById('add-another-btn')

  viewHistoryBtn?.addEventListener('click', () => {
    navigate('history', { resetStack: true, reload: true })
  })

  addAnotherBtn?.addEventListener('click', () => {
    resetForNewReceipt()
    navigate('home', { resetStack: true })
  })

  return {
    onEnter() {
      clearSessionAfterSave()
    },
  }
}
