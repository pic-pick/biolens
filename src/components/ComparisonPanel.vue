<template>
  <Teleport to="body">
    <!-- backdrop -->
    <div
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      @click="$emit('close')"
    />

    <!-- 우측 슬라이드 패널 -->
    <div class="fixed right-0 top-0 h-screen w-full sm:w-[860px] sm:max-w-[95vw] z-50 bg-surface border-l border-slate-800 flex flex-col shadow-2xl animate-slide-in-right overflow-hidden">

      <!-- 헤더 -->
      <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <p class="text-[11px] text-slate-600 uppercase tracking-widest mb-0.5">Comparison</p>
          <h2 class="text-base font-semibold text-slate-100">논문 비교 분석표</h2>
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

      <!-- 선택 논문 -->
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

      <!-- 본문 -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-5">

        <!-- 로딩 -->
        <div v-if="isLoading" class="space-y-3">
          <!-- 스켈레톤 테이블 헤더 -->
          <div class="flex gap-3">
            <div class="w-28 shrink-0 h-10 shimmer rounded-lg" />
            <div v-for="n in papers.length" :key="n" class="flex-1 h-10 shimmer rounded-lg" />
          </div>
          <!-- 스켈레톤 행 6개 -->
          <div v-for="r in 6" :key="r" class="flex gap-3 py-2 border-b border-slate-800/60">
            <div class="w-28 shrink-0 h-3 shimmer rounded" />
            <div v-for="n in papers.length" :key="n" class="flex-1 h-3 shimmer rounded" />
          </div>
          <p class="text-center text-[11px] text-primary animate-pulse pt-2">AI 분석 중...</p>
        </div>

        <!-- 에러 -->
        <div v-else-if="error" class="text-center py-12">
          <p class="text-sm text-red-400 mb-3">{{ error }}</p>
          <button class="btn-ghost text-xs px-4 py-2" @click="runComparison">다시 시도</button>
        </div>

        <!-- 결과 -->
        <div v-else-if="result" class="space-y-6">

          <!-- 비교 테이블 -->
          <div class="overflow-x-auto rounded-xl border border-slate-800">
            <table class="w-full border-collapse text-xs">
              <!-- 헤더 행 -->
              <thead>
                <tr class="border-b border-slate-800">
                  <th class="w-28 px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest bg-elevated/50 shrink-0">
                    항목
                  </th>
                  <th
                    v-for="(p, i) in papers"
                    :key="p.pmid"
                    class="min-w-[130px] sm:min-w-[170px] px-3 py-3 text-left bg-elevated/30 border-l border-slate-800"
                  >
                    <span class="text-[10px] font-semibold text-primary mr-1.5">[{{ i + 1 }}]</span>
                    <span class="text-[10px] text-slate-400 font-normal">{{ p.year }}</span>
                    <p class="text-[11px] text-slate-200 font-medium leading-tight mt-1 line-clamp-2">
                      {{ p.title }}
                    </p>
                  </th>
                </tr>
              </thead>

              <!-- 데이터 행 -->
              <tbody>
                <tr
                  v-for="row in TABLE_ROWS"
                  :key="row.key"
                  class="border-b border-slate-800/60 hover:bg-white/[0.02] transition-colors"
                >
                  <!-- 행 레이블 -->
                  <td class="px-3 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap align-top">
                    {{ row.label }}
                  </td>

                  <!-- 각 논문 셀 -->
                  <td
                    v-for="(paperResult, i) in result.papers"
                    :key="i"
                    class="px-3 py-3 text-[11px] text-slate-300 leading-relaxed align-top border-l border-slate-800/60"
                    :class="row.key === 'evidenceLevel' ? evidenceCellClass(paperResult.evidenceLevel) : ''"
                  >
                    <!-- Evidence Level 특별 렌더 -->
                    <template v-if="row.key === 'evidenceLevel'">
                      <span
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                        :class="evidenceBadgeClass(paperResult.evidenceLevel)"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" :class="evidenceDotClass(paperResult.evidenceLevel)" />
                        {{ paperResult.evidenceLevel || '정보 없음' }}
                      </span>
                      <p class="text-[10px] text-slate-600 mt-1">{{ evidenceLabel(paperResult.evidenceLevel) }}</p>
                    </template>

                    <!-- 일반 셀 -->
                    <template v-else>
                      <span :class="paperResult[row.key] === '정보 없음' ? 'text-slate-700 italic' : ''">
                        {{ paperResult[row.key] || '정보 없음' }}
                      </span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 하단 요약 섹션 -->
          <div class="space-y-3 pt-1">

            <!-- 공통 결과 -->
            <div class="bg-emerald-900/10 border border-emerald-800/25 rounded-xl p-4">
              <p class="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">공통 결과</p>
              <p class="text-sm text-slate-300 leading-relaxed">{{ result.consensus }}</p>
            </div>

            <!-- 상충 결과 -->
            <div v-if="result.conflicts" class="bg-amber-900/10 border border-amber-800/25 rounded-xl p-4">
              <p class="text-[11px] font-semibold text-warning uppercase tracking-widest mb-1.5">상충 결과</p>
              <p class="text-sm text-slate-300 leading-relaxed">{{ result.conflicts }}</p>
            </div>

            <!-- Research Gap -->
            <div class="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
              <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Research Gap</p>
              <p class="text-sm text-slate-400 leading-relaxed">{{ result.researchGap }}</p>
            </div>
          </div>

        </div>
      </div>

      <!-- 하단 액션 -->
      <div class="px-4 sm:px-6 py-4 border-t border-slate-800 shrink-0 flex items-center gap-2">

        <!-- Markdown 복사 -->
        <button
          v-if="result"
          class="flex items-center gap-1.5 btn-ghost text-xs px-4 py-2"
          @click="copyMarkdown"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ copied ? '복사됨 ✓' : 'Markdown 복사' }}
        </button>

        <div class="flex-1" />

        <!-- 저장 -->
        <button
          v-if="result"
          class="py-2 px-5 text-sm rounded-xl font-medium transition-all duration-150"
          :class="isSaved
            ? 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-500'
            : 'btn-primary'"
          @click="handleSave"
        >
          {{ isSaved ? 'Saved ✓' : 'Save Comparison' }}
        </button>

        <!-- 닫기 -->
        <button
          class="py-2 px-5 text-sm rounded-xl border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all duration-150"
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
import { comparePapers }  from '../composables/useComparison.js'
import { useScrap }       from '../composables/useScrap.js'

