<template>
  <div class="flex flex-col h-full bg-base">

      <!-- ── 상단 헤더 ── -->
      <div class="shrink-0 h-12 bg-surface border-b border-slate-800 px-4 flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200 transition-colors"
          @click="$emit('close')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          닫기
        </button>

        <!-- 로딩 / 완료 상태 -->
        <div v-if="isLoading" class="flex items-center gap-2 text-[11px] text-primary">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ statusMsg || '데이터 로딩 중...' }}
        </div>
        <span v-else-if="selectedPaper && !isStabilizing" class="text-[11px] text-slate-600">
          선행 {{ nodes.filter(n=>n.group==='reference').length }}개
          · 후속 {{ nodes.filter(n=>n.group==='citation').length }}개
        </span>

        <div class="flex-1" />

        <!-- 범례 -->
        <div v-if="selectedPaper" class="hidden md:flex items-center gap-2 text-[11px]">
          <span class="w-3 h-3 rounded" style="background:#1e3a5f;border:1.5px solid #3b82f6" />
          <span class="text-blue-400">선행 연구</span>
          <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="w-3.5 h-3.5 rounded" style="background:#312e81;border:2px solid #818cf8" />
          <span class="text-indigo-300 font-semibold">스크랩 논문</span>
          <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="w-3 h-3 rounded" style="background:#451a03;border:1.5px solid #f59e0b" />
          <span class="text-amber-400">후속 연구</span>
        </div>

        <div class="w-px h-5 bg-slate-800" />

        <!-- 뷰 컨트롤 -->
        <div class="flex items-center gap-1">
          <button class="graph-ctrl-btn" title="줌 인" @click="zoomIn">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="graph-ctrl-btn" title="줌 아웃" @click="zoomOut">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="graph-ctrl-btn" title="전체 보기" @click="fitView">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div v-if="!hasS2Key" class="hidden lg:flex items-center gap-1.5 text-[10px] text-amber-500/80 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2 py-1">
          <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
          </svg>
          S2 키 없음
        </div>
      </div>

      <!-- ── 메인 영역 ── -->
      <div class="flex flex-1 overflow-hidden">

        <!-- 그래프 캔버스 -->
        <div class="relative flex-1">
          <div ref="canvasRef" class="w-full h-full" />

          <!-- 컬럼 레이블 -->
          <Transition name="fade-overlay">
            <div v-if="!isStabilizing && selectedPaper && nodes.length > 1" class="absolute top-4 inset-x-0 flex pointer-events-none">
              <div class="flex-1 text-center">
                <span class="text-[10px] font-semibold px-3 py-1 rounded-full"
                  style="color:#60a5fa;background:#1e3a5f20;border:1px solid #3b82f630">
                  ← 선행 연구 (References)
                </span>
              </div>
              <div class="flex-1 text-center">
                <span class="text-[10px] font-semibold px-3 py-1 rounded-full"
                  style="color:#a5b4fc;background:#31208120;border:1px solid #818cf830">
                  선택된 논문
                </span>
              </div>
              <div class="flex-1 text-center">
                <span class="text-[10px] font-semibold px-3 py-1 rounded-full"
                  style="color:#f59e0b;background:#451a0320;border:1px solid #f59e0b30">
                  후속 연구 (Citations) →
                </span>
              </div>
            </div>
          </Transition>

          <!-- 로딩/배치 오버레이 -->
          <Transition name="fade-overlay">
            <div v-if="isStabilizing && selectedPaper" class="absolute inset-0 bg-base flex flex-col items-center justify-center gap-5 z-10">
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center gap-4 opacity-50">
                  <div class="flex flex-col gap-1.5">
                    <div class="w-20 h-3 rounded-sm" style="background:#1e3a5f40;border:1px solid #3b82f660" />
                    <div class="w-20 h-3 rounded-sm" style="background:#1e3a5f40;border:1px solid #3b82f660" />
                    <div class="w-20 h-3 rounded-sm" style="background:#1e3a5f40;border:1px solid #3b82f660" />
                  </div>
                  <div class="w-28 h-10 rounded flex items-center justify-center" style="background:#4f46e520;border:2px solid #818cf850">
                    <span class="text-[10px] text-indigo-300/60">논문</span>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <div class="w-20 h-3 rounded-sm" style="background:#451a0340;border:1px solid #f59e0b60" />
                    <div class="w-20 h-3 rounded-sm" style="background:#451a0340;border:1px solid #f59e0b60" />
                    <div class="w-20 h-3 rounded-sm" style="background:#451a0340;border:1px solid #f59e0b60" />
                  </div>
                </div>
                <p class="text-sm font-semibold text-slate-300">
                  {{ isLoading ? '인용 데이터 수집 중...' : '그래프 배치 중...' }}
                </p>
                <p class="text-xs text-slate-600">{{ statusMsg || (isLoading ? `${loadedCount} / ${totalCount} 단계` : '잠시만 기다려주세요') }}</p>
              </div>
              <div class="w-52 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-[width] duration-300"
                  :style="{ width: totalCount > 0 ? `${Math.round((loadedCount / totalCount) * 100)}%` : '15%' }"
                />
              </div>
            </div>
          </Transition>

        </div>

      </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Network, DataSet } from 'vis-network/standalone'
