<template>
  <div :class="vertical ? 'space-y-4' : 'flex flex-wrap items-end gap-4'">

    <!-- 연도 범위 -->
    <div :class="vertical ? 'flex flex-col gap-1.5' : 'flex items-center gap-2'">
      <label class="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
        {{ vertical ? '연도 범위' : '연도' }}
      </label>
      <div class="flex items-center gap-1.5">
        <input
          v-model.number="yearFrom"
          type="number"
          :min="2000"
          :max="currentYear"
          placeholder="2000"
          class="input-dark w-full"
          :class="vertical ? '' : 'w-20'"
        />
        <span class="text-slate-500 shrink-0">—</span>
        <input
          v-model.number="yearTo"
          type="number"
          :min="2000"
          :max="currentYear"
          :placeholder="String(currentYear)"
          class="input-dark w-full"
          :class="vertical ? '' : 'w-20'"
        />
      </div>
    </div>

    <!-- 논문 유형 -->
    <div :class="vertical ? 'flex flex-col gap-1.5' : 'flex items-center gap-2'">
      <label class="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
        {{ vertical ? '논문 유형' : '유형' }}
      </label>
      <select
        v-model="pubtype"
        class="input-dark"
        :class="vertical ? 'w-full' : ''"
      >
        <option value="">전체</option>
        <option value="Review">Review</option>
        <option value="Systematic Review">Systematic Review</option>
        <option value="Meta-Analysis">Meta-Analysis</option>
        <option value="Randomized Controlled Trial">RCT</option>
        <option value="Clinical Trial">Clinical Trial</option>
      </select>
    </div>

    <!-- 무료 전문 -->
    <label class="flex items-center gap-2 cursor-pointer select-none">
      <div
        class="w-8 h-4 rounded-full transition-colors duration-200 relative flex-shrink-0 cursor-pointer"
        :class="freeFullText ? 'bg-primary' : 'bg-slate-700'"
        @click="freeFullText = !freeFullText"
      >
        <div
          class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200"
          :class="freeFullText ? 'translate-x-4' : 'translate-x-0'"
        />
      </div>
      <span class="text-xs text-slate-300">무료 전문만</span>
    </label>

    <!-- 초기화 -->
    <button
      v-if="hasFilter"
      class="text-xs text-primary hover:text-blue-400 transition-colors"
      @click="reset"
    >
      초기화
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

defineProps({ vertical: { type: Boolean, default: false } })
const emit = defineEmits(['change'])

const currentYear  = new Date().getFullYear()
const yearFrom     = ref(null)
const yearTo       = ref(null)
const pubtype      = ref('')
const freeFullText = ref(false)

const hasFilter = computed(() =>
  yearFrom.value || yearTo.value || pubtype.value || freeFullText.value
)

const filters = computed(() => ({
  yearFrom:     yearFrom.value  || undefined,
  yearTo:       yearTo.value    || undefined,
  pubtype:      pubtype.value   || undefined,
  freeFullText: freeFullText.value || false,
}))

// 연도 입력은 디바운스 (600ms)
let yearTimer = null
watch([yearFrom, yearTo], () => {
  clearTimeout(yearTimer)
  yearTimer = setTimeout(() => emit('change', filters.value), 600)
})

// 유형/무료전문은 즉시 반응
watch([pubtype, freeFullText], () => {
  emit('change', filters.value)
})

function reset() {
  yearFrom.value     = null
  yearTo.value       = null
  pubtype.value      = ''
  freeFullText.value = false
  emit('change', filters.value)
}

function setYearRange(from, to) {
  yearFrom.value = from != null ? Number(from) : null
  yearTo.value   = to   != null ? Number(to)   : null
}

defineExpose({ filters, setYearRange })
</script>
