import { state } from '../state.js'
import { validateJson, formatJson } from '../validation.js'
import { getReceiptByOrderId } from '../db.js'
import { navigate } from '../router.js'
import { showToast } from './home.js'

export function initJsonInput() {
  const textarea = document.getElementById('json-textarea')
  const errorEl = document.getElementById('json-error')
  const charCount = document.getElementById('json-char-count')
  const reviewBtn = document.getElementById('review-receipt-btn')
  const pasteBtn = document.getElementById('json-paste-btn')
  const formatBtn = document.getElementById('json-format-btn')
  const clearBtn = document.getElementById('json-clear-btn')
  const backBtn = document.getElementById('json-back-btn')

  function resetReviewButton() {
    reviewBtn.disabled = false
    reviewBtn.classList.remove('opacity-50', 'cursor-not-allowed')
  }

  function disableReviewButton() {
    reviewBtn.disabled = true
    reviewBtn.classList.add('opacity-50', 'cursor-not-allowed')
  }

  async function updateValidation() {
    const text = textarea.value
    state.rawJson = text
    charCount.textContent = `${text.length} characters`

    if (!text.trim()) {
      errorEl.textContent = ''
      errorEl.classList.add('hidden')
      disableReviewButton()
      return
    }

    const result = validateJson(text)
    if (!result.ok) {
      errorEl.textContent = result.error
      errorEl.classList.remove('hidden')
      disableReviewButton()
      return
    }

    if (!state.editingId) {
      const existing = await getReceiptByOrderId(result.data.order_id)
      if (existing) {
        errorEl.textContent = 'Bill already uploaded. Edit in History.'
        errorEl.classList.remove('hidden')
        disableReviewButton()
        return
      }
    }

    errorEl.textContent = ''
    errorEl.classList.add('hidden')
    resetReviewButton()
  }

  textarea?.addEventListener('input', () => {
    updateValidation()
  })

  pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText()
      textarea.value = text
      updateValidation()
    } catch {
      showToast('Unable to paste from clipboard.')
    }
  })

  formatBtn?.addEventListener('click', () => {
    const result = formatJson(textarea.value)
    if (result.ok) {
      textarea.value = result.data
      updateValidation()
    } else {
      errorEl.textContent = result.error
      errorEl.classList.remove('hidden')
    }
  })

  clearBtn?.addEventListener('click', () => {
    textarea.value = ''
    state.rawJson = ''
    updateValidation()
  })

  backBtn?.addEventListener('click', () => {
    state.rawJson = ''
    navigate('home', { push: false, resetStack: true })
  })

  reviewBtn?.addEventListener('click', async () => {
    const result = validateJson(textarea.value)
    if (!result.ok) return

    if (!state.editingId) {
      const existing = await getReceiptByOrderId(result.data.order_id)
      if (existing) {
        errorEl.textContent = 'Bill already uploaded. Edit in History.'
        errorEl.classList.remove('hidden')
        disableReviewButton()
        showToast('Bill already uploaded. Edit in History.')
        return
      }
    }

    state.receiptData = result.data
    state.rawJson = textarea.value
    navigate('review', { reload: true })
  })

  return {
    onEnter() {
      textarea.value = state.rawJson || ''
      resetReviewButton()
      updateValidation()
    },
  }
}
