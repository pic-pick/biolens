<template>
  <div class="flex flex-col md:flex-row gap-3 md:gap-5 h-full overflow-hidden relative">

    <!-- 모바일 탭 (md 이상에서는 숨김) -->
    <div class="flex md:hidden shrink-0 border border-slate-800 rounded-xl overflow-hidden">
      <button
        class="flex-1 py-2 text-xs font-medium transition-colors"
        :class="mobileTab === 'papers' ? 'bg-primary/15 text-primary' : 'bg-elevated text-slate-500 hover:text-slate-300'"
        @click="mobileTab = 'papers'"
      >논문 <span class="opacity-60">{{ papers.length }}</span></button>
      <div class="w-px bg-slate-800" />
      <button
        class="flex-1 py-2 text-xs font-medium transition-colors"
        :class="mobileTab === 'analyses' ? 'bg-primary/15 text-primary' : 'bg-elevated text-slate-500 hover:text-slate-300'"
        @click="mobileTab = 'analyses'"
      >분석 <span class="opacity-60">{{ sortedAnalyses.length }}</span></button>
    </div>

    <!-- ── 논문 스크랩 ── -->
    <div
      class="flex-1 flex flex-col overflow-hidden min-w-0"
      :class="mobileTab !== 'papers' ? 'hidden md:flex' : ''"
    >

      <!-- 카드 뷰 헤더 -->
      <div v-if="!networkPaper" class="flex items-center justify-between mb-3 shrink-0">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          Saved Papers
          <span class="text-[11px] font-normal bg-slate-800 text-slate-400 rounded-md px-2 py-0.5 border border-slate-700">{{ papers.length }}</span>
        </h2>
        <p class="text-[11px] text-slate-600">논문을 2~5편 선택하면 종합분석 가능</p>
      </div>

      <!-- 프로젝트 필터 탭 -->
      <div v-if="!networkPaper" class="flex items-center gap-1.5 mb-3 shrink-0 flex-wrap">
        <!-- 전체 -->
        <button
          class="proj-tab"
          :class="!activeProjectId ? 'proj-tab-active' : ''"
          @click="activeProjectId = null"
        >전체 <span class="proj-tab-count">{{ papers.length }}</span></button>

        <!-- 미분류 -->
        <button
          class="proj-tab"
          :class="activeProjectId === 'unfiled' ? 'proj-tab-active' : ''"
          @click="activeProjectId = 'unfiled'"
        >미분류 <span class="proj-tab-count">{{ papers.filter(p => !p.projectId).length }}</span></button>

        <!-- 프로젝트 탭 -->
        <div
          v-for="proj in projects"
          :key="proj.id"
          class="relative group/projtab"
        >
          <button
            class="proj-tab flex items-center gap-1.5"
            :class="activeProjectId === proj.id ? 'proj-tab-active' : ''"
            @click="activeProjectId = proj.id"
          >
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: proj.color }" />
            <span class="max-w-[80px] truncate">{{ proj.name }}</span>
            <span class="proj-tab-count">{{ papers.filter(p => p.projectId === proj.id).length }}</span>
          </button>
          <!-- 프로젝트 삭제 버튼 -->
          <button
            class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 border border-slate-600 text-slate-400 hover:bg-red-900/60 hover:text-red-400 hover:border-red-700/60 transition-all opacity-0 group-hover/projtab:opacity-100 flex items-center justify-center"
            @click.stop="handleDeleteProject(proj.id)"
          >
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- 새 폴더 -->
        <button
          class="proj-tab flex items-center gap-1 text-slate-500 hover:text-slate-300"
          @click="showCreateModal = true"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
          </svg>
          새 폴더
        </button>
      </div>

      <!-- 일괄 작업 바 -->
      <Transition name="bulk-bar">
        <div
          v-if="selectedPapers.length > 0 && !networkPaper"
          class="flex items-center gap-2 mb-3 px-4 py-2 bg-elevated border border-primary/30 rounded-xl shrink-0"
        >
          <span class="text-xs font-semibold text-slate-200 tabular-nums whitespace-nowrap">{{ selectedPapers.length }}<span class="text-slate-500 font-normal"> / {{ MAX_SELECT }}편 선택</span></span>
          <div class="w-px h-3.5 bg-slate-700 mx-1 shrink-0" />

          <!-- 이동 -->
          <div class="relative" @click.stop>
            <button
              class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
              @click="showBulkFolder = !showBulkFolder"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              이동
            </button>
            <Transition name="proj-drop">
              <div v-if="showBulkFolder" class="absolute left-0 bottom-full mb-2 bg-elevated border border-slate-700 rounded-xl shadow-xl py-1 min-w-[156px] z-40">
                <p class="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">폴더 선택</p>
                <button
                  class="w-full px-3 py-1.5 text-left text-[11px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                  @click="bulkAssignFolder(null)"
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
                  @click="bulkAssignFolder(proj.id)"
                >
                  <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: proj.color }" />
                  <span class="truncate">{{ proj.name }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Compare -->
          <button
            class="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="selectedPapers.length < 2 || selectedPapers.some(p => !p.abstract)"
            :title="selectedPapers.some(p => !p.abstract) ? '초록이 있는 논문만 비교 가능합니다' : ''"
            @click="showComparison = true"
          >Compare</button>

          <!-- Analyze -->
          <button
            class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            :disabled="selectedPapers.length < 2 || selectedPapers.some(p => !p.abstract)"
            :title="selectedPapers.some(p => !p.abstract) ? '초록이 있는 논문만 분석 가능합니다' : ''"
            @click="showSynthesis = true"
          >Analyze</button>

          <button
            class="ml-auto text-[11px] text-slate-600 hover:text-slate-400 transition-colors shrink-0"
            @click="selectedPapers = []"
          >취소</button>
        </div>
      </Transition>

      <!-- ── 네트워크 인라인 뷰 ── -->
      <Transition name="net-slide">
        <div v-if="networkPaper" class="flex-1 flex flex-col overflow-hidden">
          <NetworkGraph
            :papers="papers"
            :initial-paper="networkPaper"
            @close="networkPaper = null; networkSelectedNode = null"
            @node-select="n => networkSelectedNode = n"
          />
        </div>
      </Transition>

      <!-- 빈 상태 (카드 뷰) -->
      <div
        v-if="!networkPaper && filteredPapers.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800"
      >
        <svg class="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm text-slate-600">스크랩한 논문이 없습니다</p>
        <p class="text-xs text-slate-700">논문 카드의 Save 버튼을 눌러보세요</p>
      </div>

      <!-- 카드 그리드 (masonry) -->
      <div v-else-if="!networkPaper" class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div class="flex flex-col gap-3">
            <ScrapPaperCard
              v-for="(p, i) in leftPapers"
              :key="p.pmid"
              :paper="p"
              :projects="projects"
              :selectable="true"
              :is-selected="isSelected(p)"
              :select-disabled="!isSelected(p) && selectedPapers.length >= MAX_SELECT"
              :is-dragging="draggingPmid === p.pmid"
              @delete="unscrapPaper(p.pmid)"
              @toggle="toggleSelect"
              @assign="assignToProject"
              @network="p => networkPaper = p"
              @dragstart="onDragStart($event, papers.indexOf(p))"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOver($event, papers.indexOf(p))"
              @drop.prevent="onDrop($event, papers.indexOf(p))"
            />
          </div>
          <div class="flex flex-col gap-3">
            <ScrapPaperCard
              v-for="(p, i) in rightPapers"
              :key="p.pmid"
              :paper="p"
              :projects="projects"
              :selectable="true"
              :is-selected="isSelected(p)"
              :select-disabled="!isSelected(p) && selectedPapers.length >= MAX_SELECT"
              :is-dragging="draggingPmid === p.pmid"
              @delete="unscrapPaper(p.pmid)"
              @toggle="toggleSelect"
              @assign="assignToProject"
              @network="p => networkPaper = p"
              @dragstart="onDragStart($event, papers.indexOf(p))"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOver($event, papers.indexOf(p))"
              @drop.prevent="onDrop($event, papers.indexOf(p))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 구분선 -->
    <div class="hidden md:block md:h-auto md:w-px bg-slate-800 shrink-0" />

    <!-- ── 종합분석 / 논문 탐색 ── -->
    <div
      class="w-full md:w-[420px] md:shrink-0 flex flex-col overflow-hidden md:max-h-full"
      :class="mobileTab !== 'analyses' ? 'hidden md:flex max-h-[45vh]' : 'max-h-none'"
    >
      <div class="flex items-center justify-between mb-4 shrink-0">
        <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Transition name="fade-label" mode="out-in">
            <span v-if="networkPaper" key="explore">논문 탐색</span>
            <span v-else key="analyses">Analyses</span>
          </Transition>
          <span
            v-if="!networkPaper"
            class="text-[11px] font-normal bg-accent/20 text-accent rounded-md px-2 py-0.5 border border-accent/20"
          >{{ syntheses.length + comparisons.length }}</span>
        </h2>
      </div>

      <!-- ── 네트워크 모드: 논문 탐색 패널 ── -->
      <NetworkNodeDetail
        v-if="networkPaper"
        :node="networkSelectedNode"
      />

      <!-- ── 일반 모드: 종합분석 목록 ── -->
      <template v-else>

      <!-- 빈 상태 -->
      <div
        v-if="syntheses.length === 0 && comparisons.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800"
      >
        <svg class="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-sm text-slate-600">저장된 분석 없음</p>
        <p class="text-xs text-slate-700 text-center px-4">논문 2~5편 선택 후<br/>종합분석 또는 비교표를 실행하세요</p>
      </div>

      <!-- 분석 카드 목록 (syntheses + comparisons 시간순 정렬) -->
      <div v-else class="flex-1 overflow-y-auto space-y-3 pr-1">

        <template v-for="item in sortedAnalyses" :key="item.id">

          <!-- 종합분석 카드 -->
          <div
            v-if="item.type === 'synthesis'"
            class="bg-surface border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition-all duration-200"
          >
            <div class="h-[2px] bg-gradient-to-r from-accent to-violet-400" />
            <div class="p-4 flex flex-col gap-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 font-medium">Synthesis</span>
                  <p class="text-[11px] text-slate-600">{{ formatDate(item.scrapedAt) }}</p>
                </div>
                <button
                  class="text-[11px] text-slate-700 hover:text-red-400 transition-all shrink-0"
                  @click="unscrapSynthesis(item.id)"
                >삭제</button>
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="(paper, i) in item.papers"
                  :key="paper.pmid"
                  class="text-[11px] px-2 py-0.5 bg-violet-900/30 text-violet-400 border border-violet-800/40 rounded-md hover:bg-violet-900/50 transition-colors text-left"
                  @click="openPaperDetail(paper)"
                >
                  [{{ i + 1 }}] {{ paper.title.length > 20 ? paper.title.slice(0, 20) + '…' : paper.title }}
                </button>
              </div>
              <div v-if="item.result?.commonFindings">
                <p class="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">공통 결과</p>
                <p class="text-xs text-slate-300 leading-relaxed">{{ item.result.commonFindings }}</p>
              </div>
              <div v-if="item.result?.conclusion" class="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2.5">
                <p class="text-[11px] font-semibold text-secondary uppercase tracking-wide mb-0.5">결론</p>
                <p class="text-xs text-slate-300 leading-relaxed">{{ item.result.conclusion }}</p>
              </div>
              <div v-if="item.result?.keyThemes?.length" class="flex flex-wrap gap-1">
                <span
                  v-for="theme in item.result.keyThemes"
                  :key="theme"
                  class="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700"
                >{{ theme }}</span>
              </div>
            </div>
          </div>

          <!-- 비교표 카드 -->
          <div
            v-else-if="item.type === 'comparison'"
            class="bg-surface border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition-all duration-200"
          >
            <div class="h-[2px] bg-gradient-to-r from-primary to-secondary" />
            <div class="p-4 flex flex-col gap-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 font-medium">Compare</span>
                  <p class="text-[11px] text-slate-600">{{ formatDate(item.scrapedAt) }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="text-[11px] text-primary hover:text-blue-300 transition-colors"
                    @click="openSavedComparison(item)"
                  >보기</button>
                  <button
                    class="text-[11px] text-slate-700 hover:text-red-400 transition-all shrink-0"
                    @click="unscrapComparison(item.id)"
                  >삭제</button>
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="(paper, i) in item.papers"
                  :key="paper.pmid"
                  class="text-[11px] px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-800/40 rounded-md hover:bg-blue-900/50 transition-colors text-left"
                  @click="openPaperDetail(paper)"
                >
                  [{{ i + 1 }}] {{ paper.title.length > 20 ? paper.title.slice(0, 20) + '…' : paper.title }}
                </button>
              </div>
              <div v-if="item.result?.consensus">
                <p class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide mb-0.5">공통 결과</p>
                <p class="text-xs text-slate-300 leading-relaxed">{{ item.result.consensus }}</p>
              </div>
              <div v-if="item.result?.researchGap" class="bg-slate-800/40 border border-slate-700/40 rounded-lg p-2.5">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Research Gap</p>
                <p class="text-xs text-slate-400 leading-relaxed">{{ item.result.researchGap }}</p>
              </div>
            </div>
          </div>

        </template>
      </div>

      </template>
    </div>

    <!-- 프로젝트 생성 모달 -->
    <ProjectCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="(id) => { activeProjectId = id; showCreateModal = false }"
    />

    <!-- 종합분석 패널 -->
    <SynthesisPanel
      v-if="showSynthesis"
      :papers="selectedPapers"
      @close="showSynthesis = false"
    />

    <!-- 비교표 패널 (새 분석) -->
    <ComparisonPanel
      v-if="showComparison"
      :papers="selectedPapers"
      @close="showComparison = false"
    />

    <!-- 비교표 패널 (저장된 결과 열람) -->
    <ComparisonPanel
      v-if="viewingComparison"
      :papers="viewingComparison.papers"
      :preloaded-result="viewingComparison.result"
      @close="viewingComparison = null"
    />


    <!-- 논문 상세 팝업 -->
    <Teleport to="body">
      <Transition name="fade-modal">
        <div
          v-if="detailPaper"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          @click.self="detailPaper = null"
        >
          <div class="bg-surface border border-slate-700 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-6 m-4 animate-fade-up">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <span class="text-[11px] px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-md font-medium border border-blue-800/40 tabular-nums">
                  {{ detailPaper.year }}
                </span>
                <h3 class="mt-2 text-sm font-bold text-slate-100 leading-snug">{{ detailPaper.title }}</h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ detailPaper.authors }}<em v-if="detailPaper.journal" class="text-slate-600"> · {{ detailPaper.journal }}</em>
                </p>
              </div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:text-slate-300 shrink-0 transition-all"
                @click="detailPaper = null"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div v-if="detailPaper.abstract">
              <div class="flex items-center gap-2 mb-2">
                <button
                  class="text-xs px-2 py-0.5 rounded-md transition-all"
                  :class="!detailShowKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
                  @click="detailShowKorean = false"
                >원문</button>
                <button
                  class="text-xs px-2 py-0.5 rounded-md transition-all"
                  :class="detailShowKorean ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'"
                  :disabled="detailTranslating"
                  @click="handleDetailTranslate"
                >
                  <span v-if="detailTranslating" class="animate-pulse">번역 중...</span>
                  <span v-else>한국어</span>
                </button>
              </div>
              <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {{ detailShowKorean && detailTranslation ? detailTranslation : detailPaper.abstract }}
              </p>
            </div>
            <p v-else class="text-sm text-slate-600 italic">초록 없음</p>

            <div v-if="detailPaper.aiSummary?.summary?.length" class="mt-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3">
              <p class="text-xs font-semibold text-emerald-400 mb-1.5 uppercase tracking-wide">AI Summary</p>
              <ul class="space-y-0.5">
                <li v-for="(s, i) in detailPaper.aiSummary.summary" :key="i" class="text-xs text-slate-400 leading-relaxed">
                  {{ i + 1 }}. {{ s }}
                </li>
              </ul>
            </div>

            <div v-if="detailPaper.meshTerms?.length" class="mt-3 flex flex-wrap gap-1">
              <span
                v-for="term in detailPaper.meshTerms.slice(0, 6)"
                :key="term"
                class="text-xs bg-blue-900/20 text-blue-400 rounded-md px-2 py-0.5 border border-blue-800/30"
              >{{ term }}</span>
            </div>

            <div class="flex gap-3 mt-4">
              <a
                v-if="detailPaper.pmcId"
                :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/${detailPaper.pmcId}/`"
                target="_blank" rel="noopener noreferrer"
                class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline"
              >Full Text</a>
              <a
                v-if="detailPaper.doi"
                :href="`https://doi.org/${detailPaper.doi}`"
                target="_blank" rel="noopener noreferrer"
                class="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
              >DOI</a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useScrap } from '../composables/useScrap.js'
