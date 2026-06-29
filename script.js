import { navigate, registerViewHook } from './js/router.js'
import { resetForNewReceipt } from './js/state.js'
import { initHome } from './js/views/home.js'
import { initJsonInput } from './js/views/json-input.js'
import { initReview, initSuccess } from './js/views/review.js'
import { initHistory, initHistoryDetail, refreshHistoryOnDetailEnter } from './js/views/history.js'
import { initSettings } from './js/views/settings.js'

async function initApp() {
  initHome()

  const jsonInputHooks = initJsonInput()
  registerViewHook('json-input', jsonInputHooks)

  const reviewHooks = initReview()
  registerViewHook('review', reviewHooks)

  const successHooks = initSuccess()
  registerViewHook('success', successHooks)

  const historyHooks = initHistory()
  registerViewHook('history', historyHooks)

  const historyDetailHooks = initHistoryDetail()
  registerViewHook('history-detail', {
    onEnter: async () => {
      await refreshHistoryOnDetailEnter()
      if (historyDetailHooks.onEnter) await historyDetailHooks.onEnter()
    },
  })

  const settingsHooks = initSettings()
  registerViewHook('settings', settingsHooks)

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'home') {
        resetForNewReceipt()
      }
      navigate(btn.dataset.nav, { resetStack: true, reload: true })
    })
  })

  navigate('home', { push: false, resetStack: true })
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: '/Itemize/' }).catch(() => {})
  })
}

initApp()
