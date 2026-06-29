import { clearAll, getAllReceipts, exportAllReceipts, importReceipts } from '../db.js'
import { validateReceipt } from '../validation.js'
import { showToast } from './home.js'

export function initSettings() {
  const clearBtn = document.getElementById('clear-all-btn')
  const exportBtn = document.getElementById('export-data-btn')
  const importBtn = document.getElementById('import-data-btn')
  const importInput = document.getElementById('import-file-input')
  const receiptCount = document.getElementById('receipt-count')
  const offlineStatus = document.getElementById('offline-status')

  clearBtn?.addEventListener('click', async () => {
    if (!confirm('Delete all saved receipts? This cannot be undone.')) return
    await clearAll()
    await updateReceiptCount(receiptCount)
  })

  exportBtn?.addEventListener('click', async () => {
    try {
      const data = await exportAllReceipts()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.href = url
      link.download = `itemize-export-${date}.json`
      link.click()
      URL.revokeObjectURL(url)
      showToast(`Exported ${data.receipts.length} receipt${data.receipts.length === 1 ? '' : 's'}`)
    } catch {
      showToast('Export failed. Please try again.')
    }
  })

  importBtn?.addEventListener('click', () => {
    importInput?.click()
  })

  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    importInput.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const receipts = Array.isArray(parsed) ? parsed : parsed?.receipts

      if (!Array.isArray(receipts)) {
        showToast('Invalid file: no receipts found')
        return
      }

      const valid = receipts.filter((r) => {
        const { id, savedAt, order, updatedAt, wasUpsert, ...fields } = r || {}
        return validateReceipt(fields).ok
      })

      if (valid.length === 0) {
        showToast('No valid receipts in file')
        return
      }

      const mode = await askImportMode(valid.length)
      if (!mode) {
        showToast('Import cancelled')
        return
      }

      const imported = await importReceipts({ receipts: valid }, mode)
      await updateReceiptCount(receiptCount)
      showToast(`Imported ${imported} receipt${imported === 1 ? '' : 's'}`)
    } catch {
      showToast('Import failed. Check the file format.')
    }
  })

  return {
    async onEnter() {
      await updateReceiptCount(receiptCount)
      if (offlineStatus) {
        offlineStatus.textContent = navigator.onLine ? 'Online — offline ready' : 'Offline — fully functional'
      }
    },
  }
}

function askImportMode(count) {
  return new Promise((resolve) => {
    const modal = document.getElementById('import-modal')
    const countEl = document.getElementById('import-modal-count')
    const mergeBtn = document.getElementById('import-merge-btn')
    const replaceBtn = document.getElementById('import-replace-btn')
    const cancelBtn = document.getElementById('import-cancel-btn')

    if (!modal || !mergeBtn || !replaceBtn || !cancelBtn) {
      resolve(null)
      return
    }

    if (countEl) countEl.textContent = String(count)

    function finish(mode) {
      modal.classList.add('hidden')
      modal.classList.remove('flex')
      document.removeEventListener('keydown', onKeyDown)
      mergeBtn.removeEventListener('click', onMerge)
      replaceBtn.removeEventListener('click', onReplace)
      cancelBtn.removeEventListener('click', onCancel)
      modal.removeEventListener('click', onBackdrop)
      resolve(mode)
    }

    function onMerge() { finish('merge') }
    function onReplace() { finish('replace') }
    function onCancel() { finish(null) }
    function onBackdrop(e) {
      if (e.target === modal) finish(null)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') finish(null)
    }

    mergeBtn.addEventListener('click', onMerge)
    replaceBtn.addEventListener('click', onReplace)
    cancelBtn.addEventListener('click', onCancel)
    modal.addEventListener('click', onBackdrop)
    document.addEventListener('keydown', onKeyDown)

    modal.classList.remove('hidden')
    modal.classList.add('flex')
  })
}

async function updateReceiptCount(receiptCount) {
  if (!receiptCount) return
  const receipts = await getAllReceipts()
  receiptCount.textContent = `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} saved`
}