import { useProjects } from '../composables/useProjects.js'
import { translateAbstract } from '../composables/useOpenAI.js'
import ScrapPaperCard from './ScrapPaperCard.vue'
import SynthesisPanel from './SynthesisPanel.vue'
import ComparisonPanel from './ComparisonPanel.vue'
import ProjectCreateModal from './ProjectCreateModal.vue'
import { defineAsyncComponent } from 'vue'
const NetworkGraph      = defineAsyncComponent(() => import('./NetworkGraph.vue'))
const NetworkNodeDetail = defineAsyncComponent(() => import('./NetworkNodeDetail.vue'))

const { papers, syntheses, comparisons, unscrapPaper, unscrapSynthesis, unscrapComparison, reorderPapers, assignToProject, releaseProjectPapers } = useScrap()
const { projects, activeProjectId, deleteProject } = useProjects()

const showCreateModal     = ref(false)
const networkPaper        = ref(null)   // 인라인 네트워크 뷰에 표시할 논문
const networkSelectedNode = ref(null)   // 그래프에서 클릭한 노드
const mobileTab           = ref('papers')  // 모바일 탭: 'papers' | 'analyses'

// 프로젝트 필터
const filteredPapers = computed(() => {
  if (!activeProjectId.value) return papers.value
  if (activeProjectId.value === 'unfiled') return papers.value.filter((p) => !p.projectId)
  return papers.value.filter((p) => p.projectId === activeProjectId.value)
})

