<template>
  <!-- 모바일 백드롭 -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
    @click="emit('close-mobile')"
  />

  <aside
    class="bg-surface border-r border-slate-800 flex flex-col overflow-hidden
           fixed top-0 left-0 h-screen z-50 w-72
           md:relative md:h-auto md:z-auto md:shrink-0
           transition-all duration-300 ease-in-out"
    :class="[
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      expanded ? 'md:w-52' : 'md:w-14',
    ]"
  >

    <!-- 토글 버튼 (데스크탑) / 닫기 버튼 (모바일) -->
    <button
      class="flex items-center justify-center h-10 border-b border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-elevated transition-colors shrink-0"
      :title="expanded ? '사이드바 접기' : '사이드바 열기'"
      @click="handleToggle"
    >
      <!-- 데스크탑: 접기/펼치기 화살표 -->
      <svg class="hidden md:block w-4 h-4 transition-transform duration-300" :class="expanded ? '' : 'rotate-180'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <!-- 모바일: X 닫기 -->
      <svg class="md:hidden w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="flex-1 overflow-y-auto overflow-x-hidden">

      <!-- 필터 섹션 -->
      <div class="border-b border-slate-800" :class="(expanded || props.mobileOpen) ? 'px-3 pt-4 pb-3' : 'py-3 flex justify-center'">
        <template v-if="expanded || props.mobileOpen">
          <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Filters</p>
          <FilterBar ref="filterBarRef" :vertical="true" @change="emit('filter-change')" />
        </template>
        <template v-else-if="!props.mobileOpen">
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="필터" @click="expanded = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 4h18M7 10h10M11 16h2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- 최근 검색 -->
      <div v-if="history.length" class="border-b border-slate-800" :class="(expanded || props.mobileOpen) ? 'px-3 py-3' : 'py-3 flex justify-center'">
        <template v-if="expanded || props.mobileOpen">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Recent</p>
            <button class="text-[10px] text-slate-600 hover:text-slate-400 transition-colors" @click="clearHistory">Clear</button>
          </div>
          <div class="flex flex-col gap-0.5">
            <div
              v-for="q in history"
              :key="q"
              class="sidebar-item group"
            >
              <span class="sidebar-accent" />
              <button
                class="flex-1 text-left text-xs text-slate-500 group-hover:text-slate-100 truncate transition-colors duration-200 min-w-0"
                @click="emit('search', q)"
              >{{ q }}</button>
              <button
                class="touch-show opacity-0 group-hover:opacity-100 text-[10px] text-slate-700 hover:text-red-400 transition-all duration-150 shrink-0 ml-1"
                @click.stop="removeHistory(q)"
              >✕</button>
            </div>
          </div>
        </template>
        <template v-else-if="!props.mobileOpen">
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="최근 검색" @click="expanded = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

      <!-- 빠른 검색 / AI 추천 / 트렌딩 -->
      <div :class="(expanded || props.mobileOpen) ? 'px-3 py-3' : 'py-3 flex justify-center'">
        <template v-if="expanded || props.mobileOpen">
          <div class="flex items-center gap-2 mb-2">
            <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              {{ aiSuggestions.length ? 'Related' : 'Trending' }}
            </p>
            <span v-if="isSuggesting || isTrendingLoading" class="text-[10px] text-primary animate-pulse">loading...</span>
          </div>

          <!-- AI 추천 (검색어 입력 후) -->
          <div v-if="aiSuggestions.length" class="flex flex-col gap-0.5">
            <button
              v-for="s in aiSuggestions"
              :key="s.query"
              class="sidebar-item group w-full text-left flex-col items-start gap-0"
              @click="emit('search', s.query)"
            >
              <span class="sidebar-accent" />
              <span class="text-xs text-slate-500 group-hover:text-slate-100 truncate w-full transition-colors duration-200">{{ s.query }}</span>
              <span v-if="s.reason" class="text-[10px] text-slate-700 group-hover:text-slate-500 mt-0.5 leading-tight transition-colors duration-200">{{ s.reason }}</span>
            </button>
          </div>

          <!-- 트렌딩 토픽 (OpenAlex) -->
          <div v-else-if="trendingTopics.length" class="flex flex-col gap-0.5">
            <button
              v-for="topic in trendingTopics"
              :key="topic.query"
              class="sidebar-item group w-full text-left flex-col items-start gap-0"
              @click="emit('search', topic.query)"
            >
              <span class="sidebar-accent" />
              <span class="text-xs font-medium text-slate-400 group-hover:text-slate-100 truncate w-full transition-colors duration-200">{{ topic.query }}</span>
              <span v-if="topic.count" class="text-[10px] text-slate-700 group-hover:text-slate-500 mt-0.5 transition-colors duration-200 tabular-nums">
                {{ topic.count.toLocaleString() }} papers · 30d
              </span>
            </button>
          </div>

          <!-- 폴백: 정적 태그 -->
          <div v-else class="flex flex-col gap-0.5">
            <button
              v-for="tag in quickTags"
              :key="tag.en"
              class="sidebar-item group w-full text-left flex-col items-start gap-0"
              @click="emit('search', tag.en)"
            >
              <span class="sidebar-accent" />
              <span class="text-xs font-medium text-slate-400 group-hover:text-slate-100 transition-colors duration-200">{{ tag.en }}</span>
              <span class="text-[10px] text-slate-600 group-hover:text-slate-500 mt-0.5 transition-colors duration-200">{{ tag.ko }}</span>
            </button>
          </div>
        </template>
        <template v-else-if="!props.mobileOpen">
          <button class="text-slate-600 hover:text-slate-300 transition-colors" title="트렌딩 토픽" @click="expanded = true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </div>

    </div>

    <!-- 하단 About / Settings -->
    <div
      class="shrink-0 border-t border-slate-800 flex flex-col"
      :class="(expanded || props.mobileOpen) ? 'px-3 py-3 gap-1' : 'py-3 items-center gap-3'"
    >
      <template v-if="expanded || props.mobileOpen">
        <button
          class="sidebar-item w-full text-left text-sm text-slate-500 hover:text-slate-300 transition-colors"
          title="About BioLens"
          @click="emit('about')"
        >
          <span class="sidebar-accent" />
          <svg class="w-4 h-4 shrink-0 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" stroke-linecap="round"/>
          </svg>
          About
        </button>
        <button
          class="sidebar-item w-full text-left text-sm text-slate-500 hover:text-slate-300 transition-colors"
          title="Settings"
          @click="showSettings = true"
        >
          <span class="sidebar-accent" />
          <svg class="w-4 h-4 shrink-0 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Settings
        </button>
      </template>
      <template v-else-if="!props.mobileOpen">
        <button class="text-slate-600 hover:text-slate-300 transition-colors p-1" title="About BioLens" @click="emit('about')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="text-slate-600 hover:text-slate-300 transition-colors p-1" title="Settings" @click="showSettings = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </template>
    </div>

  </aside>

  <SettingsModal v-if="showSettings" @close="showSettings = false" />
