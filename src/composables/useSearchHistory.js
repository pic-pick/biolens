import { ref } from 'vue'

const MAX = 8
const KEY = 'biolens_history'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

const history = ref(load())

export function useSearchHistory() {
  function addHistory(query) {
    const q = query.trim()
    if (!q) return
    history.value = [q, ...history.value.filter((h) => h !== q)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(history.value))
  }

  function removeHistory(query) {
    history.value = history.value.filter((h) => h !== query)
    localStorage.setItem(KEY, JSON.stringify(history.value))
  }

  function clearHistory() {
    history.value = []
    localStorage.removeItem(KEY)
  }

  return { history, addHistory, removeHistory, clearHistory }
}
