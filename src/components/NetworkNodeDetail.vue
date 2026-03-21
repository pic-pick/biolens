<template>
  <div class="flex flex-col h-full overflow-hidden">

    <!-- 노드 미선택 상태 -->
    <div
      v-if="!node"
      class="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800"
    >
      <svg class="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
        <circle cx="12" cy="19" r="2"/>
        <path d="M7 5h10M5.5 7l5.5 9.5M18.5 7L13 16.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="text-sm text-slate-600">노드를 클릭하면</p>
      <p class="text-xs text-slate-700">논문 정보가 여기에 표시됩니다</p>
    </div>

    <!-- 논문 상세 패널 -->
    <div v-else class="flex-1 overflow-y-auto pr-0.5">

      <!-- 로딩 스켈레톤 -->
      <div v-if="isFetching" class="space-y-3 animate-pulse p-1">
        <div class="h-3 bg-slate-800 rounded w-16" />
        <div class="h-4 bg-slate-800 rounded w-full" />
        <div class="h-4 bg-slate-800 rounded w-3/4" />
        <div class="h-3 bg-slate-800 rounded w-1/2" />
        <div class="h-20 bg-slate-800 rounded w-full mt-2" />
      </div>

      <div v-else class="card-dark p-4 flex flex-col gap-3">
        <!-- 컬러 바 -->
        <div
          class="h-[2px] -mx-4 -mt-4 mb-1 rounded-t"
          :class="paper.group === 'citation'
            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
            : paper.group === 'reference'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
              : 'bg-gradient-to-r from-primary to-secondary'"
        />

        <!-- 배지 행 -->
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="text-[10px] px-1.5 py-0.5 rounded font-medium"
            :class="paper.group === 'citation'
              ? 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
              : paper.group === 'reference'
                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
                : 'bg-indigo-900/30 text-indigo-400 border border-indigo-800/40'"
          >{{ paper.group === 'citation' ? '후속 연구' : paper.group === 'reference' ? '선행 연구' : '📌 스크랩' }}</span>

          <span v-if="paper.year" class="text-xs text-slate-500 tabular-nums">{{ paper.year }}</span>

          <span
            v-for="pt in paper.pubtype?.slice(0, 2)"
            :key="pt"
            class="px-2 py-0.5 text-[11px] rounded-md bg-slate-800 text-slate-400 border border-slate-700"
          >{{ pt }}</span>

          <CitationBadge :citation-count="paper.citationCount ?? null" :rcr="paper.rcr ?? null" />
        </div>

        <!-- 제목 -->
        <h2 class="text-sm font-semibold text-slate-100 leading-snug">
          {{ paper.title || paper.nodeId }}
        </h2>

        <!-- 저자 / 저널 -->
        <p v-if="paper.authors || paper.journal" class="text-xs text-slate-400">
          {{ paper.authors }}
          <span v-if="paper.journal"> · <em class="text-slate-500">{{ paper.journal }}</em></span>
        </p>

        <!-- 초록 -->
        <div v-if="isExpanded && paper.abstract">
          <div class="flex items-center gap-2 mb-2">
            <button
              class="text-[11px] px-2 py-0.5 rounded-md transition-all"
              :class="!showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
              @click="showKorean = false"
            >원문</button>
            <button
              class="text-[11px] px-2 py-0.5 rounded-md transition-all"
              :class="showKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
              :disabled="isTranslating"
              @click="handleTranslate"
            >
              <span v-if="isTranslating" class="animate-pulse">번역 중...</span>
              <span v-else>한국어</span>
            </button>
          </div>
          <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {{ showKorean && translation ? translation : paper.abstract }}
          </p>
        </div>
        <p v-else-if="isExpanded && paper.abstractFailed" class="text-sm text-red-400/70 italic">초록을 불러올 수 없습니다.</p>
        <p v-else-if="isExpanded && !paper.abstract && paper.hasAbstract" class="text-sm text-slate-500 italic">초록 불러오는 중...</p>
        <p v-else-if="isExpanded && paper.hasAbstract === false" class="text-sm text-slate-500 italic">초록이 제공되지 않는 논문입니다.</p>

        <!-- MeSH 칩 -->
        <div v-if="isExpanded && paper.meshTerms?.length" class="flex flex-wrap gap-1">
          <span
            v-for="term in paper.meshTerms.slice(0, 8)"
            :key="term"
            class="px-2 py-0.5 text-[11px] rounded-md bg-blue-900/30 text-blue-400 border border-blue-800/40"
          >{{ term }}</span>
        </div>

        <!-- AI 요약 -->
        <AiSummary :summary="aiSummary" />
        <p v-if="aiError" class="text-xs text-red-400">
          {{ aiError }}
          <button class="ml-2 underline hover:no-underline" @click="handleAiSummary">재시도</button>
        </p>

        <!-- 액션 버튼 -->
        <div class="flex flex-wrap gap-2 pt-1">
          <button
            v-if="paper.hasAbstract !== false"
            class="btn-ghost text-xs px-3 py-1.5"
            @click="isExpanded = !isExpanded"
          >{{ isExpanded ? '접기' : '초록 보기' }}</button>

          <button
            class="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
            :class="paper.hasAbstract
              ? 'border-primary/50 text-primary hover:bg-primary hover:text-white hover:border-primary'
              : 'border-slate-800 text-slate-700 cursor-not-allowed'"
            :disabled="!paper.hasAbstract || isAiLoading"
            @click="handleAiSummary"
          >
            <span v-if="isAiLoading" class="flex items-center gap-1.5">
              <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>분석 중
            </span>
            <span v-else-if="aiSummary">요약 완료</span>
            <span v-else-if="!paper.hasAbstract">AI 요약 불가</span>
            <span v-else>AI 요약</span>
          </button>

          <a
            v-if="paper.pmcId"
            :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcId}/`"
            target="_blank" rel="noopener noreferrer"
            class="text-xs px-3 py-1.5 rounded-lg border border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/30 transition-all"
          >Full Text</a>

          <a
            v-if="paper.doi"
            :href="`https://doi.org/${paper.doi}`"
            target="_blank" rel="noopener noreferrer"
            class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
          >DOI</a>

          <a
            v-if="paper.pmid && !paper.pmcId && !paper.doi"
            :href="`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`"
            target="_blank" rel="noopener noreferrer"
            class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
          >PubMed</a>

          <!-- Save 버튼 (폴더 피커) -->
          <div
            v-if="paper.pmid && paper.group !== 'scrapped'"
            class="relative ml-auto"
            @click.stop
          >
            <button
              class="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium flex items-center gap-1"
              :class="isPaperScraped(paper.pmid)
                ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/30'
                : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'"
              @click="showFolderPicker = !showFolderPicker"
            >
              {{ isPaperScraped(paper.pmid) ? 'Saved' : 'Save' }}
              <svg class="w-3 h-3 opacity-60 transition-transform" :class="showFolderPicker ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke-linecap="round"/>
              </svg>
            </button>

            <Transition name="folder-drop">
              <div
                v-if="showFolderPicker"
                class="absolute bottom-full right-0 mb-1.5 z-30 bg-elevated border border-slate-700 rounded-xl shadow-xl py-1 min-w-[168px]"
              >
                <p class="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">폴더 선택 후 저장</p>

                <button
                  class="w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-800/60 transition-colors flex items-center gap-2 text-slate-400 hover:text-slate-200"
                  @click="saveToFolder(null)"
                >
                  <svg class="w-3 h-3 shrink-0 text-slate-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  미분류
                </button>

                <div v-if="projects.length" class="h-px bg-slate-800 mx-2 my-0.5" />
                <button
                  v-for="proj in projects"
                  :key="proj.id"
                  class="w-full px-3 py-1.5 text-left text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                  @click="saveToFolder(proj.id)"
                >
                  <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: proj.color }" />
                  <span class="truncate">{{ proj.name }}</span>
                </button>

                <div class="h-px bg-slate-800 mx-2 my-0.5" />
                <button
                  class="w-full px-3 py-1.5 text-left text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                  @click="showNewFolder = true; showFolderPicker = false"
                >
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
                  </svg>
                  새 폴더
                </button>

                <template v-if="isPaperScraped(paper.pmid)">
                  <div class="h-px bg-slate-800 mx-2 my-0.5" />
                  <button
                    class="w-full px-3 py-1.5 text-left text-[11px] text-red-500 hover:bg-red-900/20 transition-colors"
                    @click="unscrapPaper(paper.pmid); showFolderPicker = false"
                  >저장 취소</button>
                </template>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ProjectCreateModal
    v-if="showNewFolder"
    @close="showNewFolder = false"
    @created="(id) => { saveToFolder(id); showNewFolder = false }"
  />
