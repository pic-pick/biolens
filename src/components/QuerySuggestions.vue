<template>
  <div class="relative" v-click-outside="close">
    <!-- 트리거 버튼 -->
    <button
      class="flex items-center gap-1.5 text-xs text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
      :disabled="isLoading || !query"
      @click="handleSuggest"
    >
      <span v-if="isLoading" class="animate-pulse">⏳ 추천 중...</span>
      <span v-else>🤖 AI 추천</span>
    </button>

    <!-- 드롭다운 (absolute) -->
    <div
      v-if="suggestions.length || error"
      class="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50"
    >
      <!-- 에러 -->
      <p v-if="error" class="text-xs text-red-400 py-1">{{ error }}</p>

      <!-- 추천 목록 -->
      <template v-else>
        <p class="text-xs text-muted font-medium mb-2">추천 검색어 — 클릭하면 바로 검색</p>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="s in suggestions"
            :key="s.query"
            class="text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-primary hover:bg-blue-50 transition-colors group"
            @click="select(s.query)"
          >
            <span class="text-xs font-semibold text-gray-800 group-hover:text-primary">{{ s.query }}</span>
            <span class="block text-[11px] text-muted mt-0.5">{{ s.reason }}</span>
          </button>
        </div>
        <button class="mt-2 text-xs text-muted hover:text-gray-600" @click="close">닫기</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { suggestQueries } from '../composables/useOpenAI.js'

const props = defineProps({ query: { type: String, default: '' } })
const emit = defineEmits(['select'])

const isLoading   = ref(false)
const error       = ref(null)
const suggestions = ref([])

async function handleSuggest() {
  if (!props.query?.trim()) return
  isLoading.value   = true
  error.value       = null
  suggestions.value = []
  try {
    suggestions.value = await suggestQueries(props.query)
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message ?? ''
    error.value = msg.toLowerCase().includes('quota')
      ? 'OpenAI 크레딧이 부족합니다.'
      : 'AI 추천에 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}

function select(query) {
  emit('select', query)
  close()
}

function close() {
  suggestions.value = []
  error.value = null
}

defineExpose({ handleSuggest })

// click-outside directive
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value() }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el._clickOutside)
  },
}
</script>