import { useNetwork } from '../composables/useNetwork.js'
import { hasS2Key } from '../composables/useSemanticScholar.js'

const props = defineProps({
  papers:       { type: Array,  required: true },
  initialPaper: { type: Object, default: null },  // 처음 선택될 논문
})
const emit = defineEmits(['close', 'node-select'])

const canvasRef     = ref(null)
const selectedNode  = ref(null)
const selectedPaper = ref(null)
const isStabilizing = ref(false)

const { nodes, edges, isLoading, loadedCount, totalCount, statusMsg, buildSinglePaperGraph, setLiveCallbacks } = useNetwork()

let visNodeDS = null
let visEdgeDS = null
let network   = null

// ── vis-network 옵션 ──────────────────────────────────────────────
const VIS_OPTIONS = {
  layout: { improvedLayout: false },
  nodes: {
    shape: 'box',
    font: { color: '#94a3b8', size: 11, face: 'Inter, system-ui' },
    borderWidth: 1.5,
    borderWidthSelected: 2.5,
    widthConstraint: { minimum: 150, maximum: 210 },
    heightConstraint: { minimum: 36 },
    margin: { top: 8, right: 10, bottom: 8, left: 10 },
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.55 } },
    smooth: { type: 'cubicBezier', roundness: 0.4 },
    width: 1.2,
    selectionWidth: 2.5,
  },
  groups: {
    scrapped: {
      color: { background: '#312e81', border: '#818cf8', highlight: { background: '#3730a3', border: '#c7d2fe' }, hover: { background: '#3730a3', border: '#c7d2fe' } },
      font: { color: '#e0e7ff', size: 13, bold: true },
      borderWidth: 2.5,
      widthConstraint: { minimum: 190, maximum: 240 },
      shadow: { enabled: true, color: '#6366f130', size: 12, x: 0, y: 0 },
    },
    reference: {
      color: { background: '#1e3a5f', border: '#3b82f6', highlight: { background: '#1d4ed8', border: '#93c5fd' }, hover: { background: '#1d4ed8', border: '#93c5fd' } },
      font: { color: '#93c5fd', size: 11 },
    },
    citation: {
      color: { background: '#451a03', border: '#f59e0b', highlight: { background: '#92400e', border: '#fcd34d' }, hover: { background: '#92400e', border: '#fcd34d' } },
      font: { color: '#fcd34d', size: 11 },
    },
  },
  physics: { enabled: false },
  interaction: {
    hover: true,
    tooltipDelay: 150,
    navigationButtons: false,
    keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 } },
  },
}