</template>

<script setup>
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import CitationBadge from './CitationBadge.vue'
import AiSummary from './AiSummary.vue'
import ProjectCreateModal from './ProjectCreateModal.vue'
import { useScrap } from '../composables/useScrap.js'
import { useProjects } from '../composables/useProjects.js'
import { fetchCitations } from '../composables/useICite.js'
import { summarizeAbstract, translateAbstract } from '../composables/useOpenAI.js'
import { parseEFetchXML } from '../utils/xmlParser.js'

const props = defineProps({
  node: { type: Object, default: null },
})

const { scrapPaper, unscrapPaper, isPaperScraped, assignToProject } = useScrap()
const { projects } = useProjects()

const BASE    = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const API_KEY = import.meta.env.VITE_NCBI_API_KEY || undefined

// 화면에 표시할 논문 데이터 (노드 기본값 + PubMed 보강)
const paper = reactive({
  pmid: null, title: '', authors: '', journal: '', year: '',
  pubtype: [], doi: null, pmcId: null,
  hasAbstract: null, abstract: null, abstractFailed: false,
  meshTerms: [], chemicals: [],
  citationCount: null, rcr: null,
  group: null, nodeId: null,
})

const isFetching      = ref(false)
const isExpanded      = ref(false)
const showFolderPicker = ref(false)
const showNewFolder    = ref(false)
const translation   = ref(null)
const isTranslating = ref(false)
const showKorean    = ref(false)
const aiSummary     = ref(null)
const aiError       = ref(null)
const isAiLoading   = ref(false)