function handleDeleteProject(id) {
  releaseProjectPapers(id)
  deleteProject(id)
}

// syntheses + comparisons를 scrapedAt 기준 최신순 정렬
const sortedAnalyses = computed(() => [
  ...syntheses.value.map(s  => ({ ...s, type: 'synthesis'  })),
  ...comparisons.value.map(c => ({ ...c, type: 'comparison' })),
].sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt)))

const leftPapers  = computed(() => filteredPapers.value.filter((_, i) => i % 2 === 0))
const rightPapers = computed(() => filteredPapers.value.filter((_, i) => i % 2 === 1))

// 선택 (종합분석 / 일괄 작업)
const MAX_SELECT         = 5
const selectedPapers     = ref([])
const showSynthesis      = ref(false)
const showComparison     = ref(false)
const showBulkFolder     = ref(false)
const viewingComparison  = ref(null)  // { papers, result }

function openSavedComparison(item) {
  viewingComparison.value = { papers: item.papers, result: item.result }
}

function deleteSelected() {
  selectedPapers.value.forEach((p) => unscrapPaper(p.pmid))
  selectedPapers.value = []
}
function bulkAssignFolder(folderId) {
  selectedPapers.value.forEach((p) => assignToProject(p.pmid, folderId))
  showBulkFolder.value = false
  selectedPapers.value = []
}

