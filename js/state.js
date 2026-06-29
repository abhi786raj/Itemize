export const state = {
  currentView: 'home',
  rawJson: '',
  receiptData: null,
  editingId: null,
  viewStack: [],
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function resetFlow() {
  state.rawJson = ''
  state.receiptData = null
  state.editingId = null
  state.viewStack = []
}

export function resetForNewReceipt() {
  resetFlow()
}

export function clearSessionAfterSave() {
  state.rawJson = ''
  state.receiptData = null
  state.editingId = null
}