function onOutsideClick() { showFolderPicker.value = false }
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))

function saveToFolder(folderId) {
  const paperData = {
    pmid: paper.pmid, title: paper.title, authors: paper.authors,
    journal: paper.journal, year: paper.year, abstract: paper.abstract,
    meshTerms: paper.meshTerms, chemicals: paper.chemicals,
    pubtype: paper.pubtype, doi: paper.doi, pmcId: paper.pmcId,
    hasAbstract: paper.hasAbstract, citationCount: paper.citationCount, rcr: paper.rcr,
  }
  if (!isPaperScraped(paper.pmid)) {
    scrapPaper(paperData, aiSummary.value, folderId)
  } else {
    assignToProject(paper.pmid, folderId)
  }
  showFolderPicker.value = false
}

function resetState() {
  isFetching.value      = false
  isExpanded.value      = false
  showFolderPicker.value = false
  translation.value   = null
  isTranslating.value = false
  showKorean.value    = false
  aiSummary.value     = null
  aiError.value       = null
  isAiLoading.value   = false
}

watch(() => props.node, async (node) => {
  resetState()
  if (!node) return

  // 노드 기본 데이터로 먼저 채움
  Object.assign(paper, {
    pmid:          node.pmid   || null,
    title:         node.title  || '',
    authors:       node.author || '',
    journal:       node.journal || '',
    year:          node.year   || '',
    pubtype:       [],
    doi:           null,
    pmcId:         null,
    hasAbstract:   null,
    abstract:      null,
    abstractFailed: false,
    meshTerms:     [],
    chemicals:     [],
    citationCount: node.citationCount ?? null,
    rcr:           null,
    group:         node.group  || null,
    nodeId:        node.nodeId || null,
  })

  if (!node.pmid) return  // pmid 없으면 API 조회 불가

  isFetching.value = true
  try {
    // 1. ESummary → pubtype, doi, pmcId, hasAbstract, 기본 메타 보강
    const params = { db: 'pubmed', id: node.pmid, retmode: 'json' }
    if (API_KEY) params.api_key = API_KEY
    const sumRes = await axios.get(`${BASE}/esummary.fcgi`, { params })
    const item   = sumRes.data?.result?.[node.pmid]
    if (item && !item.error) {
      if (!paper.title)   paper.title   = item.title?.replace(/<[^>]+>/g, '').trim() || paper.title
      if (!paper.authors) paper.authors = item.authors?.map(a => a.name).join(', ') || ''
      if (!paper.journal) paper.journal = item.source || ''
      if (!paper.year)    paper.year    = item.pubdate?.slice(0, 4) || ''
      paper.pubtype     = item.pubtype ?? []
      paper.hasAbstract = item.attributes?.includes('Has Abstract') ?? false
      // doi
      const doi = item.articleids?.find(a => a.idtype === 'doi')?.value
      if (doi) paper.doi = doi
      // pmcId
      const pmc = item.articleids?.find(a => a.idtype === 'pmc')?.value
      if (pmc) paper.pmcId = pmc.replace('PMC', '')
    }

    // 2. iCite → citationCount 보강 + rcr
    const citMap = await fetchCitations([node.pmid])
    const cit    = citMap.get(String(node.pmid))
    if (cit) {
      paper.citationCount = cit.citationCount
      paper.rcr           = cit.rcr
    }

    // 3. EFetch → abstract, meshTerms, chemicals (hasAbstract인 경우만)
    if (paper.hasAbstract) {
      const fetchParams = { db: 'pubmed', id: node.pmid, retmode: 'xml' }
      if (API_KEY) fetchParams.api_key = API_KEY
      const fetchRes = await axios.get(`${BASE}/efetch.fcgi`, { params: fetchParams })
      const [parsed] = parseEFetchXML(fetchRes.data)
      if (parsed) {
        paper.abstract  = parsed.abstract  || null
        paper.meshTerms = parsed.meshTerms || []
        paper.chemicals = parsed.chemicals || []
      } else {
        paper.abstractFailed = true
      }
    }
  } catch (err) {
    console.warn('[NetworkNodeDetail] fetch 실패:', err.message)
    if (paper.hasAbstract) paper.abstractFailed = true
  } finally {
    isFetching.value = false
  }
}, { immediate: true })

