<template>
  <div
    class="card-dark p-5 will-fade-up"
    :class="isSelected ? 'border-primary/50 ring-1 ring-primary/20' : ''"
    :style="[tiltStyle, { animationDelay: `${Math.min(index, 10) * 0.06}s` }]"
    style="animation: fadeUp 0.4s ease forwards;"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >

    <!-- 상단: 연도 + pubtype 배지 + citation -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <span v-if="paper.year" class="text-xs text-slate-500 tabular-nums">{{ paper.year }}</span>
      <span
        v-for="pt in paper.pubtype?.slice(0, 2)"
        :key="pt"
        class="px-2 py-0.5 text-[11px] rounded-md bg-slate-800 text-slate-400 border border-slate-700"
      >{{ pt }}</span>
      <CitationBadge :citation-count="paper.citationCount" :rcr="paper.rcr" />
    </div>

    <!-- 제목 -->
    <h2 class="text-sm font-semibold text-slate-100 leading-snug mb-1.5">
      {{ paper.title }}
    </h2>

    <!-- 저자 / 저널 -->
    <p class="text-xs text-slate-400 mb-3">
      {{ paper.authors }}
      <span v-if="paper.journal"> · <em class="text-slate-500">{{ paper.journal }}</em></span>
    </p>

    <!-- 초록 -->
    <div v-if="isExpanded && paper.abstract" class="mb-3">
      <div class="flex items-center gap-2 mb-2">
        <button
          class="text-[11px] px-2 py-0.5 rounded-md transition-all duration-150"
          :class="!showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
          @click="showKorean = false"
        >원문</button>
        <button
          class="text-[11px] px-2 py-0.5 rounded-md transition-all duration-150"
          :class="showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
          :disabled="isTranslating"
          @click="handleTranslate"
        >
          <span v-if="isTranslating" class="animate-pulse">번역 중...</span>
          <span v-else>한국어</span>
        </button>
      </div>
      <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
        {{ showKorean && translation ? translation : paper.abstract }}
      </p>
    </div>
    <p v-else-if="isExpanded && paper.abstractFailed" class="text-sm text-red-400/70 mb-3 italic">초록을 불러올 수 없습니다.</p>
    <p v-else-if="isExpanded && !paper.abstract && paper.hasAbstract" class="text-sm text-slate-500 mb-3 italic">초록 불러오는 중...</p>
    <p v-else-if="isExpanded && !paper.hasAbstract" class="text-sm text-slate-500 mb-3 italic">초록이 제공되지 않는 논문입니다.</p>

    <!-- MeSH 칩 -->
    <div v-if="isExpanded && paper.meshTerms?.length" class="flex flex-wrap gap-1 mb-3">
      <span
        v-for="term in paper.meshTerms.slice(0, 8)"
        :key="term"
        class="px-2 py-0.5 text-[11px] rounded-md bg-blue-900/30 text-blue-400 border border-blue-800/40"
      >{{ term }}</span>
    </div>

    <!-- AI 요약 -->
    <AiSummary :summary="aiSummary" />

    <!-- 에러 -->
    <p v-if="aiError" class="mt-3 text-xs text-red-400">
      {{ aiError }}
      <button class="ml-2 underline hover:no-underline" @click="handleAiSummary">재시도</button>
    </p>

    <!-- 액션 버튼 -->
    <div class="flex flex-wrap gap-2 mt-4">
      <button
        class="btn-ghost text-xs px-3 py-2"
        @click="isExpanded = !isExpanded"
      >{{ isExpanded ? '접기' : '초록 보기' }}</button>

      <button
        class="text-xs px-3 py-2 rounded-lg border transition-all duration-150 font-medium"
        :class="paper.hasAbstract
          ? 'border-primary/50 text-primary hover:bg-primary hover:text-white hover:border-primary'
          : 'border-slate-800 text-slate-700 cursor-not-allowed'"
        :disabled="!paper.hasAbstract || isAiLoading"
        @click="handleAiSummary"
      >
        <span v-if="isAiLoading" class="flex items-center gap-1.5">
          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>분석 중
        </span>
        <span v-else-if="aiSummary">요약 완료</span>
        <span v-else-if="!paper.hasAbstract">AI 요약 불가</span>
        <span v-else>AI 요약</span>
      </button>

      <a
        v-if="paper.pmcId"
        :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcId}/`"
        target="_blank" rel="noopener noreferrer"
        class="text-xs px-3 py-2 rounded-lg border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/30 transition-all duration-150"
      >Full Text</a>

      <a
        v-if="paper.doi"
        :href="`https://doi.org/${paper.doi}`"
        target="_blank" rel="noopener noreferrer"
        class="text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all duration-150"
      >DOI</a>

      <!-- 비교/분석 전용 버튼 -->
      <button
        class="text-xs px-3 py-2 rounded-lg border font-medium transition-all duration-150"
        :class="!paper.hasAbstract
          ? 'border-slate-800/50 text-slate-700 opacity-40 cursor-not-allowed pointer-events-none'
          : isSelected
            ? 'border-primary bg-primary/15 text-primary'
            : selectDisabled
              ? 'border-slate-800 text-slate-700 cursor-not-allowed'
              : 'border-slate-700 text-slate-400 hover:border-primary/40 hover:text-primary/80'"
        :disabled="!paper.hasAbstract || (selectDisabled && !isSelected)"
        :title="!paper.hasAbstract ? '초록이 없어 비교/분석 불가' : selectDisabled && !isSelected ? '최대 5편까지 선택 가능합니다' : isSelected ? '비교/분석 목록에서 제외' : '비교/분석 목록에 추가'"
        @click="emit('toggle', paper)"
      >
        <span v-if="isSelected">✓ 선택됨</span>
        <span v-else>+ 비교·분석</span>
      </button>

      <!-- Save 버튼 (폴더 피커) -->
      <div class="relative ml-auto" @click.stop>
        <button
          class="text-xs px-3 py-2 rounded-lg border transition-all duration-150 flex items-center gap-1"
          :class="isPaperScraped(paper.pmid)
            ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/30'
            : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'"
          @click="showFolderPicker = !showFolderPicker"
        >
          {{ isPaperScraped(paper.pmid) ? 'Saved' : 'Save' }}
          <svg class="w-3 h-3 opacity-60 transition-transform" :class="showFolderPicker ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- 폴더 선택 드롭다운 -->
        <Transition name="folder-drop">
          <div
            v-if="showFolderPicker"
            class="absolute bottom-full right-0 mb-1.5 z-[60] bg-elevated border border-slate-700 rounded-xl shadow-xl py-1 min-w-[168px] max-h-[60vh] overflow-y-auto"
          >
            <p class="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">폴더 선택 후 저장</p>

            <!-- 미분류 -->
            <button
              class="w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-800/60 transition-colors flex items-center gap-2"
              :class="currentFolderOf(paper.pmid) === null && isPaperScraped(paper.pmid) ? 'text-slate-200' : 'text-slate-400 hover:text-slate-200'"
              @click="saveToFolder(null)"
            >
              <svg class="w-3 h-3 shrink-0 text-slate-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              미분류
              <span v-if="currentFolderOf(paper.pmid) === null && isPaperScraped(paper.pmid)" class="ml-auto text-primary">✓</span>
            </button>

            <div v-if="projects.length" class="h-px bg-slate-800 mx-2 my-0.5" />

            <!-- 폴더 목록 -->
            <button
              v-for="proj in projects"
              :key="proj.id"
              class="w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-800/60 transition-colors flex items-center gap-2"
              :class="currentFolderOf(paper.pmid) === proj.id ? 'text-slate-200' : 'text-slate-400 hover:text-slate-200'"
              @click="saveToFolder(proj.id)"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: proj.color }" />
              <span class="truncate">{{ proj.name }}</span>
              <span v-if="currentFolderOf(paper.pmid) === proj.id" class="ml-auto text-primary">✓</span>
            </button>

            <div class="h-px bg-slate-800 mx-2 my-0.5" />

            <!-- 새 폴더 -->
            <button
              class="w-full px-3 py-1.5 text-left text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
              @click="showNewFolder = true; showFolderPicker = false"
            >
              <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
              </svg>
              새 폴더
            </button>

            <!-- 이미 저장됐으면: 저장 취소 -->
            <template v-if="isPaperScraped(paper.pmid)">
              <div class="h-px bg-slate-800 mx-2 my-0.5" />
              <button
                class="w-full px-3 py-1.5 text-left text-[11px] text-red-500 hover:bg-red-900/20 transition-colors"
                @click="unscrapPaper(paper.pmid); showFolderPicker = false"
              >저장 취소</button>
            </template>
          </div>
        </Transition>
      </div>
    </div>
  </div>

  <!-- 새 폴더 모달 -->
  <ProjectCreateModal
    v-if="showNewFolder"
    @close="showNewFolder = false"
    @created="(id) => { saveToFolder(id); showNewFolder = false }"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CitationBadge from './CitationBadge.vue'
