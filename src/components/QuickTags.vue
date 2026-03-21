<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="tag in quickTags"
      :key="tag.en"
      class="px-3 py-1.5 text-xs rounded-full border border-accent text-secondary hover:bg-accent hover:text-white transition-colors"
      @click="emit('search', tag.en)"
    >
      {{ tag.en }}
      <span class="text-muted ml-1">({{ tag.ko }})</span>
    </button>
  </div>
</template>

<script setup>
const emit = defineEmits(['search'])

const quickTags = [
  { en: 'BRCA1',                ko: 'BRCA1 유전자' },
  { en: 'cancer immunotherapy', ko: '암 면역치료' },
  { en: 'Alzheimer disease',    ko: '알츠하이머' },
  { en: 'COVID-19 drug',        ko: 'COVID-19 치료제' },
  { en: 'CRISPR therapy',       ko: 'CRISPR 유전자치료' },
  { en: 'PD-1 PD-L1',          ko: '면역관문억제제' },
]
</script>