const { scrapComparison, comparisons } = useScrap()

const props = defineProps({
  papers:         { type: Array,  required: true },
  preloadedResult: { type: Object, default: null },  // 저장된 결과 열람용
})
defineEmits(['close'])

const isLoading = ref(false)
const error     = ref(null)
const result    = ref(props.preloadedResult ?? null)
const saveId    = ref(null)
const copied    = ref(false)

const isSaved = computed(() =>
  !!props.preloadedResult ||
  (saveId.value !== null && comparisons.value.some((c) => c.id === saveId.value))
)

const TABLE_ROWS = [
  { key: 'studyDesign',    label: '연구 설계' },
  { key: 'population',     label: '대상군'    },
  { key: 'intervention',   label: '중재/노출'  },
  { key: 'primaryOutcome', label: '주요 결과'  },
  { key: 'limitations',    label: '한계점'    },
  { key: 'evidenceLevel',  label: '근거 수준'  },
]

// Evidence Level 헬퍼
function evidenceBadgeClass(level) {
  if (!level || level === '정보 없음') return 'bg-slate-800 text-slate-500'
  if (level.startsWith('1')) return 'bg-emerald-900/30 text-emerald-400'
  if (level.startsWith('2')) return 'bg-blue-900/30 text-blue-400'
  if (level === '3')         return 'bg-amber-900/30 text-warning'
  return 'bg-slate-800 text-slate-500'
}

function evidenceDotClass(level) {
  if (!level || level === '정보 없음') return 'bg-slate-600'
  if (level.startsWith('1')) return 'bg-emerald-400'
  if (level.startsWith('2')) return 'bg-blue-400'
  if (level === '3')         return 'bg-warning'
  return 'bg-slate-600'
}

function evidenceCellClass(level) {
  return '' // 셀 배경은 중립, 배지로만 색 표현
}

function evidenceLabel(level) {
  const map = {
    '1a': '메타분석 / 체계적 문헌고찰',
    '1b': '무작위 대조 시험 (RCT)',
    '2a': '코호트 연구 (잘 설계됨)',
    '2b': '코호트 / 환자-대조군',
    '3':  '증례 보고 / 전문가 의견',
    '4':  '기초 연구 / 동물 실험',
  }
  return map[level] || ''
}

// 저장
function handleSave() {
  if (isSaved.value || !result.value) return
  saveId.value = scrapComparison(props.papers, result.value)
}

// Markdown 복사
async function copyMarkdown() {
  if (!result.value) return
  const header = `| 항목 | ${props.papers.map((p, i) => `[${i+1}] ${p.title.slice(0, 30)}`).join(' | ')} |`
  const sep    = `|---|${props.papers.map(() => '---|').join('')}`
  const rows   = TABLE_ROWS.map(row => {
    const cells = result.value.papers.map(p => p[row.key] || '정보 없음').join(' | ')
    return `| ${row.label} | ${cells} |`
  })
  const summary = [
    '',
    `**공통 결과**: ${result.value.consensus}`,
    result.value.conflicts ? `**상충 결과**: ${result.value.conflicts}` : '',
    `**Research Gap**: ${result.value.researchGap}`,
  ].filter(Boolean)

  const md = [header, sep, ...rows, ...summary].join('\n')
  await navigator.clipboard.writeText(md)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// 분석 실행
async function runComparison() {
  isLoading.value = true
  error.value     = null
  result.value    = null
  try {
    result.value = await comparePapers(props.papers)
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message ?? ''
    error.value = msg.toLowerCase().includes('quota')
      ? 'OpenAI 크레딧이 부족합니다.'
      : '비교 분석에 실패했습니다. 다시 시도해주세요.'
  } finally {
    isLoading.value = false
  }
}

// preloadedResult가 있으면 API 호출 안 함
watch(() => props.papers, (p) => { if (p?.length && !props.preloadedResult) runComparison() }, { immediate: true })
</script>
