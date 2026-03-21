<template>
  <div class="flex gap-5 h-full overflow-hidden">

    <!-- ── 논문 스크랩 ── -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          Saved Papers
          <span class="text-[11px] font-normal bg-slate-800 text-slate-400 rounded-md px-2 py-0.5 border border-slate-700">{{ papers.length }}</span>
        </h2>
        <p class="text-[11px] text-slate-600">논문을 2~5편 선택하면 종합분석 가능</p>
      </div>

      <!-- 빈 상태 -->
      <div
        v-if="papers.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800"
      >
        <svg class="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm text-slate-600">스크랩한 논문이 없습니다</p>
        <p class="text-xs text-slate-700">논문 카드의 Save 버튼을 눌러보세요</p>
      </div>

      <!-- 카드 그리드 (masonry) -->
      <div v-else class="flex-1 overflow-y-auto">
        <div class="flex gap-3 items-start">
          <div class="flex-1 flex flex-col gap-3">
            <ScrapPaperCard
              v-for="(p, i) in leftPapers"
              :key="p.pmid"
              :paper="p"
              :selectable="true"
              :is-selected="isSelected(p)"
              :select-disabled="!isSelected(p) && selectedPapers.length >= MAX_SELECT"
              :is-dragging="draggingPmid === p.pmid"
              @delete="unscrapPaper(p.pmid)"
              @toggle="toggleSelect"
              @dragstart="onDragStart($event, papers.indexOf(p))"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOver($event, papers.indexOf(p))"
              @drop.prevent="onDrop($event, papers.indexOf(p))"
            />
          </div>
          <div class="flex-1 flex flex-col gap-3">
            <ScrapPaperCard
              v-for="(p, i) in rightPapers"
              :key="p.pmid"
              :paper="p"
              :selectable="true"
              :is-selected="isSelected(p)"
              :select-disabled="!isSelected(p) && selectedPapers.length >= MAX_SELECT"
              :is-dragging="draggingPmid === p.pmid"
              @delete="unscrapPaper(p.pmid)"
              @toggle="toggleSelect"
              @dragstart="onDragStart($event, papers.indexOf(p))"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOver($event, papers.indexOf(p))"
              @drop.prevent="onDrop($event, papers.indexOf(p))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 구분선 -->
    <div class="w-px bg-slate-800 shrink-0" />

    <!-- ── 종합분석 ── -->
    <div class="w-[420px] shrink-0 flex flex-col overflow-hidden">
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          Analyses
          <span class="text-[11px] font-normal bg-accent/20 text-accent rounded-md px-2 py-0.5 border border-accent/20">{{ syntheses.length }}</span>
        </h2>
      </div>

      <!-- 빈 상태 -->
      <div
        v-if="syntheses.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800"
      >
        <svg class="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm text-slate-600">저장된 분석 없음</p>
        <p class="text-xs text-slate-700 text-center px-4">논문 2~5편 선택 후<br/>종합분석을 실행하세요</p>
      </div>

      <!-- 종합분석 카드 -->
      <div v-else class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div
          v-for="s in syntheses"
          :key="s.id"
          class="bg-surface border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition-all duration-200"
        >
          <div class="h-[2px] bg-gradient-to-r from-accent to-violet-400" />

          <div class="p-4 flex flex-col gap-2.5">
            <div class="flex items-start justify-between gap-2">
              <p class="text-[11px] text-slate-600">{{ formatDate(s.scrapedAt) }}</p>
              <button
                class="text-[11px] text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                @click="unscrapSynthesis(s.id)"
              >삭제</button>
            </div>

            <!-- 논문 칩 (클릭 → 상세 팝업) -->
            <div class="flex flex-wrap gap-1">
              <button
                v-for="(paper, i) in s.papers"
                :key="paper.pmid"
                class="text-[11px] px-2 py-0.5 bg-violet-900/30 text-violet-400 border border-violet-800/40 rounded-md hover:bg-violet-900/50 transition-colors text-left"
                @click="openPaperDetail(paper)"
              >
                [{{ i + 1 }}] {{ paper.title.length > 20 ? paper.title.slice(0, 20) + '…' : paper.title }}
              </button>
            </div>

            <div v-if="s.result?.commonFindings">
              <p class="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">공통 결과</p>
              <p class="text-xs text-slate-300 leading-relaxed">{{ s.result.commonFindings }}</p>
            </div>

            <div v-if="s.result?.conclusion" class="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2.5">
              <p class="text-[11px] font-semibold text-secondary uppercase tracking-wide mb-0.5">결론</p>
              <p class="text-xs text-slate-300 leading-relaxed">{{ s.result.conclusion }}</p>
            </div>

            <div v-if="s.result?.keyThemes?.length" class="flex flex-wrap gap-1">
              <span
                v-for="theme in s.result.keyThemes"
                :key="theme"
                class="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700"
              >{{ theme }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 종합분석 패널 -->
    <SynthesisPanel
      v-if="showSynthesis"
      :papers="selectedPapers"
      @close="showSynthesis = false; selectedPapers = []"
    />

    <!-- 논문 상세 팝업 -->
    <Teleport to="body">
      <Transition name="fade-modal">
        <div
          v-if="detailPaper"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          @click.self="detailPaper = null"
        >
          <div class="bg-surface border border-slate-700 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-6 m-4 animate-fade-up">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <span class="text-[11px] px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-md font-medium border border-blue-800/40 tabular-nums">
                  {{ detailPaper.year }}
                </span>
                <h3 class="mt-2 text-sm font-bold text-slate-100 leading-snug">{{ detailPaper.title }}</h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ detailPaper.authors }}<em v-if="detailPaper.journal" class="text-slate-600"> · {{ detailPaper.journal }}</em>
                </p>
              </div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:text-slate-300 shrink-0 transition-all"
                @click="detailPaper = null"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div v-if="detailPaper.abstract">
              <div class="flex items-center gap-2 mb-2">
                <button
                  class="text-xs px-2 py-0.5 rounded-md transition-all"
                  :class="!detailShowKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
                  @click="detailShowKorean = false"
                >원문</button>
                <button
                  class="text-xs px-2 py-0.5 rounded-md transition-all"
                  :class="detailShowKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
                  :disabled="detailTranslating"
                  @click="handleDetailTranslate"
                >
                  <span v-if="detailTranslating" class="animate-pulse">번역 중...</span>
                  <span v-else>한국어</span>
                </button>
              </div>
              <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {{ detailShowKorean && detailTranslation ? detailTranslation : detailPaper.abstract }}
              </p>
            </div>
            <p v-else class="text-sm text-slate-600 italic">초록 없음</p>

            <div v-if="detailPaper.aiSummary?.summary?.length" class="mt-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3">
              <p class="text-xs font-semibold text-emerald-400 mb-1.5 uppercase tracking-wide">AI Summary</p>
              <ul class="space-y-0.5">
                <li v-for="(s, i) in detailPaper.aiSummary.summary" :key="i" class="text-xs text-slate-400 leading-relaxed">
                  {{ i + 1 }}. {{ s }}
                </li>
              </ul>
            </div>

            <div v-if="detailPaper.meshTerms?.length" class="mt-3 flex flex-wrap gap-1">
              <span
                v-for="term in detailPaper.meshTerms.slice(0, 6)"
                :key="term"
                class="text-xs bg-blue-900/20 text-blue-400 rounded-md px-2 py-0.5 border border-blue-800/30"
              >{{ term }}</span>
            </div>

            <div class="flex gap-3 mt-4">
              <a
                v-if="detailPaper.pmcId"
                :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/${detailPaper.pmcId}/`"
                target="_blank" rel="noopener noreferrer"
                class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline"
              >Full Text</a>
              <a
                v-if="detailPaper.doi"
                :href="`https://doi.org/${detailPaper.doi}`"
                target="_blank" rel="noopener noreferrer"
                class="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
              >DOI</a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useScrap } from '../composables/useScrap.js'
