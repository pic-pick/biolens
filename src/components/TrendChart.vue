<template>
  <div class="relative">
    <Bar v-if="hasData" :data="chartData" :options="chartOptions" class="max-h-40" />
    <p v-else class="text-xs text-slate-500 text-center py-4">연도 데이터가 부족합니다.</p>
    <p v-if="hasData" class="text-[10px] text-slate-600 text-center mt-1">
      연도 바를 클릭하면 해당 연도 논문만 필터링됩니다
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps({
  yearCounts:   { type: Object, default: null },
  selectedYear: { type: [String, Number], default: null },
})
const emit = defineEmits(['year-click'])

const sorted = computed(() => {
  if (!props.yearCounts || Object.keys(props.yearCounts).length === 0) return []
  return Object.entries(props.yearCounts).sort(([a], [b]) => a - b)
})

const hasData = computed(() => sorted.value.length > 1)

const chartData = computed(() => ({
  labels: sorted.value.map(([year]) => year),
  datasets: [{
    data: sorted.value.map(([, count]) => count),
    backgroundColor: sorted.value.map(([year]) =>
      String(year) === String(props.selectedYear) ? '#F59E0B' : 'rgba(59,130,246,0.6)'
    ),
    hoverBackgroundColor: sorted.value.map(([year]) =>
      String(year) === String(props.selectedYear) ? '#FBBF24' : '#3B82F6'
    ),
    borderRadius: 4,
    borderSkipped: false,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: (event, elements) => {
    if (elements.length > 0) {
      const idx  = elements[0].index
      const year = sorted.value[idx][0]
      // 같은 연도 클릭 시 해제
      emit('year-click', String(year) === String(props.selectedYear) ? null : year)
    }
  },
  onHover: (event, chartElement) => {
    event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default'
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E293B',
      titleColor:      '#94A3B8',
      bodyColor:       '#E2E8F0',
      borderColor:     '#2D4060',
      borderWidth:     1,
      callbacks: { label: (ctx) => ` ${ctx.raw.toLocaleString()}편` },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748B', font: { size: 10 } },
    },
    y: {
      grid: { color: '#1E293B' },
      ticks: { color: '#64748B', stepSize: 1, precision: 0, font: { size: 10 } },
    },
  },
}))
</script>
