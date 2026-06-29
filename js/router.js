import { state } from './state.js'

const TAB_VIEWS = new Set(['home', 'history', 'settings'])
const FLOW_VIEWS = new Set(['json-input', 'review', 'success', 'history-detail'])

const viewHooks = {}

export function registerViewHook(viewId, hooks = {}) {
  viewHooks[viewId] = hooks
}

export function navigate(viewId, { push = true, resetStack = false, reload = false } = {}) {
  if (push && state.currentView && state.currentView !== viewId) {
    state.viewStack.push(state.currentView)
  }

  if (resetStack || TAB_VIEWS.has(viewId)) {
    state.viewStack = []
  }

  const prev = state.currentView
  const viewChanged = prev !== viewId
  state.currentView = viewId

  document.querySelectorAll('[data-view]').forEach((el) => {
    const isActive = el.dataset.view === viewId
    el.classList.toggle('hidden', !isActive)
    el.classList.toggle('opacity-0', !isActive)
    el.classList.toggle('pointer-events-none', !isActive)
    el.classList.toggle('opacity-100', isActive)
  })

  const bottomNav = document.getElementById('bottom-nav')
  if (bottomNav) {
    const showNav = TAB_VIEWS.has(viewId)
    bottomNav.classList.toggle('hidden', !showNav)
  }

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const active = btn.dataset.nav === viewId
    btn.classList.toggle('text-indigo-600', active)
    btn.classList.toggle('text-gray-400', !active)
  })

  if (viewHooks[viewId]?.onEnter && (viewChanged || reload)) {
    viewHooks[viewId].onEnter(prev)
  }
}

export function back() {
  if (state.viewStack.length > 0) {
    const prev = state.viewStack.pop()
    navigate(prev, { push: false })
    return
  }
  navigate('home', { push: false, resetStack: true })
}

export function isFlowView(viewId) {
  return FLOW_VIEWS.has(viewId)
}

export function isTabView(viewId) {
  return TAB_VIEWS.has(viewId)
}
