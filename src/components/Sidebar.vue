<template>
  <aside
    class="shrink-0 bg-surface border-r border-slate-800 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
    :class="expanded ? 'w-52' : 'w-14'"
  >

    <!-- 토글 버튼 -->
    <button
      class="flex items-center justify-center h-10 border-b border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-elevated transition-colors shrink-0"
      @click="expanded = !expanded"
      :title="expanded ? '사이드바 접기' : '사이드바 열기'"
    >
      <svg class="w-4 h-4 transition-transform duration-300" :class="expanded ? '' : 'rotate-180'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="flex-1 overflow-y-auto overflow-x-hidden">

      <!-- 필터 섹션 -->
      <div class="border-b border-slate-800" :class="expanded ? 'px-3 pt-4 pb-3' : 'py-3 flex justify-center'">
        <template v-if="expanded">
          <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Filters</p>
          <FilterBar ref="filterBarRef" :vertical="true" @change="emit('filter-change')" />
        </template>
        <template v-else>
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="필터">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 4h18M7 10h10M11 16h2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- 최근 검색 -->
      <div v-if="history.length" class="border-b border-slate-800" :class="expanded ? 'px-3 py-3' : 'py-3 flex justify-center'">
        <template v-if="expanded">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Recent</p>
            <button class="text-[10px] text-slate-600 hover:text-slate-400 transition-colors" @click="clearHistory">Clear</button>
          </div>
          <div class="flex flex-col gap-0.5">
            <div
              v-for="q in history"
              :key="q"
              class="flex items-center gap-1 group"
            >
              <button
                class="flex-1 text-left text-xs px-2 py-1.5 rounded-lg text-slate-500 hover:bg-elevated hover:text-slate-200 truncate transition-all duration-150"
                @click="emit('search', q)"
              >
                {{ q }}
              </button>
              <button
                class="opacity-0 group-hover:opacity-100 text-[10px] text-slate-700 hover:text-red-400 transition-all px-1"
                @click="removeHistory(q)"
              >✕</button>
            </div>
          </div>
        </template>
        <template v-else>
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="최근 검색">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- 빠른 검색 / AI 추천 -->
      <div :class="expanded ? 'px-3 py-3' : 'py-3 flex justify-center'">
        <template v-if="expanded">
          <div class="flex items-center gap-2 mb-2">
            <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              {{ aiSuggestions.length ? 'Related' : 'Quick Search' }}
            </p>
            <span v-if="isSuggesting" class="text-[10px] text-primary animate-pulse">loading...</span>
          </div>
          <div v-if="aiSuggestions.length" class="flex flex-col gap-0.5">
            <button
              v-for="s in aiSuggestions"
              :key="s.query"
              class="text-left px-2 py-1.5 text-xs rounded-lg text-slate-500 hover:bg-elevated hover:text-slate-200 transition-all duration-150 truncate"
              :title="s.reason"
              @click="emit('search', s.query)"
            >
              {{ s.query }}
            </button>
          </div>
          <div v-else class="flex flex-col gap-0.5">
            <button
              v-for="tag in quickTags"
              :key="tag.en"
              class="text-left px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-700 hover:bg-elevated transition-all duration-150"
              @click="emit('search', tag.en)"
            >
              <span class="text-xs font-medium text-slate-400">{{ tag.en }}</span>
              <span class="block text-[10px] text-slate-600 mt-0.5">{{ tag.ko }}</span>
            </button>
          </div>
        </template>
        <template v-else>
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="빠른 검색">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

    </div>
  </aside>
</template>

<script setup>
import { ref, watch } from 'vue'
import FilterBar from './FilterBar.vue'
import { useSearchHistory } from '../composables/useSearchHistory.js'
import { suggestQueries } from '../composables/useOpenAI.js'

const props = defineProps({ lastQuery: { type: String, default: '' } })
const emit  = defineEmits(['search', 'filter-change'])

const { history, removeHistory, clearHistory } = useSearchHistory()

const filterBarRef  = ref(null)
const aiSuggestions = ref([])
const isSuggesting  = ref(false)
const expanded      = ref(true)

watch(() => props.lastQuery, async (q) => {
  if (!q?.trim()) return
  isSuggesting.value  = true
  aiSuggestions.value = []
  try {
    aiSuggestions.value = await suggestQueries(q)
  } catch { /* 실패 시 정적 태그로 폴백 */ }
  finally { isSuggesting.value = false }
})

const quickTags = [
  { en: 'BRCA1',                ko: 'BRCA1 유전자' },
  { en: 'cancer immunotherapy', ko: '암 면역치료' },
  { en: 'Alzheimer disease',    ko: '알츠하이머' },
  { en: 'COVID-19 drug',        ko: 'COVID-19 치료제' },
  { en: 'CRISPR therapy',       ko: 'CRISPR 유전자치료' },
  { en: 'PD-1 PD-L1',          ko: '면역관문억제제' },
]

const filters = ref({})
watch(filterBarRef, (ref) => {
  if (ref) filters.value = ref.filters
})

defineExpose({
  get filters() { return filterBarRef.value?.filters ?? {} },
  setYearRange(from, to) { filterBarRef.value?.setYearRange(from, to) },
  collapse() { expanded.value = false },
})
</script>
