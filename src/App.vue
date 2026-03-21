<template>
  <div class="h-screen flex flex-col bg-base overflow-hidden relative">

    <!-- Global ambient blobs -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <!-- 도트 그리드 -->
      <div class="dot-grid" />
      <!-- 오로라 -->
      <div class="aurora" />
      <!-- 블롭 -->
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
      <div class="blob blob-4" />
      <div class="blob blob-5" />
      <div class="blob blob-6" />
      <div class="blob blob-7" />
      <!-- 비네트 — 블롭이 텍스트 가독성 해치지 않도록 가장자리 어둡게 -->
      <div class="vignette" />
    </div>

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
        @about="showAbout = true"
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
              <!-- 검색어 & 결과 수 -->
              <p class="text-xs text-slate-500 mb-4">
                <span class="text-slate-200 font-semibold">"{{ lastQuery }}"</span>
                &nbsp;검색 결과&nbsp;
                <span class="text-slate-400 tabular-nums">{{ totalCount.toLocaleString() }}건</span>
              </p>

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

              <!-- 무한 스크롤 로딩 인디케이터 -->
              <div v-if="isLoadingMore" class="flex justify-center py-8">
                <svg class="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
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
            &nbsp;편 선택
          </span>
          <div class="w-px h-4 bg-slate-700" />

          <button
            class="btn-ghost text-xs px-4 py-2 disabled:opacity-40"
            :disabled="selectedPapers.length < 2 || selectedPapers.some(p => !p.abstract)"
            :title="selectedPapers.some(p => !p.abstract) ? '초록이 있는 논문만 비교 가능합니다' : ''"
            @click="showComparison = true"
          >Compare</button>

          <button
            class="btn-primary text-xs px-4 py-2 disabled:opacity-40"
            :disabled="selectedPapers.length < 2 || selectedPapers.some(p => !p.abstract)"
            :title="selectedPapers.some(p => !p.abstract) ? '초록이 있는 논문만 분석 가능합니다' : ''"
            @click="showSynthesis = true"
          >Analyze</button>

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

    <!-- Comparison panel -->
    <ComparisonPanel
      v-if="showComparison"
      :papers="selectedPapers"
      @close="showComparison = false"
    />

    <!-- About page -->
    <AboutPage v-if="showAbout" @close="showAbout = false" />

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
import SynthesisPanel   from './components/SynthesisPanel.vue'
import ComparisonPanel  from './components/ComparisonPanel.vue'
import TrendChart     from './components/TrendChart.vue'
import AboutPage      from './components/AboutPage.vue'
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
const selectedPapers  = ref([])
const showSynthesis   = ref(false)
const showComparison  = ref(false)
const showAbout       = ref(false)
const MAX_SELECT = 5

const emptyState = computed(() => {
  if (!hasSearched.value) return 'initial'
  if (/[\uAC00-\uD7A3]/.test(lastQuery.value)) return 'korean'
  return 'empty'
})

