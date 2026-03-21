<template>
  <div class="flex flex-col items-center justify-center py-24 text-center gap-4">

    <template v-if="state === 'initial'">
      <!-- search icon SVG -->
      <svg class="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" stroke-linecap="round"/>
      </svg>
      <p class="text-base font-medium text-slate-400">질병명, 화합물, 유전자를 검색하세요</p>
      <p class="text-sm text-slate-600">breast cancer · BRCA1 · Alzheimer disease</p>
    </template>

    <template v-else-if="state === 'empty'">
      <svg class="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" stroke-linecap="round"/>
        <path d="M8 11h6M11 8v6" stroke-linecap="round"/>
      </svg>
      <p class="text-base font-medium text-slate-400">검색 결과가 없습니다</p>
      <p class="text-sm text-slate-600">다른 검색어를 시도해보세요</p>
    </template>

    <template v-else-if="state === 'korean'">
      <svg class="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="text-base font-medium text-slate-400">PubMed는 영어 기반입니다</p>
      <p class="text-sm text-slate-600">
        <span class="text-secondary font-medium">breast cancer</span>처럼 영어로 검색하거나<br/>
        한글 입력 후 검색 버튼을 눌러 추천어를 받아보세요
      </p>
    </template>

  </div>
</template>

<script setup>
defineProps({ state: { type: String, default: 'initial' } })
</script>
