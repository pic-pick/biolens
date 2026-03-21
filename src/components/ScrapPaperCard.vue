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
      <!-- top row: drag handle + 체크박스 + year + delete -->
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
          <input
            v-if="selectable"
            type="checkbox"
            :checked="isSelected"
            :disabled="selectDisabled && !isSelected"
            class="w-3.5 h-3.5 rounded border-slate-600 bg-elevated text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30"
            @change="$emit('toggle', paper)"
          />
          <span class="text-[11px] px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-md font-medium tabular-nums border border-blue-800/40">
            {{ paper.year }}
          </span>
        </div>
        <button
          class="text-[11px] text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          @click="$emit('delete')"
        >삭제</button>
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
import { ref, computed } from 'vue'
import { translateAbstract } from '../composables/useOpenAI.js'

const props = defineProps({
  paper:          { type: Object,  required: true },
  selectable:     { type: Boolean, default: false },
  isSelected:     { type: Boolean, default: false },
  selectDisabled: { type: Boolean, default: false },
  isDragging:     { type: Boolean, default: false },
})
defineEmits(['delete', 'toggle', 'dragstart', 'dragend'])

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