import { translateAbstract } from '../composables/useOpenAI.js'
import ScrapPaperCard from './ScrapPaperCard.vue'
import SynthesisPanel from './SynthesisPanel.vue'

const { papers, syntheses, unscrapPaper, unscrapSynthesis, reorderPapers } = useScrap()

const leftPapers  = computed(() => papers.value.filter((_, i) => i % 2 === 0))
const rightPapers = computed(() => papers.value.filter((_, i) => i % 2 === 1))

// 선택 (종합분석용)
const MAX_SELECT     = 5
const selectedPapers = ref([])
const showSynthesis  = ref(false)

function isSelected(paper) {
  return selectedPapers.value.some((p) => p.pmid === paper.pmid)
}
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

// 드래그 앤 드롭
const draggingIdx  = ref(null)
const draggingPmid = ref(null)

function onDragStart(e, idx) {
  draggingIdx.value  = idx
  draggingPmid.value = papers.value[idx]?.pmid
  e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() {
  draggingIdx.value  = null
  draggingPmid.value = null
}
function onDragOver(e, idx) {
  e.dataTransfer.dropEffect = 'move'
}
function onDrop(e, targetIdx) {
  if (draggingIdx.value === null || draggingIdx.value === targetIdx) return
  const arr = [...papers.value]
  const [moved] = arr.splice(draggingIdx.value, 1)
  arr.splice(targetIdx, 0, moved)
  reorderPapers(arr)
  draggingIdx.value  = null
  draggingPmid.value = null
}

// 논문 상세 팝업
const detailPaper       = ref(null)
const detailTranslation = ref(null)
const detailTranslating = ref(false)
const detailShowKorean  = ref(false)

function openPaperDetail(paper) {
  detailPaper.value       = paper
  detailTranslation.value = null
  detailShowKorean.value  = false
}
async function handleDetailTranslate() {
  if (detailTranslation.value) { detailShowKorean.value = !detailShowKorean.value; return }
  if (!detailPaper.value?.abstract) return
  detailTranslating.value = true
  try {
    detailTranslation.value = await translateAbstract(detailPaper.value.abstract)
    detailShowKorean.value  = true
  } catch { /* 조용히 실패 */ }
  finally { detailTranslating.value = false }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.fade-modal-enter-active { transition: opacity 0.2s ease; }
.fade-modal-leave-active { transition: opacity 0.15s ease; }
.fade-modal-enter-from, .fade-modal-leave-to { opacity: 0; }
</style>
