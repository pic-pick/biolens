<template>
  <div class="h-screen flex flex-col bg-base overflow-hidden">

    <!-- Header -->
    <AppHeader
      :is-loading="isLoading"
      :current-query="currentQuery"
      @search="handleSearch"
      @query-input="currentQuery = $event"
    />

    <!-- Body -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Left sidebar -->
      <Sidebar
        ref="sidebar"
        :last-query="lastQuery"
        @search="handleSearch"
        @filter-change="onFilterChange"
      />

      <!-- Main content -->
      <main class="flex-1 flex flex-col overflow-hidden">

        <!-- Tab bar -->
        <div class="shrink-0 bg-surface border-b border-slate-800 px-6 flex items-center">
          <div class="flex">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ 'tab-active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
              <span
                v-if="tab.count > 0"
                class="ml-1.5 text-xs px-1.5 py-0.5 rounded-md tabular-nums"
                :class="activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-slate-800 text-slate-500'"
              >{{ tab.count.toLocaleString() }}</span>
              <!-- 슬라이딩 인디케이터 -->
              <span
                class="tab-indicator"
                :class="activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'"
              />
            </button>
          </div>
        </div>

        <!-- 스크롤 진행 바 -->
        <div class="h-[2px] bg-slate-900 shrink-0 relative overflow-hidden">
          <div
            class="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-100"
            :style="{ width: `${scrollProgress}%` }"
          />
        </div>

        <!-- Tab content -->
        <div
          ref="scrollContainer"
          class="overflow-y-auto flex-1 p-6"
          @scroll="onScroll"
        >

          <!-- Explore tab -->
          <template v-if="activeTab === 'explore'">

            <!-- Loading skeleton -->
            <div v-if="isLoading" class="grid grid-cols-2 gap-4">
              <SkeletonCard v-for="n in 6" :key="n" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="text-center py-16 text-red-400">
              <p class="text-base">{{ error }}</p>
            </div>

            <!-- Results grid -->
            <template v-else-if="results.length > 0">
              <!-- 연구 동향 차트 -->
              <div v-if="hasYearData || isChartLoading" class="mb-5 bg-surface border border-slate-800 rounded-xl overflow-hidden">
                <button
                  class="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-elevated transition-all duration-150"
                  @click="showChart = !showChart"
                >
                  <span class="flex items-center gap-2 uppercase tracking-widest">
                    Research Trend (2000 — present)
                    <span v-if="selectedChartYear" class="text-warning normal-case font-semibold">{{ selectedChartYear }}년 선택됨</span>
                    <span v-else-if="isChartLoading" class="text-primary animate-pulse normal-case">loading...</span>
                  </span>
                  <svg
                    class="w-4 h-4 transition-transform duration-200"
                    :class="showChart ? 'rotate-180' : ''"
                    fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div v-if="showChart" class="px-4 pb-4 max-h-56">
                  <TrendChart
                    :year-counts="yearCounts"
                    :selected-year="selectedChartYear"
                    @year-click="onYearClick"
                  />
                </div>
              </div>

              <!-- Masonry 2열 -->
              <div class="flex gap-4 items-start">
                <div class="flex-1 flex flex-col gap-4">
                  <PaperCard
                    v-for="(paper, ci) in leftCol"
                    :key="paper.pmid"
                    :paper="paper"
                    :fetch-abstract-single="fetchAbstractSingle"
                    :is-selected="isSelected(paper)"
                    :select-disabled="!isSelected(paper) && selectedPapers.length >= MAX_SELECT"
                    :index="ci * 2"
                    @toggle="toggleSelect"
                  />
                </div>
                <div class="flex-1 flex flex-col gap-4">
                  <PaperCard
                    v-for="(paper, ci) in rightCol"
                    :key="paper.pmid"
                    :paper="paper"
                    :fetch-abstract-single="fetchAbstractSingle"
                    :is-selected="isSelected(paper)"
                    :select-disabled="!isSelected(paper) && selectedPapers.length >= MAX_SELECT"
                    :index="ci * 2 + 1"
                    @toggle="toggleSelect"
                  />
                </div>
              </div>

              <!-- Load more -->
              <div v-if="canLoadMore" class="flex justify-center pt-8">
                <button
                  class="btn-ghost px-8 py-3"
                  :disabled="isLoadingMore"
                  @click="handleLoadMore"
                >
                  <span v-if="isLoadingMore" class="flex items-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>불러오는 중
                  </span>
                  <span v-else>다음 20개 보기</span>
                </button>
              </div>
              <p
                v-else-if="results.length >= totalCount || results.length >= 10000"
                class="text-center text-xs text-slate-600 py-6 uppercase tracking-widest"
              >
                All {{ results.length.toLocaleString() }} results loaded
              </p>
            </template>

            <!-- Empty state -->
            <EmptyState v-else :state="emptyState" />
          </template>

          <!-- Scrap board tab -->
          <template v-else-if="activeTab === 'scrap'">
            <ScrapBoard />
          </template>

        </div>
      </main>
    </div>

    <!-- Floating Action Bar (선택됐을 때) -->
    <Transition name="float-bar">
      <div
        v-if="selectedPapers.length > 0 && activeTab === 'explore'"
        class="fixed bottom-6 left-1/2 z-40"
        style="transform: translateX(-50%); animation: floatUp 0.35s ease forwards;"
      >
        <div class="flex items-center gap-3 px-5 py-3 bg-elevated border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-sm">
          <span class="text-xs text-slate-400 font-medium tabular-nums">
            <span class="text-slate-100 font-semibold">{{ selectedPapers.length }}</span>
            <span class="text-slate-600"> / {{ MAX_SELECT }}</span>
            &nbsp;selected
          </span>
          <div class="w-px h-4 bg-slate-700" />
          <button
            class="btn-primary text-xs px-4 py-2 disabled:opacity-40"
            :disabled="selectedPapers.length < 2"
            @click="showSynthesis = true"
          >
            Analyze
          </button>
          <button
            class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            @click="clearSelection"
          >Cancel</button>
        </div>
      </div>
    </Transition>

    <!-- Synthesis panel -->
    <SynthesisPanel
      v-if="showSynthesis"
      :papers="selectedPapers"
      @close="showSynthesis = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AppHeader      from './components/AppHeader.vue'
