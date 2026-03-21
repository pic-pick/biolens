<template>
  <div v-if="citationCount !== null" class="flex gap-1.5 flex-wrap">
    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
      cited {{ citationCount }}
    </span>
    <span
      v-if="rcr !== null"
      class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
      :class="rcrClass"
    >
      RCR {{ rcr.toFixed(1) }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  citationCount: { type: Number, default: null },
  rcr:           { type: Number, default: null },
})

const rcrClass = computed(() => {
  if (props.rcr === null) return ''
  if (props.rcr >= 2.0) return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
  if (props.rcr >= 1.0) return 'bg-blue-900/30 text-blue-400 border-blue-800/50'
  return 'bg-slate-800 text-slate-500 border-slate-700'
})
</script>
