<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="bg-elevated border border-slate-700 rounded-2xl shadow-2xl w-[360px] overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 class="text-sm font-semibold text-slate-200 uppercase tracking-widest">Settings</h2>
          <button
            class="text-slate-600 hover:text-slate-300 transition-colors"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="px-5 py-4 flex flex-col gap-4">

          <!-- localStorage 초기화 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-300 font-medium">데이터 초기화</p>
              <p class="text-[11px] text-slate-500 mt-0.5">저장된 논문, 폴더, 검색 기록을 모두 삭제합니다</p>
            </div>
            <button
              class="text-xs px-3 py-1.5 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-900/20 hover:border-red-700 transition-all font-medium shrink-0 ml-4"
              @click="confirmReset"
            >초기화</button>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            class="text-xs px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            @click="emit('close')"
          >닫기</button>
        </div>

      </div>
    </div>
  </Teleport>

  <!-- 확인 다이얼로그 -->
  <Teleport to="body">
    <div
      v-if="showConfirm"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
      @click.self="showConfirm = false"
    >
      <div class="bg-elevated border border-slate-700 rounded-xl shadow-2xl w-[300px] p-5 flex flex-col gap-4">
        <p class="text-sm text-slate-200 font-medium">정말 초기화하시겠습니까?</p>
        <p class="text-xs text-slate-500 -mt-2">저장된 논문, 폴더, 분석 결과, 검색 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <div class="flex gap-2 justify-end">
          <button
            class="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            @click="showConfirm = false"
          >취소</button>
          <button
            class="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-800 text-red-400 hover:bg-red-900 transition-colors font-medium"
            @click="doReset"
          >초기화</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'


const emit = defineEmits(['close'])

const showConfirm = ref(false)

function confirmReset() {
  showConfirm.value = true
}

function doReset() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('biolens_')) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
  window.location.reload()
}
</script>
