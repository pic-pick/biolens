<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-surface border border-slate-700 rounded-2xl shadow-2xl w-72 p-5 animate-fade-up">

        <!-- 헤더 -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-100">새 폴더</h3>
          <button
            class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            @click="$emit('close')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- 이름 입력 -->
        <div class="mb-4">
          <label class="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 block">폴더 이름</label>
          <input
            ref="inputRef"
            v-model="name"
            type="text"
            placeholder="폴더 이름"
            maxlength="30"
            class="input-dark w-full text-sm"
            @keydown.enter="handleCreate"
            @keydown.esc="$emit('close')"
          />
        </div>

        <!-- 색상 선택 -->
        <div class="mb-5">
          <label class="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-2 block">색상</label>
          <div class="flex items-center gap-2">
            <button
              v-for="color in PRESET_COLORS"
              :key="color"
              class="w-6 h-6 rounded-full transition-all duration-150 focus:outline-none"
              :style="{ background: color }"
              :class="selectedColor === color
                ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-surface scale-110'
                : 'opacity-60 hover:opacity-100 hover:scale-105'"
              @click="selectedColor = color"
            />
          </div>
        </div>

        <!-- 미리보기 -->
        <div class="flex items-center gap-2 mb-5 px-3 py-2 bg-elevated rounded-lg">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: selectedColor }" />
          <span class="text-xs text-slate-300 truncate">{{ name || '폴더 이름' }}</span>
        </div>

        <!-- 버튼 -->
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 text-sm rounded-xl border border-slate-700 text-slate-400
                   hover:border-slate-600 hover:text-slate-200 transition-all duration-150"
            @click="$emit('close')"
          >취소</button>
          <button
            class="flex-1 py-2 text-sm rounded-xl font-medium transition-all duration-150"
            :class="name.trim() ? 'btn-primary' : 'bg-slate-800 text-slate-600 cursor-not-allowed'"
            :disabled="!name.trim()"
            @click="handleCreate"
          >만들기</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProjects, PRESET_COLORS } from '../composables/useProjects.js'

const emit = defineEmits(['close', 'created'])
const { createProject } = useProjects()

const inputRef     = ref(null)
const name         = ref('')
const selectedColor = ref(PRESET_COLORS[0])

onMounted(() => inputRef.value?.focus())

function handleCreate() {
  if (!name.value.trim()) return
  const id = createProject(name.value.trim(), selectedColor.value)
  emit('created', id)
  emit('close')
}
</script>