// ── 레이아웃: 선택된 논문 하나 기준 3-column ────────────────────────
// 한 열에 MAX_PER_COL개 초과 시 바깥쪽으로 열 추가
function calculateLayout() {
  if (!visNodeDS || !network) return

  const refNodes  = nodes.value.filter(n => n.group === 'reference')
  const citNodes  = nodes.value.filter(n => n.group === 'citation')
  const scrapNode = nodes.value.find(n => n.group === 'scrapped')
  if (!scrapNode) return

  const COL_X      = 530   // 선행/후속 첫 열 X 거리
  const COL_X_STEP = 220   // 추가 열마다 X 증가
  const MAX_PER_COL = 10   // 한 열 최대 노드 수
  const NODE_GAP    = 88   // 노드 간 세로 간격

  const updates = [{ id: scrapNode.id, x: 0, y: 0, fixed: true }]

  const placeNodes = (list, direction) => {
    list.forEach((n, i) => {
      const col   = Math.floor(i / MAX_PER_COL)
      const row   = i % MAX_PER_COL
      const count = Math.min(MAX_PER_COL, list.length - col * MAX_PER_COL)
      updates.push({
        id: n.id,
        x: direction * (COL_X + col * COL_X_STEP),
        y: (row - (count - 1) / 2) * NODE_GAP,
        fixed: true,
      })
    })
  }

  placeNodes(refNodes, -1)   // 선행: 왼쪽
  placeNodes(citNodes, +1)   // 후속: 오른쪽

  visNodeDS.update(updates)
}

// ── 로딩 완료 → 레이아웃 계산 → 오버레이 해제 ────────────────────
watch(isLoading, (loading) => {
  if (!loading) {
    setTimeout(() => {
      calculateLayout()
      network?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } })
      setTimeout(() => { isStabilizing.value = false }, 300)
    }, 150)
  }
})

// ── 논문 선택 ─────────────────────────────────────────────────────
async function selectPaper(paper) {
  if (selectedPaper.value?.pmid === paper.pmid) return
  selectedPaper.value = paper
  selectedNode.value  = null
  isStabilizing.value = true

  // DataSet 초기화
  visNodeDS?.clear()
  visEdgeDS?.clear()

  await buildSinglePaperGraph(paper)
}

// ── vis-network 초기화 ────────────────────────────────────────────
function initNetwork() {
  if (!canvasRef.value) return
  visNodeDS = new DataSet([])
  visEdgeDS = new DataSet([])

  setLiveCallbacks(
    (action, items) => {
      if (action === 'add')    visNodeDS.add(items)
      if (action === 'update') visNodeDS.update(items)
    },
    (action, items) => {
      if (action === 'add') visEdgeDS.add(items)
    },
  )

  network = new Network(canvasRef.value, { nodes: visNodeDS, edges: visEdgeDS }, VIS_OPTIONS)

  network.on('click', (params) => {
    if (params.nodes.length > 0) {
      selectNode(params.nodes[0])
    } else {
      selectedNode.value = null
      emit('node-select', null)
    }
  })
}

function selectNode(id) {
  const n = visNodeDS?.get(id)
  if (n) {
    selectedNode.value = n
    network?.focus(id, { scale: 1.0, animation: { duration: 350 } })
    emit('node-select', { ...n.data, group: n.group, nodeId: n.id })
  }
}


function zoomIn()  { network?.moveTo({ scale: network.getScale() * 1.3, animation: true }) }
function zoomOut() { network?.moveTo({ scale: network.getScale() / 1.3, animation: true }) }
function fitView() { network?.fit({ animation: { duration: 400 } }) }

onMounted(() => {
  initNetwork()
  if (props.initialPaper) selectPaper(props.initialPaper)
})
onBeforeUnmount(() => { network?.destroy(); network = null })
</script>

<style scoped>
.graph-ctrl-btn {
  @apply w-7 h-7 flex items-center justify-center rounded-lg border border-slate-800
         text-slate-500 hover:text-slate-200 hover:border-slate-700 hover:bg-elevated
         transition-all duration-150;
}

.slide-panel-enter-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-panel-leave-active { transition: transform 0.15s ease, opacity 0.15s ease; }
.slide-panel-enter-from, .slide-panel-leave-to { transform: translateX(10px); opacity: 0; }

.fade-overlay-enter-active { transition: opacity 0.3s ease; }
.fade-overlay-leave-active { transition: opacity 0.5s ease; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }

.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
