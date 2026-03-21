<template>
  <div
    class="card-dark p-5 will-fade-up"
    :class="isSelected ? 'border-primary/50 ring-1 ring-primary/20' : ''"
    :style="[tiltStyle, { animationDelay: `${Math.min(index, 10) * 0.06}s` }]"
    style="animation: fadeUp 0.4s ease forwards;"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >

    <!-- 상단: 체크박스 + 배지 -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <input
        type="checkbox"
        :checked="isSelected"
        :disabled="(!paper.abstract && !paper.hasAbstract) || selectDisabled"
        :title="!paper.abstract && !paper.hasAbstract
          ? '초록이 없어 종합 분석에 포함할 수 없습니다'
          : selectDisabled ? '최대 5편까지 선택할 수 있습니다' : '종합 분석에 추가'"
        class="w-4 h-4 rounded border-slate-600 bg-elevated text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        @change="emit('toggle', paper)"
      />
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
        class="btn-ghost text-xs px-3 py-1.5"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? '접기' : '초록 보기' }}
      </button>

      <button
        class="text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 font-medium"
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
        class="text-xs px-3 py-1.5 rounded-lg border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/30 transition-all duration-150"
      >Full Text</a>

      <a
        v-if="paper.doi"
        :href="`https://doi.org/${paper.doi}`"
        target="_blank" rel="noopener noreferrer"
        class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all duration-150"
      >DOI</a>

      <!-- 스크랩 -->
      <button
        class="ml-auto text-xs px-3 py-1.5 rounded-lg border transition-all duration-150"
        :class="isPaperScraped(paper.pmid)
          ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-500'
          : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'"
        @click="isPaperScraped(paper.pmid) ? unscrapPaper(paper.pmid) : scrapPaper(paper, aiSummary)"
      >
        {{ isPaperScraped(paper.pmid) ? 'Saved' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CitationBadge from './CitationBadge.vue'
import AiSummary from './AiSummary.vue'
import { summarizeAbstract, translateAbstract } from '../composables/useOpenAI.js'
import { useScrap } from '../composables/useScrap.js'
import { useTilt } from '../composables/useTilt.js'

const { scrapPaper, unscrapPaper, isPaperScraped } = useScrap()
const { tiltStyle, onMouseMove, onMouseLeave } = useTilt()

const props = defineProps({
  paper:               { type: Object,   required: true },
  fetchAbstractSingle: { type: Function, required: true },
  isSelected:          { type: Boolean,  default: false },
  selectDisabled:      { type: Boolean,  default: false },
  index:               { type: Number,   default: 0 },
})
const emit = defineEmits(['toggle'])

const isExpanded    = ref(false)
const isAiLoading   = ref(false)
const aiSummary     = ref(null)
const aiError       = ref(null)
const translation   = ref(null)
const isTranslating = ref(false)
const showKorean    = ref(false)

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
