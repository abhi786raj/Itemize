import { state } from '../state.js'
import { getAllReceipts, getReceipt, deleteReceipt } from '../db.js'
import { navigate } from '../router.js'
import { showToast } from './home.js'

let allReceipts = []
let selectedId = null

export function initHistory() {
  const searchInput = document.getElementById('history-search')
  const listContainer = document.getElementById('history-list')
  const backBtn = document.getElementById('detail-back-btn')
  const editBtn = document.getElementById('detail-edit-btn')
  const deleteBtn = document.getElementById('detail-delete-btn')

  searchInput?.addEventListener('input', () => {
    renderList(listContainer, filterReceipts(searchInput.value))
  })

  backBtn?.addEventListener('click', () => {
    selectedId = null
    navigate('history', { push: false })
  })

  editBtn?.addEventListener('click', async () => {
    if (!selectedId) return
    const receipt = await getReceipt(selectedId)
    if (!receipt) {
      showToast('Receipt not found')
      return
    }
    state.editingId = receipt.id
    state.receiptData = normalizeReceipt(stripMeta(receipt))
    state.rawJson = ''
    navigate('review', { push: true, reload: true })
  })

  deleteBtn?.addEventListener('click', async () => {
    if (!selectedId) return
    if (!confirm('Delete this receipt? This cannot be undone.')) return
    await deleteReceipt(selectedId)
    selectedId = null
    navigate('history', { push: false })
    await loadAndRender(listContainer, searchInput?.value || '')
  })

  return {
    async onEnter() {
      if (state.currentView === 'history') {
        await loadAndRender(listContainer, searchInput?.value || '')
      }
    },
  }
}

export function initHistoryDetail() {
  return {
    async onEnter() {
      if (selectedId) {
        const receipt = await getReceipt(selectedId)
        if (receipt) renderDetail(receipt)
      }
    },
  }
}

async function loadAndRender(container, query) {
  allReceipts = await getAllReceipts()
  renderList(container, filterReceipts(query))
}

function filterReceipts(query) {
  if (!query.trim()) return allReceipts
  const q = query.toLowerCase()
  return allReceipts.filter((r) => {
    const method = r.payment?.method || ''
    return (
      (r.platform || '').toLowerCase().includes(q) ||
      (r.order_id || '').toLowerCase().includes(q) ||
      method.toLowerCase().includes(q)
    )
  })
}

function renderList(container, receipts) {
  if (!container) return

  if (receipts.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p class="text-gray-500 text-sm">No receipts saved yet.</p>
      </div>
    `
    return
  }

  container.innerHTML = receipts.map((r) => `
    <button
      type="button"
      data-receipt-id="${r.id}"
      class="w-full bg-white rounded-2xl shadow-sm p-4 mb-3 text-left transition-all active:scale-[0.98] hover:shadow-md"
    >
      <div class="flex justify-between items-start mb-2">
        <span class="font-semibold text-gray-900">${escapeHtml(r.platform || 'Unknown')}</span>
        <span class="text-sm font-medium text-indigo-600">${formatCurrency(r.pricing?.total_amount, r.currency)}</span>
      </div>
      <div class="text-sm text-gray-600 space-y-1">
        <p>Order: ${escapeHtml(r.order_id || '—')}</p>
        <p>Date: ${escapeHtml(r.order_date || '—')}</p>
        <p>Payment: ${escapeHtml(r.payment?.method || '—')}</p>
      </div>
    </button>
  `).join('')

  container.querySelectorAll('[data-receipt-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedId = btn.dataset.receiptId
      navigate('history-detail')
    })
  })
}

function renderDetail(receipt) {
  const container = document.getElementById('detail-content')
  if (!container) return

  const d = stripMeta(receipt)
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Order Information</h3>
      ${detailRow('Order ID', d.order_id)}
      ${detailRow('Platform', d.platform)}
      ${detailRow('Status', d.status)}
      ${detailRow('Date', d.order_date)}
      ${detailRow('Currency', d.currency)}
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Items (${(d.items || []).length})</h3>
      ${(d.items || []).map((item) => `
        <div class="border-b border-gray-100 py-2 last:border-0">
          <p class="font-medium text-gray-900">${escapeHtml(item.name || '—')}</p>
          <p class="text-sm text-gray-500">Qty: ${item.quantity?.count ?? 0} ${escapeHtml(item.quantity?.unit || '')} · ${formatCurrency(item.price, d.currency)}</p>
        </div>
      `).join('')}
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Pricing</h3>
      ${detailRow('Subtotal', formatCurrency(d.pricing?.subtotal, d.currency))}
      ${detailRow('Total', formatCurrency(d.pricing?.total_amount, d.currency))}
    </div>
    <div class="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">Payment</h3>
      ${detailRow('Method', d.payment?.method)}
      ${detailRow('Status', d.payment?.status ?? '—')}
    </div>
  `
}

function detailRow(label, value) {
  return `<div class="flex justify-between py-1.5 text-sm"><span class="text-gray-500">${label}</span><span class="text-gray-900 font-medium">${escapeHtml(String(value ?? '—'))}</span></div>`
}

function stripMeta(receipt) {
  const { id, savedAt, ...data } = receipt
  return data
}

function normalizeReceipt(data) {
  const clean = JSON.parse(JSON.stringify(data))
  delete clean.order
  return clean
}

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined) return '—'
  const sym = currency || ''
  return `${sym}${Number(amount).toFixed(2)}`.trim()
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function getSelectedReceiptId() {
  return selectedId
}

export async function refreshHistoryOnDetailEnter() {
  if (selectedId) {
    const receipt = await getReceipt(selectedId)
    if (receipt) renderDetail(receipt)
  }
}
