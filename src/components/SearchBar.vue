<template>
  <div class="w-full relative">
    <div class="flex gap-2">
      <div class="relative flex-1">
        <input
          v-model="query"
          type="text"
          placeholder="질병명, 화합물, 유전자를 입력하세요"
          class="w-full px-4 py-2.5 bg-surface border rounded-lg text-sm text-slate-200 placeholder-slate-600
                 focus:outline-none transition-all duration-200"
          :class="[
            isFocused
              ? 'border-primary ring-1 ring-primary/20 shadow-[0_0_16px_rgba(59,130,246,0.15)]'
              : 'border-slate-700 hover:border-slate-600'
          ]"
          :disabled="isLoading"
          @keyup.enter="handleSearch"
          @input="emit('input', query)"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>
      <button
        class="btn-primary px-5 shrink-0"
        :disabled="isLoading || isSuggesting || !query.trim()"
        @click="handleSearch"
      >
        <span v-if="isLoading || isSuggesting" class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ isSuggesting ? '추천 중' : '검색 중' }}
        </span>
        <span v-else>Search</span>
      </button>
    </div>

    <!-- 한글 → 추천 검색어 드롭다운 -->
    <Transition name="drop">
      <div
        v-if="suggestions.length || suggestError"
        class="absolute top-full left-0 right-0 mt-2 bg-elevated border border-slate-700 rounded-xl shadow-2xl shadow-black/50 p-3 z-50"
      >
        <template v-if="suggestions.length">
          <p class="text-[11px] text-slate-500 uppercase tracking-wide mb-2.5 px-1">추천 검색어</p>
          <div class="flex flex-col gap-1">
            <button
              v-for="s in suggestions"
              :key="s.query"
              class="text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-700 hover:bg-surface transition-all duration-150 group"
              @click="selectSuggestion(s.query)"
            >
              <span class="text-sm font-medium text-slate-200 group-hover:text-primary transition-colors">{{ s.query }}</span>
              <span class="block text-[11px] text-slate-500 mt-0.5">{{ s.reason }}</span>
            </button>
          </div>
          <button
            class="mt-2 text-xs text-slate-600 hover:text-slate-400 transition-colors px-1"
            @click="suggestions = []"
          >닫기</button>
        </template>
        <p v-else class="text-xs text-red-400 py-1 px-1">{{ suggestError }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { suggestQueries } from '../composables/useOpenAI.js'

const props = defineProps({ isLoading: Boolean })
const emit  = defineEmits(['search', 'input'])

const query        = ref('')
const isFocused    = ref(false)
const isSuggesting = ref(false)
const suggestions  = ref([])
const suggestError = ref(null)

const hasKorean = computed(() => /[\uAC00-\uD7A3]/.test(query.value))

async function handleSearch() {
  if (!query.value.trim() || props.isLoading) return

  if (hasKorean.value) {
    suggestions.value  = []
    suggestError.value = null
    isSuggesting.value = true
    try {
      suggestions.value = await suggestQueries(query.value.trim())
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? err.message ?? ''
      suggestError.value = msg.toLowerCase().includes('quota')
        ? 'OpenAI 크레딧이 부족합니다.'
        : 'AI 추천에 실패했습니다.'
    } finally {
      isSuggesting.value = false
    }
    return
  }

  suggestions.value = []
  emit('search', query.value.trim())
}

function selectSuggestion(selected) {
  query.value       = selected
  suggestions.value = []
  emit('input', selected)
  emit('search', selected)
}

function setQuery(value) {
  query.value       = value
  suggestions.value = []
}

defineExpose({ setQuery })
</script>

<style scoped>
.drop-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.drop-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