async function handleTranslate() {
  if (translation.value) { showKorean.value = !showKorean.value; return }
  if (!paper.abstract) return
  isTranslating.value = true
  try {
    translation.value = await translateAbstract(paper.abstract)
    showKorean.value  = true
  } catch { /* 조용히 실패 */ }
  finally { isTranslating.value = false }
}

async function handleAiSummary() {
  if (!paper.hasAbstract || isAiLoading.value || aiSummary.value) return
  isAiLoading.value = true
  aiError.value     = null
  try {
    if (!paper.abstract) throw new Error('초록을 가져올 수 없습니다.')
    aiSummary.value = await summarizeAbstract({
      abstract:  paper.abstract,
      meshTerms: paper.meshTerms,
      chemicals: paper.chemicals,
    })
  } catch (err) {
    const msg = err.response?.data?.error?.message ?? err.message ?? ''
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing')) {
      aiError.value = 'OpenAI 크레딧이 부족합니다.'
    } else {
      aiError.value = msg || 'AI 요약 생성에 실패했습니다.'
    }
  } finally {
    isAiLoading.value = false
  }
}
</script>

<style scoped>
.folder-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.folder-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.folder-drop-enter-from, .folder-drop-leave-to { opacity: 0; transform: translateY(4px); }
</style>
