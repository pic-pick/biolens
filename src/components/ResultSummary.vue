<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
    <!-- 결과 수 -->
    <div class="flex items-baseline gap-2 mb-4">
      <span class="text-2xl font-bold text-secondary">{{ totalCount.toLocaleString() }}</span>
      <span class="text-sm text-muted">건 검색됨</span>
    </div>

    <!-- 연도별 트렌드 차트 -->
    <div>
      <div class="flex items-center gap-2 mb-2">
        <p class="text-xs font-medium text-muted">연도별 논문 수 (2000년 이후 · 전체 기준)</p>
        <span v-if="isChartLoading" class="text-xs text-primary animate-pulse">불러오는 중...</span>
      </div>

      <!-- 로딩 중: 스켈레톤 -->
      <div v-if="isChartLoading && !hasYearData" class="h-40 bg-gray-100 rounded-lg animate-pulse" />

      <!-- 데이터 도착 후: 차트 -->
      <TrendChart v-else :year-counts="yearCounts" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TrendChart from './TrendChart.vue'

const props = defineProps({
  totalCount:     { type: Number,  default: 0 },
  yearCounts:     { type: Object,  default: null },
  isChartLoading: { type: Boolean, default: false },
})

const hasYearData = computed(() =>
  props.yearCounts && Object.keys(props.yearCounts).length > 0
)
</script>