import AiSummary from './AiSummary.vue'
import ProjectCreateModal from './ProjectCreateModal.vue'
import { summarizeAbstract, translateAbstract } from '../composables/useOpenAI.js'
import { useScrap } from '../composables/useScrap.js'
import { useProjects } from '../composables/useProjects.js'
import { useTilt } from '../composables/useTilt.js'

const { scrapPaper, unscrapPaper, isPaperScraped, assignToProject, papers } = useScrap()
const { projects } = useProjects()
const { tiltStyle, onMouseMove, onMouseLeave } = useTilt()

const props = defineProps({
  paper:               { type: Object,   required: true },
  fetchAbstractSingle: { type: Function, required: true },
  isSelected:          { type: Boolean,  default: false },
  selectDisabled:      { type: Boolean,  default: false },
  index:               { type: Number,   default: 0 },
})
const emit = defineEmits(['toggle'])

const isExpanded     = ref(false)
const isAiLoading    = ref(false)
const aiSummary      = ref(null)
const aiError        = ref(null)
const translation    = ref(null)
const isTranslating  = ref(false)
const showKorean     = ref(false)
const showFolderPicker = ref(false)
const showNewFolder    = ref(false)

function currentFolderOf(pmid) {
  return papers.value.find((p) => p.pmid === pmid)?.projectId ?? null
}

