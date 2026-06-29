import { RECEIPT_PROMPT } from '../prompt.js'
import { navigate } from '../router.js'
import { state } from '../state.js'

export function initHome() {
  const promptText = document.getElementById('prompt-text')
  const promptModalText = document.getElementById('prompt-modal-text')
  const copyBtn = document.getElementById('copy-prompt-btn')
  const expandBtn = document.getElementById('expand-prompt-btn')
  const pasteJsonBtn = document.getElementById('paste-json-btn')
  const promptModal = document.getElementById('prompt-modal')
  const closeModalBtn = document.getElementById('close-prompt-modal')

  if (promptText) promptText.value = RECEIPT_PROMPT
  if (promptModalText) promptModalText.value = RECEIPT_PROMPT

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(RECEIPT_PROMPT)
      const label = copyBtn.querySelector('[data-copy-label]')
      if (label) {
        const original = label.textContent
        label.textContent = 'Copied!'
        setTimeout(() => { label.textContent = original }, 1500)
      }
    } catch {
      showToast('Unable to copy. Please copy manually.')
    }
  })

  expandBtn?.addEventListener('click', () => {
    promptModal?.classList.remove('hidden')
    promptModal?.classList.add('flex')
  })

  closeModalBtn?.addEventListener('click', () => {
    promptModal?.classList.add('hidden')
    promptModal?.classList.remove('flex')
  })

  promptModal?.addEventListener('click', (e) => {
    if (e.target === promptModal) {
      promptModal.classList.add('hidden')
      promptModal.classList.remove('flex')
    }
  })

  pasteJsonBtn?.addEventListener('click', () => {
    state.editingId = null
    state.receiptData = null
    state.rawJson = ''
    navigate('json-input', { reload: true })
  })
}

function showToast(message) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.remove('hidden', 'opacity-0')
  toast.classList.add('opacity-100')
  setTimeout(() => {
    toast.classList.add('opacity-0')
    setTimeout(() => toast.classList.add('hidden'), 300)
  }, 2500)
}

export { showToast }
