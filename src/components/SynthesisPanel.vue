<template>
  <Teleport to="body">
    <!-- backdrop -->
    <div
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      @click="$emit('close')"
    />

    <!-- 우측 슬라이드 패널 -->
    <div class="fixed right-0 top-0 h-screen w-full sm:w-[520px] sm:max-w-[95vw] z-50 bg-surface border-l border-slate-800 flex flex-col shadow-2xl animate-slide-in-right overflow-hidden">

      <!-- 헤더 -->
      <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <p class="text-[11px] text-slate-600 uppercase tracking-widest mb-0.5">Analysis</p>
          <h2 class="text-base font-semibold text-slate-100">다중 논문 종합 분석</h2>
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
          @click="$emit('close')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- 분석 대상 논문 -->
      <div class="px-4 sm:px-6 py-3 border-b border-slate-800 shrink-0">
        <p class="text-[11px] text-slate-600 uppercase tracking-widest mb-2">Selected Papers</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(p, i) in papers"
            :key="p.pmid"
            class="text-[11px] px-2.5 py-1 bg-blue-900/30 text-blue-400 border border-blue-800/40 rounded-md"
          >[{{ i + 1 }}] {{ p.title.slice(0, 38) }}{{ p.title.length > 38 ? '…' : '' }}</span>
        </div>
      </div>

      <!-- 본문 스크롤 -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

        <!-- 로딩 -->
        <div v-if="isLoading" class="space-y-4">
          <div class="space-y-2">
            <div class="h-3 shimmer rounded-md w-24" />
            <div class="h-4 shimmer rounded-md w-full" />
            <div class="h-4 shimmer rounded-md w-5/6" />
          </div>
          <div class="space-y-2">
            <div class="h-3 shimmer rounded-md w-20" />
            <div class="h-4 shimmer rounded-md w-full" />
            <div class="h-4 shimmer rounded-md w-4/5" />
          </div>
          <div class="space-y-2">
            <div class="h-3 shimmer rounded-md w-24" />
            <div class="h-4 shimmer rounded-md w-full" />
          </div>
        </div>

        <!-- 에러 -->
        <p v-else-if="error" class="text-sm text-red-400">{{ error }}</p>

        <!-- 결과 -->
        <div v-else-if="result" class="space-y-6">

          <!-- 공통 결과 -->
          <section>
            <p class="text-[11px] font-semibold text-primary uppercase tracking-widest mb-2">공통 연구 결과</p>
            <p class="text-sm text-slate-300 leading-relaxed">{{ result.commonFindings }}</p>
          </section>

          <!-- 상충 결과 -->
          <section v-if="result.conflictingResults">
            <p class="text-[11px] font-semibold text-warning uppercase tracking-widest mb-2">상충 결과 / 논쟁점</p>
            <p class="text-sm text-slate-300 leading-relaxed">{{ result.conflictingResults }}</p>
          </section>

          <!-- 연구 갭 -->
          <section>
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">연구 갭</p>
            <p class="text-sm text-slate-400 leading-relaxed">{{ result.researchGaps }}</p>
          </section>

          <!-- 종합 결론 -->
          <section class="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
            <p class="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">종합 결론</p>
            <p class="text-sm text-slate-300 leading-relaxed">{{ result.conclusion }}</p>
          </section>

          <!-- 핵심 주제 -->
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="theme in result.keyThemes"
              :key="theme"
              class="px-2.5 py-1 text-[11px] rounded-md bg-slate-800 text-slate-400 border border-slate-700"
            >{{ theme }}</span>
          </div>

        </div>
      </div>

      <!-- 하단 액션 -->
      <div class="px-4 sm:px-6 py-4 border-t border-slate-800 shrink-0 flex gap-2">
        <button
          v-if="result"
          class="flex-1 py-2.5 text-sm rounded-xl font-medium transition-all duration-150"
          :class="isScrapped
            ? 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-500'
            : 'btn-primary'"
          @click="handleScrap"
        >
          {{ isScrapped ? 'Saved' : 'Save Analysis' }}
        </button>
        <button
          class="flex-1 py-2.5 text-sm rounded-xl border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all duration-150"
          @click="$emit('close')"
        >
          닫기
        </button>
      </div>

    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { synthesizePapers } from '../composables/useOpenAI.js'
import { useScrap } from '../composables/useScrap.js'

const { scrapSynthesis, syntheses } = useScrap()

const props = defineProps({ papers: { type: Array, required: true } })
defineEmits(['close'])

const isLoading = ref(false)
const error     = ref(null)
const result    = ref(null)
const scrapId   = ref(null)

const isScrapped = computed(() =>
  scrapId.value !== null && syntheses.value.some((s) => s.id === scrapId.value)
)

function handleScrap() {
  if (isScrapped.value || !result.value) return
  scrapId.value = scrapSynthesis(props.papers, result.value)
}

watch(() => props.papers, async (papers) => {
  if (!papers?.length) return
  isLoading.value = true
  error.value     = null
  result.value    = null
  try {
    result.value = await synthesizePapers(papers)
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message ?? ''
    error.value = msg.toLowerCase().includes('quota')
      ? 'OpenAI 크레딧이 부족합니다.'
      : 'AI 분석에 실패했습니다. 다시 시도해주세요.'
  } finally {
    isLoading.value = false
  }
}, { immediate: true })
</script>
