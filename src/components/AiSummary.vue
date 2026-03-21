<template>
  <Transition name="fade">
    <div v-if="summary" class="mt-4 p-4 bg-emerald-900/20 border border-emerald-800/40 rounded-xl">
      <p class="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2.5">AI Summary</p>
      <ol class="space-y-1.5">
        <li
          v-for="(line, i) in summary.summary"
          :key="i"
          class="text-sm text-slate-300 flex gap-2.5"
        >
          <span class="text-emerald-500 font-bold shrink-0 tabular-nums">{{ i + 1 }}.</span>
          <span>{{ line }}</span>
        </li>
      </ol>
      <div v-if="summary.keywords?.length" class="flex flex-wrap gap-1.5 mt-3">
        <span
          v-for="kw in summary.keywords"
          :key="kw"
          class="px-2 py-0.5 text-[11px] rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 font-medium"
        >
          {{ kw }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({ summary: { type: Object, default: null } })
</script>

<style scoped>
.fade-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from  { opacity: 0; transform: translateY(6px); }
</style>
