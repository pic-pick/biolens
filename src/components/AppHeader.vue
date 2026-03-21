<template>
  <header class="bg-surface border-b border-slate-800 px-5 py-2.5 shrink-0 overflow-visible z-40 relative">
    <div class="flex items-center gap-4">

      <!-- Brand -->
      <button
        class="flex items-center gap-2.5 shrink-0 hover:opacity-80 active:scale-95 transition-all duration-150"
        title="홈으로 돌아가기"
        @click="() => window.location.reload()"
      >
        <div class="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="text-sm font-semibold tracking-widest text-slate-200 uppercase">BioLens</span>
      </button>

      <!-- Search bar -->
      <div class="flex-1 max-w-2xl mx-auto">
        <SearchBar
          ref="searchBarRef"
          :is-loading="isLoading"
          @search="emit('search', $event)"
          @input="emit('query-input', $event)"
        />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import SearchBar from './SearchBar.vue'

defineProps({
  isLoading:    { type: Boolean, default: false },
  currentQuery: { type: String,  default: '' },
})

const emit = defineEmits(['search', 'query-input'])
const searchBarRef = ref(null)
defineExpose({ setQuery: (v) => searchBarRef.value?.setQuery(v) })
</script>