function saveToFolder(folderId) {
  if (!isPaperScraped(props.paper.pmid)) {
    scrapPaper(props.paper, aiSummary.value, folderId)
  } else {
    assignToProject(props.paper.pmid, folderId)
  }
  showFolderPicker.value = false
}

function onOutsideClick() { showFolderPicker.value = false }
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))

async function handleTranslate() {
  if (translation.value) { showKorean.value = !showKorean.value; return }
  if (!props.paper.abstract) return
  isTranslating.value = true
  try {
    translation.value = await translateAbstract(props.paper.abstract)
    showKorean.value  = true
  } catch { /* 조용히 실패 */ }
  finally { isTranslating.value = false }
}

async function handleAiSummary() {
  if (!props.paper.hasAbstract || isAiLoading.value || aiSummary.value) return
  isAiLoading.value = true
  aiError.value     = null
  try {
    if (!props.paper.abstract) await props.fetchAbstractSingle(props.paper.pmid)
    if (!props.paper.abstract) throw new Error('초록을 가져올 수 없습니다.')
    aiSummary.value = await summarizeAbstract({
      abstract:  props.paper.abstract,
      meshTerms: props.paper.meshTerms,
      chemicals: props.paper.chemicals,
    })
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message ?? ''
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing')) {
      aiError.value = 'OpenAI 크레딧이 부족합니다.'
    } else {
      aiError.value = msg || 'AI 요약 생성에 실패했습니다.'
    }
  } finally {
    isAiLoading.value = false
  }
}
</script>

<style scoped>
.folder-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.folder-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.folder-drop-enter-from, .folder-drop-leave-to { opacity: 0; transform: translateY(4px); }
</style>
