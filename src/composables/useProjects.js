import { ref } from 'vue'

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}
function persist(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// 모듈 레벨 싱글톤 — ScrapBoard·ScrapPaperCard가 동일 상태 공유
const projects       = ref(load('biolens_projects'))
const activeProjectId = ref(null) // null=전체, 'unfiled'=미분류, 'proj_xxx'=특정 프로젝트

export const PRESET_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f43f5e', // rose
  '#f59e0b', // amber
]

export function useProjects() {
  function createProject(name, color) {
    const id = `proj_${Date.now()}`
    projects.value.push({ id, name, color, createdAt: new Date().toISOString() })
    persist('biolens_projects', projects.value)
    return id
  }

  function deleteProject(id) {
    projects.value = projects.value.filter((p) => p.id !== id)
    persist('biolens_projects', projects.value)
    if (activeProjectId.value === id) activeProjectId.value = null
  }

  function renameProject(id, name) {
    const proj = projects.value.find((p) => p.id === id)
    if (proj) { proj.name = name; persist('biolens_projects', projects.value) }
  }

  function getProject(id) {
    return projects.value.find((p) => p.id === id) ?? null
  }

  return { projects, activeProjectId, createProject, deleteProject, renameProject, getProject }
}