</template>

<script setup>
import { ref, watch } from 'vue'
import FilterBar from './FilterBar.vue'
import SettingsModal from './SettingsModal.vue'
import { useSearchHistory } from '../composables/useSearchHistory.js'
import { suggestQueries } from '../composables/useOpenAI.js'
import { useTrending } from '../composables/useTrending.js'

const props = defineProps({
  lastQuery:  { type: String,  default: '' },
  mobileOpen: { type: Boolean, default: false },
})
const emit  = defineEmits(['search', 'filter-change', 'about', 'close-mobile'])

function handleToggle() {
  // 모바일에서는 닫기, 데스크탑에서는 접기/펼치기
  if (window.innerWidth < 768) {
    emit('close-mobile')
  } else {
    expanded.value = !expanded.value
  }
}

const { history, removeHistory, clearHistory } = useSearchHistory()

const filterBarRef  = ref(null)
const aiSuggestions = ref([])
const isSuggesting  = ref(false)
const expanded      = ref(true)
const showSettings  = ref(false)

const { topics: trendingTopics, isLoading: isTrendingLoading } = useTrending()

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
  expand()   { expanded.value = true  },
})
</script>

<style scoped>
/* ── 사이드바 아이템 공통 ── */
.sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem 0.375rem 0.625rem;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: background 0.2s ease;
}
.sidebar-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: inherit;
  pointer-events: none;
}
.sidebar-item:hover::before { opacity: 1; }

/* 왼쪽 액센트 바 */
.sidebar-accent {
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 2px;
  border-radius: 1px;
  background: #6366f1;
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sidebar-item:hover .sidebar-accent { transform: scaleY(1); }

/* 풀 검색어 툴팁 */
.query-tooltip {
  pointer-events: none;
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 60;
  min-width: 10rem;
  max-width: 18rem;
  padding: 0.4rem 0.6rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  font-size: 0.72rem;
  color: #cbd5e1;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform: translateY(-50%) translateX(-4px);
}
.group:hover .query-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* 툴팁 왼쪽 화살표 */
.query-tooltip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #334155;
}
.query-tooltip::after {
  content: '';
  position: absolute;
  right: calc(100% - 1px);
  top: 50%;
  transform: translateY(-50%);
  border: 4px solid transparent;
  border-right-color: #1e293b;
}
</style>
