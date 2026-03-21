<template>
  <div
    class="card-dark overflow-hidden group"
    :class="[
      isSelected ? 'border-primary/50 ring-1 ring-primary/20' : '',
      isDragging ? 'opacity-40 scale-95' : '',
    ]"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
  >
    <!-- 상단 컬러 바 -->
    <div class="h-[2px] bg-gradient-to-r from-primary to-secondary" />

    <div class="p-4 flex flex-col gap-2">
      <!-- top row: drag handle + year + delete -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <!-- drag handle -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 mr-1">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
            </svg>
          </div>
          <span class="text-[11px] px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-md font-medium tabular-nums border border-blue-800/40">
            {{ paper.year }}
          </span>

          <!-- 폴더 배지 -->
          <div class="relative">
            <button
              class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all duration-150 font-medium"
              :class="currentProject
                ? 'border-transparent'
                : 'border-dashed border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'"
              :style="currentProject ? {
                background: currentProject.color + '18',
                borderColor: currentProject.color + '55',
                color: currentProject.color,
              } : {}"
              :title="currentProject ? currentProject.name : '폴더 배정'"
              @click.stop="toggleProjDropdown"
            >
              <svg v-if="!currentProject" class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span
                v-else
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :style="{ background: currentProject.color }"
              />
              <span class="max-w-[72px] truncate">{{ currentProject ? currentProject.name : '미분류' }}</span>
            </button>

            <!-- 드롭다운 -->
            <Transition name="proj-drop">
              <div
                v-if="showProjDropdown"
                class="absolute left-0 top-full mt-1.5 z-30 bg-elevated border border-slate-700 rounded-xl shadow-xl py-1 min-w-[152px]"
                @click.stop
              >
                <p class="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">폴더 배정</p>
                <button
                  class="w-full px-3 py-1.5 text-left text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                  @click="assignProject(null)"
                >
                  <svg class="w-3 h-3 shrink-0 text-slate-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  미분류
                  <span v-if="!paper.projectId" class="ml-auto text-primary text-xs">✓</span>
                </button>
                <div v-if="projects.length" class="h-px bg-slate-800 mx-2 my-0.5" />
                <button
                  v-for="proj in projects"
                  :key="proj.id"
                  class="w-full px-3 py-1.5 text-left text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                  @click="assignProject(proj.id)"
                >
                  <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: proj.color }" />
                  <span class="truncate">{{ proj.name }}</span>
                  <span v-if="paper.projectId === proj.id" class="ml-auto text-primary text-xs">✓</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
        <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <!-- 비교/분석 전용 버튼 -->
          <button
            v-if="selectable"
            class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all"
            :class="!paper.abstract
              ? 'border-slate-800/50 text-slate-700 opacity-40 cursor-not-allowed pointer-events-none'
              : isSelected
                ? 'bg-primary/15 border-primary/50 text-primary'
                : selectDisabled
                  ? 'border-slate-800 text-slate-700 cursor-not-allowed'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-primary/40 hover:text-primary/80'"
            :disabled="!paper.abstract || (selectDisabled && !isSelected)"
            :title="!paper.abstract ? '초록이 없어 비교/분석 불가' : selectDisabled && !isSelected ? '최대 5편까지 선택 가능합니다' : isSelected ? '비교/분석 목록에서 제외' : '비교/분석 목록에 추가'"
            @click.stop="$emit('toggle', paper)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path v-if="isSelected" d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
              <path v-else d="M12 5v14M5 12h14" stroke-linecap="round"/>
            </svg>
            {{ isSelected ? '선택됨' : '비교·분석' }}
          </button>
          <!-- 네트워크 버튼 -->
          <button
            class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/60 hover:border-indigo-600 transition-all font-medium"
            @click.stop="$emit('network', paper)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
              <circle cx="12" cy="19" r="2"/>
              <path d="M7 5h10M5.5 7l5.5 9.5M18.5 7L13 16.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Network
          </button>
          <button
            class="text-[11px] text-slate-700 hover:text-red-400 transition-all"
            @click="$emit('delete')"
          >삭제</button>
        </div>
      </div>

      <!-- 제목 -->
      <h3 class="text-sm font-semibold text-slate-200 leading-snug line-clamp-2">{{ paper.title }}</h3>

      <!-- 저자 / 저널 -->
      <p class="text-[11px] text-slate-500 truncate">
        {{ paper.authors }}<em v-if="paper.journal" class="text-slate-600"> · {{ paper.journal }}</em>
      </p>

      <!-- 초록 -->
      <div v-if="paper.abstract">
        <div v-if="isExpanded" class="flex items-center gap-2 mb-1.5">
          <button
            class="text-[11px] px-2 py-0.5 rounded-md transition-all"
            :class="!showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
            @click="showKorean = false"
          >원문</button>
          <button
            class="text-[11px] px-2 py-0.5 rounded-md transition-all"
            :class="showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
            :disabled="isTranslating"
            @click="handleTranslate"
          >
            <span v-if="isTranslating" class="animate-pulse">번역 중...</span>
            <span v-else>한국어</span>
          </button>
        </div>
        <p
          class="text-xs text-slate-400 leading-relaxed"
          :class="isExpanded ? '' : 'line-clamp-3'"
        >{{ showKorean && translation ? translation : paper.abstract }}</p>
        <button
          v-if="needsExpansion"
          class="mt-1 text-[11px] text-primary hover:text-blue-400 transition-colors"
          @click="isExpanded = !isExpanded"
        >{{ isExpanded ? '접기' : '더보기' }}</button>
      </div>

      <!-- AI 요약 -->
      <div v-if="paper.aiSummary?.summary?.length" class="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-2.5">
        <p class="text-[11px] font-semibold text-emerald-400 mb-1 uppercase tracking-wide">AI Summary</p>
        <ul class="space-y-0.5">
          <li
            v-for="(s, i) in paper.aiSummary.summary"
            :key="i"
            class="text-[11px] text-slate-400 leading-relaxed"
          >{{ i + 1 }}. {{ s }}</li>
        </ul>
      </div>

      <!-- MeSH 태그 -->
      <div v-if="paper.meshTerms?.length" class="flex flex-wrap gap-1">
        <span
          v-for="term in paper.meshTerms.slice(0, 4)"
          :key="term"
          class="text-[11px] bg-blue-900/20 text-blue-400 rounded-md px-2 py-0.5 border border-blue-800/30"
        >{{ term }}</span>
      </div>

      <!-- 링크 -->
      <div class="flex gap-3 mt-auto pt-1">
        <a
          v-if="paper.pmcId"
          :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcId}/`"
          target="_blank" rel="noopener noreferrer"
          class="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors underline"
        >Full Text</a>
        <a
          v-if="paper.doi"
          :href="`https://doi.org/${paper.doi}`"
          target="_blank" rel="noopener noreferrer"
          class="text-[11px] text-slate-500 hover:text-slate-300 transition-colors underline"
        >DOI</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { translateAbstract } from '../composables/useOpenAI.js'

const props = defineProps({
  paper:          { type: Object,  required: true },
  projects:       { type: Array,   default: () => [] },
  selectable:     { type: Boolean, default: false },
  isSelected:     { type: Boolean, default: false },
  selectDisabled: { type: Boolean, default: false },
  isDragging:     { type: Boolean, default: false },
})
const emit = defineEmits(['delete', 'toggle', 'assign', 'network', 'dragstart', 'dragend'])

// 프로젝트 배지 & 재배정 드롭다운
const showProjDropdown = ref(false)
const currentProject = computed(() =>
  props.projects.find((p) => p.id === props.paper.projectId) ?? null
)

function toggleProjDropdown(e) {
  e.stopPropagation()
  showProjDropdown.value = !showProjDropdown.value
}
function assignProject(projectId) {
  emit('assign', props.paper.pmid, projectId)
  showProjDropdown.value = false
}
function onOutsideClick() { showProjDropdown.value = false }
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))

const isExpanded    = ref(false)
const translation   = ref(null)
const isTranslating = ref(false)
const showKorean    = ref(false)

const needsExpansion = computed(() => (props.paper.abstract?.length ?? 0) > 200)

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
</script>

<style scoped>
.proj-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.proj-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.proj-drop-enter-from, .proj-drop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
