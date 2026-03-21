<template>
  <div :class="vertical ? 'space-y-4' : 'flex flex-wrap items-end gap-4'">

    <!-- 연도 범위 -->
    <div :class="vertical ? 'flex flex-col gap-1.5' : 'flex items-center gap-2'">
      <label class="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {{ vertical ? '연도 범위' : '연도' }}
      </label>
      <div class="flex items-center gap-1.5">
        <!-- From -->
        <div class="relative" ref="fromRef">
          <button
            class="year-btn"
            :class="yearFrom ? 'text-slate-200 border-slate-600' : 'text-slate-500'"
            @click="toggleDropdown('from')"
          >
            {{ yearFrom || '시작' }}
            <svg class="w-3 h-3 ml-1 shrink-0 transition-transform duration-150" :class="openDropdown === 'from' ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <Transition name="drop">
            <div v-if="openDropdown === 'from'" class="year-list">
              <button
                v-for="y in years"
                :key="y"
                class="year-option"
                :class="yearFrom === y ? 'text-primary bg-primary/10' : ''"
                @click="selectYear('from', y)"
              >{{ y }}</button>
            </div>
          </Transition>
        </div>

        <span class="text-slate-600 shrink-0 text-xs">—</span>

        <!-- To -->
        <div class="relative" ref="toRef">
          <button
            class="year-btn"
            :class="yearTo ? 'text-slate-200 border-slate-600' : 'text-slate-500'"
            @click="toggleDropdown('to')"
          >
            {{ yearTo || '종료' }}
            <svg class="w-3 h-3 ml-1 shrink-0 transition-transform duration-150" :class="openDropdown === 'to' ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <Transition name="drop">
            <div v-if="openDropdown === 'to'" class="year-list">
              <button
                v-for="y in yearsTo"
                :key="y"
                class="year-option"
                :class="yearTo === y ? 'text-primary bg-primary/10' : ''"
                @click="selectYear('to', y)"
              >{{ y }}</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 논문 유형 -->
    <div :class="vertical ? 'flex flex-col gap-1.5' : 'flex items-center gap-2'">
      <label class="text-xs font-medium text-slate-400 uppercase tracking-wide">
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

defineProps({ vertical: { type: Boolean, default: false } })
const emit = defineEmits(['change'])

const currentYear  = new Date().getFullYear()
const yearFrom     = ref(null)
const yearTo       = ref(null)
const pubtype      = ref('')
const freeFullText = ref(false)
const openDropdown = ref(null) // 'from' | 'to' | null

const fromRef = ref(null)
const toRef   = ref(null)

// 2000 ~ 현재 (역순)
const years   = computed(() => Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i))
const yearsTo = computed(() => years.value.filter(y => !yearFrom.value || y >= yearFrom.value))

function toggleDropdown(which) {
  openDropdown.value = openDropdown.value === which ? null : which
}

function selectYear(which, y) {
  if (which === 'from') {
    yearFrom.value = y
    if (yearTo.value && yearTo.value < y) yearTo.value = y
  } else {
    yearTo.value = y
  }
  openDropdown.value = null
  emit('change', filters.value)
}

// 외부 클릭 시 닫기
function onOutsideClick(e) {
  if (!fromRef.value?.contains(e.target) && !toRef.value?.contains(e.target)) {
    openDropdown.value = null
  }
}
onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutsideClick))

const hasFilter = computed(() =>
  yearFrom.value || yearTo.value || pubtype.value || freeFullText.value
)

const filters = computed(() => ({
  yearFrom:     yearFrom.value  || undefined,
  yearTo:       yearTo.value    || undefined,
  pubtype:      pubtype.value   || undefined,
  freeFullText: freeFullText.value || false,
}))

watch([pubtype, freeFullText], () => emit('change', filters.value))

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

<style scoped>
.year-btn {
  display: flex;
  align-items: center;
  min-width: 4.5rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
  min-height: 2.5rem;
}
.year-btn:hover { border-color: #6366f1; color: #e2e8f0; }

.year-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  min-width: 5rem;
  max-height: 200px;
  overflow-y: auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.625rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  padding: 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: #334155 transparent;
}

.year-option {
  display: block;
  width: 100%;
  padding: 0.45rem 0.625rem;
  font-size: 0.75rem;
  text-align: left;
  border-radius: 0.375rem;
  color: #94a3b8;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.year-option:hover { background: #273449; color: #e2e8f0; }

.drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