function toggleSelect(paper) {
  const idx = selectedPapers.value.findIndex((p) => p.pmid === paper.pmid)
  if (idx === -1) {
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

// Scroll progress + 무한 스크롤
function onScroll(e) {
  const el = e.target
  const max = el.scrollHeight - el.clientHeight
  scrollProgress.value = max > 0 ? Math.round((el.scrollTop / max) * 100) : 0
  // 하단 200px 이내 진입 시 자동 로드
  if (canLoadMore.value && !isLoadingMore.value && max > 0 && el.scrollTop >= max - 200) {
    handleLoadMore()
  }
}

// 탭 전환 시 사이드바 상태 자동 조정
watch(activeTab, (tab) => {
  if (tab === 'scrap')   sidebar.value?.collapse()
  if (tab === 'explore') sidebar.value?.expand()
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
    showChart.value = true                              // ① 자동 차트 열기
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

.folder-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.folder-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.folder-drop-enter-from, .folder-drop-leave-to { opacity: 0; transform: translateY(4px); }

/* ── 비네트 ── */
.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(6,11,24,0.55) 100%);
  pointer-events: none;
}

/* ── 도트 그리드 ── */
.dot-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(148,163,184,0.07) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* ── 오로라 (상단 수평 글로우) ── */
.aurora {
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 140%;
  height: 320px;
  background: radial-gradient(ellipse at 50% 0%,
    rgba(99,102,241,0.35) 0%,
    rgba(6,182,212,0.2) 35%,
    transparent 70%
  );
  filter: blur(40px);
  animation: auroraPulse 8s ease-in-out infinite alternate;
}

@keyframes auroraPulse {
  0%   { opacity: 0.7; transform: translateX(-50%) scaleX(1);    }
  50%  { opacity: 1.0; transform: translateX(-50%) scaleX(1.08); }
  100% { opacity: 0.8; transform: translateX(-50%) scaleX(0.96); }
}

/* ── Global ambient blobs ── */
.blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
  mix-blend-mode: screen;
}

.blob-1 {
  width: 700px; height: 700px;
  background: radial-gradient(circle at 40% 40%, #6366f1 0%, transparent 60%);
  filter: blur(80px);
  opacity: 0.28;
  top: -20%; left: -12%;
  animation: drift1 16s ease-in-out infinite alternate;
}
.blob-2 {
  width: 580px; height: 580px;
  background: radial-gradient(circle at 60% 50%, #06b6d4 0%, transparent 60%);
  filter: blur(90px);
  opacity: 0.22;
  top: 15%; right: -10%;
  animation: drift2 20s ease-in-out infinite alternate;
}
.blob-3 {
  width: 500px; height: 500px;
  background: radial-gradient(circle at 50% 50%, #8b5cf6 0%, transparent 60%);
  filter: blur(70px);
  opacity: 0.24;
  bottom: 0%; left: 20%;
  animation: drift3 24s ease-in-out infinite alternate;
}
.blob-4 {
  width: 380px; height: 380px;
  background: radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 60%);
  filter: blur(60px);
  opacity: 0.2;
  top: 50%; left: 2%;
  animation: drift4 18s ease-in-out infinite alternate;
}
.blob-5 {
  width: 340px; height: 340px;
  background: radial-gradient(circle at 50% 50%, #a78bfa 0%, transparent 60%);
  filter: blur(65px);
  opacity: 0.22;
  top: 8%; left: 42%;
  animation: drift5 22s ease-in-out infinite alternate;
}
/* 추가 블롭 — 핑크/마젠타 */
.blob-6 {
  width: 440px; height: 440px;
  background: radial-gradient(circle at 50% 50%, #ec4899 0%, transparent 60%);
  filter: blur(85px);
  opacity: 0.14;
  bottom: 10%; right: 5%;
  animation: drift6 26s ease-in-out infinite alternate;
}
/* 추가 블롭 — 에메랄드 */
.blob-7 {
  width: 300px; height: 300px;
  background: radial-gradient(circle at 50% 50%, #10b981 0%, transparent 60%);
  filter: blur(70px);
  opacity: 0.16;
  top: 40%; left: 35%;
  animation: drift7 19s ease-in-out infinite alternate;
}

@keyframes drift1 {
  0%   { transform: translate(0px,   0px)   scale(1);    }
  50%  { transform: translate(90px,  60px)  scale(1.08); }
  100% { transform: translate(40px, 110px)  scale(0.95); }
}
@keyframes drift2 {
  0%   { transform: translate(0px,   0px)   scale(1);    }
  50%  { transform: translate(-80px, 70px)  scale(1.1);  }
  100% { transform: translate(-40px, 130px) scale(0.92); }
}
@keyframes drift3 {
  0%   { transform: translate(0px,    0px)  scale(1);    }
  50%  { transform: translate(70px,  -80px) scale(1.12); }
  100% { transform: translate(-50px, -40px) scale(0.96); }
}
@keyframes drift4 {
  0%   { transform: translate(0px,   0px)   scale(1);    }
  50%  { transform: translate(60px,  -70px) scale(1.07); }
  100% { transform: translate(-30px, -90px) scale(1.14); }
}
@keyframes drift5 {
  0%   { transform: translate(0px,   0px)  scale(1);   }
  50%  { transform: translate(-60px, 80px) scale(0.9); }
  100% { transform: translate(50px,  50px) scale(1.1); }
}
@keyframes drift6 {
  0%   { transform: translate(0px,  0px)   scale(1);    }
  50%  { transform: translate(-80px, -60px) scale(1.1); }
  100% { transform: translate(30px, -100px) scale(0.93); }
}
@keyframes drift7 {
  0%   { transform: translate(0px, 0px)   scale(1);    }
  50%  { transform: translate(70px, -50px) scale(1.15); }
  100% { transform: translate(-40px, 60px) scale(0.88); }
}
</style>