// 외부 클릭 시 폴더 드롭다운 닫기
function onDocClick() { showBulkFolder.value = false }
import { onMounted, onBeforeUnmount } from 'vue'
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function isSelected(paper) {
  return selectedPapers.value.some((p) => p.pmid === paper.pmid)
}
function toggleSelect(paper) {
  const idx = selectedPapers.value.findIndex((p) => p.pmid === paper.pmid)
  if (idx === -1) {
    if (selectedPapers.value.length >= MAX_SELECT) return
    selectedPapers.value.push(paper)
  } else {
    selectedPapers.value.splice(idx, 1)
  }
}

// 드래그 앤 드롭
const draggingIdx  = ref(null)
const draggingPmid = ref(null)

function onDragStart(e, idx) {
  draggingIdx.value  = idx
  draggingPmid.value = papers.value[idx]?.pmid
  e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() {
  draggingIdx.value  = null
  draggingPmid.value = null
}
function onDragOver(e, idx) {
  e.dataTransfer.dropEffect = 'move'
}
function onDrop(e, targetIdx) {
  if (draggingIdx.value === null || draggingIdx.value === targetIdx) return
  const arr = [...papers.value]
  const [moved] = arr.splice(draggingIdx.value, 1)
  arr.splice(targetIdx, 0, moved)
  reorderPapers(arr)
  draggingIdx.value  = null
  draggingPmid.value = null
}

// 논문 상세 팝업
const detailPaper       = ref(null)
const detailTranslation = ref(null)
const detailTranslating = ref(false)
const detailShowKorean  = ref(false)

function openPaperDetail(paper) {
  detailPaper.value       = paper
  detailTranslation.value = null
  detailShowKorean.value  = false
}
async function handleDetailTranslate() {
  if (detailTranslation.value) { detailShowKorean.value = !detailShowKorean.value; return }
  if (!detailPaper.value?.abstract) return
  detailTranslating.value = true
  try {
    detailTranslation.value = await translateAbstract(detailPaper.value.abstract)
    detailShowKorean.value  = true
  } catch { /* 조용히 실패 */ }
  finally { detailTranslating.value = false }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.fade-modal-enter-active { transition: opacity 0.2s ease; }
.fade-modal-leave-active { transition: opacity 0.15s ease; }
.fade-modal-enter-from, .fade-modal-leave-to { opacity: 0; }

.bulk-bar-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.bulk-bar-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.bulk-bar-enter-from, .bulk-bar-leave-to { opacity: 0; transform: translateY(-6px); }

.proj-drop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.proj-drop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.proj-drop-enter-from, .proj-drop-leave-to { opacity: 0; transform: translateY(4px); }

.net-slide-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.net-slide-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.net-slide-enter-from, .net-slide-leave-to { opacity: 0; transform: translateY(8px); }

.fade-label-enter-active { transition: opacity 0.15s ease; }
.fade-label-leave-active { transition: opacity 0.1s ease; }
.fade-label-enter-from, .fade-label-leave-to { opacity: 0; }

.proj-tab {
  @apply text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 bg-elevated text-slate-500
         hover:border-slate-700 hover:text-slate-300 transition-all duration-150 whitespace-nowrap;
}
.proj-tab-active {
  @apply border-primary/40 bg-primary/10 text-primary;
}
.proj-tab-count {
  @apply ml-0.5 opacity-60;
}
</style>