import Sidebar        from './components/Sidebar.vue'
import ScrapBoard     from './components/ScrapBoard.vue'
import SkeletonCard   from './components/SkeletonCard.vue'
import PaperCard      from './components/PaperCard.vue'
import EmptyState     from './components/EmptyState.vue'
import SynthesisPanel from './components/SynthesisPanel.vue'
import TrendChart     from './components/TrendChart.vue'
import { usePubmed }  from './composables/usePubmed.js'
import { fetchCitations } from './composables/useICite.js'
import { useScrap }   from './composables/useScrap.js'
import { useSearchHistory } from './composables/useSearchHistory.js'

const {
  results, totalCount, isLoading, isLoadingMore, canLoadMore, error,
  search, loadMore, fetchAbstractSingle,
  yearCounts, isChartLoading, fetchYearCounts,
} = usePubmed()

const { papers: scrapPapers, syntheses } = useScrap()
const { addHistory } = useSearchHistory()

const sidebar      = ref(null)
const scrollContainer = ref(null)
const scrollProgress  = ref(0)

// 차트
const showChart       = ref(false)
const selectedChartYear = ref(null)
const hasYearData = computed(() => yearCounts.value && Object.keys(yearCounts.value).length > 0)

// 탭
const activeTab = ref('explore')
const tabs = computed(() => [
  {
    id: 'explore',
    label: 'Explore',
    count: results.value.length > 0 ? totalCount.value : 0,
  },
  {
    id: 'scrap',
    label: 'Saved',
    count: scrapPapers.value.length + syntheses.value.length,
  },
])

// Query
const hasSearched  = ref(false)
const lastQuery    = ref('')
const currentQuery = ref('')

// Multi-select
const selectedPapers = ref([])
const showSynthesis  = ref(false)
const MAX_SELECT = 5

const emptyState = computed(() => {
  if (!hasSearched.value) return 'initial'
  if (/[\uAC00-\uD7A3]/.test(lastQuery.value)) return 'korean'
  return 'empty'
})

function toggleSelect(paper) {
  const idx = selectedPapers.value.findIndex((p) => p.pmid === paper.pmid)
  if (idx === -1) {
    if (!paper.abstract) return
    if (selectedPapers.value.length >= MAX_SELECT) return
    selectedPapers.value.push(paper)
  } else {
    selectedPapers.value.splice(idx, 1)
  }
}

function isSelected(paper) {
  return selectedPapers.value.some((p) => p.pmid === paper.pmid)
}

function clearSelection() {
  selectedPapers.value = []
}

// Masonry
const leftCol  = computed(() => results.value.filter((_, i) => i % 2 === 0))
const rightCol = computed(() => results.value.filter((_, i) => i % 2 === 1))

// Scroll progress
function onScroll(e) {
  const el = e.target
  const max = el.scrollHeight - el.clientHeight
  scrollProgress.value = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0
}

// Saved 탭 진입 시 사이드바 자동 접기
watch(activeTab, (tab) => {
  if (tab === 'scrap') sidebar.value?.collapse()
})

// 필터 변경 → 자동 재검색 (새 검색어 이력 추가 없이)
async function reSearch() {
  if (!hasSearched.value || !lastQuery.value) return
  selectedPapers.value = []
  scrollProgress.value = 0
  const filters = sidebar.value?.filters ?? {}
  await search(lastQuery.value, filters)
  if (results.value.length > 0) {
    applyICite(results.value.map((p) => p.pmid))
  }
}

function onFilterChange() {
  reSearch()
}

// 차트 연도 바 클릭
function onYearClick(year) {
  if (year === null) {
    selectedChartYear.value = null
    sidebar.value?.setYearRange(null, null)
  } else {
    selectedChartYear.value = String(year)
    sidebar.value?.setYearRange(year, year)
  }
  // setYearRange → FilterBar watch → filter-change → reSearch 자동 호출됨
}

// Search
async function handleSearch(query) {
  hasSearched.value     = true
  lastQuery.value       = query
  currentQuery.value    = query
  selectedPapers.value  = []
  activeTab.value       = 'explore'
  scrollProgress.value  = 0
  selectedChartYear.value = null
  addHistory(query)

  const filters = sidebar.value?.filters ?? {}
  await search(query, filters)

  if (results.value.length > 0) {
    fetchYearCounts(query, filters)
    applyICite(results.value.map((p) => p.pmid))
  }
}

// Load more
async function handleLoadMore() {
  const prevLength = results.value.length
  await loadMore()
  const newPmids = results.value.slice(prevLength).map((p) => p.pmid)
  if (newPmids.length > 0) applyICite(newPmids)
}

// iCite
async function applyICite(pmids) {
  const citationMap = await fetchCitations(pmids)
  results.value.forEach((card) => {
    if (!pmids.includes(card.pmid)) return
    const data = citationMap.get(card.pmid)
    if (data) {
      card.citationCount = data.citationCount
      card.rcr           = data.rcr
    }
  })
}
</script>

<style scoped>
.float-bar-enter-active { animation: floatUp 0.35s ease forwards; }
.float-bar-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.float-bar-leave-to     { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
