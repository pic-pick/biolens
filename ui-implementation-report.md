# BioLens UI 구현 상세 보고서

> 작성일: 2026-03-21
> 기반: 전체 프론트엔드 코드 분석 (`App.vue`, `SynthesisPanel.vue`, `ScrapBoard.vue`, `PaperCard.vue`, `ScrapPaperCard.vue`, `Sidebar.vue`, `FilterBar.vue`, `style.css`, `tailwind.config.js`, `useScrap.js` 등)

---

## 디자인 시스템 기준 (현재 코드에서 추출)

신규 컴포넌트는 모두 아래 기준을 따른다.

### 색상 토큰

| 변수 | 값 | 용도 |
|---|---|---|
| `base` | `#060B18` | 페이지 배경 |
| `surface` | `#0F172A` | 카드, 패널 배경 |
| `elevated` | `#1E293B` | hover, 드롭다운 배경 |
| `primary` | `#3B82F6` | 강조 버튼, 링크 |
| `secondary` | `#06B6D4` | 결론, 보조 강조 |
| `accent` | `#8B5CF6` | 분석 관련 요소 |
| `warning` | `#F59E0B` | 충돌 결과, 경고 |
| `success` | `#10B981` | 성공, 저장 상태 |

### 공통 클래스 재사용

| 클래스 | 설명 |
|---|---|
| `.card-dark` | `bg-surface border border-slate-800 rounded-xl` + hover |
| `.btn-primary` | `bg-primary text-white rounded-lg` + active scale |
| `.btn-ghost` | `border border-slate-700` + hover |
| `.input-dark` | `bg-surface border border-slate-700` + focus ring |
| `.tab-btn` / `.tab-active` | 상단 탭 버튼 스타일 |
| `.shimmer` | 로딩 스켈레톤 gradient 애니메이션 |

### 애니메이션 (tailwind.config.js 기준)

| 이름 | 사용처 |
|---|---|
| `animate-fade-up` | 모달 등장, 카드 초기 렌더 |
| `animate-slide-in-right` | 우측 슬라이드 패널 (SynthesisPanel 패턴) |
| `animate-shimmer` | 스켈레톤 로딩 |
| `animate-float-up` | Floating Action Bar |

---

## 목차

1. [논문 비교표](#1-논문-비교표-ui)
2. [프로젝트·폴더 분류](#2-프로젝트폴더-분류-ui)
3. [논문 네트워크 그래프](#3-논문-네트워크-그래프-ui)
4. [저자 추적](#4-저자-추적-ui)
5. [변경 파일 전체 목록](#5-변경-파일-전체-목록)

---

## 1. 논문 비교표 UI

### 진입점: Floating Action Bar

현재 Floating Action Bar 구조:
```
[ 2 / 5 selected ]  [Analyze]  [Cancel]
```

변경 후:
```
[ 2 / 5 selected ]  [Compare]  [Analyze]  [Cancel]
```

**App.vue 수정 위치** — 기존 Floating Action Bar `div` 내부:
```html
<!-- 기존 -->
<button class="btn-primary text-xs px-4 py-2" @click="showSynthesis = true">
  Analyze
</button>

<!-- 추가 (Analyze 왼쪽) -->
<button
  class="btn-ghost text-xs px-4 py-2 disabled:opacity-40"
  :disabled="selectedPapers.length < 2"
  @click="showComparison = true"
>
  Compare
</button>
```

- `showComparison = ref(false)` 상태 추가
- `ComparisonPanel` import 및 마운트

---

### ComparisonPanel.vue 전체 구조

**SynthesisPanel.vue와 동일한 Teleport + slide-in-right 패턴** 재사용.
차이점: 너비 `w-[880px]` (표가 더 넓어야 함), 내부 레이아웃이 표 중심.

```
┌─ fixed inset-0 z-50 ──────────────────────────────────────────┐
│  backdrop (bg-black/60 backdrop-blur-sm)                       │
│                                                               │
│              ┌─ w-[880px] h-full 우측 고정 ──────────────────┐│
│              │ Header                                         ││
│              │   [≡] Paper Comparison    [×]                  ││
│              │   논문 2편                                      ││
│              ├────────────────────────────────────────────────┤│
│              │ Body (overflow-y-auto flex-1)                  ││
│              │                                                ││
│              │  [로딩 중] → 스켈레톤 테이블                   ││
│              │  [완료]   → 비교 테이블 + 요약 섹션            ││
│              │                                                ││
│              ├────────────────────────────────────────────────┤│
│              │ Footer                                         ││
│              │   [📋 Markdown 복사]  [닫기]                   ││
│              └────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

### 비교 테이블 레이아웃

```
overflow-x-auto 컨테이너
┌──────────────┬──────────────────┬──────────────────┬──────────────────┐
│              │ [1] 2023         │ [2] 2021         │ [3] 2019         │
│              │ BRCA1 mutations  │ Homologous       │ DNA repair       │
│              │ in breast cancer │ recombination... │ mechanisms...    │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Study Design │ RCT              │ 관찰연구          │ Meta-analysis    │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Population   │ 성인 n=342       │ 여성 n=1,200     │ 23개 연구 통합   │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Intervention │ PARP 억제제      │ BRCA1 스크리닝   │ 수술적 절제      │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Outcome      │ OS 향상 18%      │ 조기 발견율 ↑    │ 생존율 개선 확인 │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Limitations  │ 추적 기간 짧음   │ 단일 기관        │ 이질성 높음      │
├──────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Evidence     │ 1b               │ 2b               │ 1a               │
│   Level      │ ● (green)        │ ● (blue)         │ ● (green)        │
└──────────────┴──────────────────┴──────────────────┴──────────────────┘
```

**행 레이블 열**: `w-32 shrink-0 text-[11px] text-slate-500 uppercase tracking-widest`
**데이터 셀**: `min-w-[200px] text-xs text-slate-300 leading-relaxed p-3`
**헤더 셀**: 제목 truncate 2줄 + 연도 배지 (기존 `text-[11px] bg-blue-900/30`)
**행 구분**: `border-b border-slate-800`
**홀짝 행**: 짝수 행 `bg-white/[0.02]` 미세 배경

---

### Evidence Level 색상 코딩

| 등급 | 색상 | 예시 |
|---|---|---|
| 1a / 1b | `text-emerald-400 bg-emerald-900/20` | Meta-analysis, RCT |
| 2a / 2b | `text-blue-400 bg-blue-900/20` | Cohort, Case-control |
| 3 | `text-warning bg-amber-900/20` | Case series |
| 4 / 정보 없음 | `text-slate-500 bg-slate-800` | Expert opinion |

---

### 하단 요약 섹션

테이블 아래 구분선 후 3개 섹션 (SynthesisPanel 결과 섹션과 동일한 스타일):

```html
<!-- Consensus (emerald) -->
<div class="bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-4">
  <p class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">
    공통 결과
  </p>
  <p class="text-sm text-slate-300 leading-relaxed">{{ result.consensus }}</p>
</div>

<!-- Conflicts (warning) -->
<div class="bg-amber-900/10 border border-amber-800/30 rounded-xl p-4">
  <p class="text-[11px] font-semibold text-warning uppercase tracking-wide mb-1.5">
    상충 결과
  </p>
  <p class="text-sm text-slate-300 leading-relaxed">{{ result.conflicts }}</p>
</div>

<!-- Research Gap (slate) -->
<div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
  <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
    Research Gap
  </p>
  <p class="text-sm text-slate-400 leading-relaxed">{{ result.researchGap }}</p>
</div>
```

---

### 로딩 스켈레톤

테이블 구조를 유지하는 스켈레톤:
```html
<!-- 헤더 행 -->
<div class="flex gap-2 mb-2">
  <div class="w-32 shrink-0" />
  <div v-for="n in paperCount" class="min-w-[200px] h-12 rounded-lg shimmer" />
</div>
<!-- 데이터 행 6개 -->
<div v-for="row in 6" class="flex gap-2 py-2 border-b border-slate-800">
  <div class="w-32 h-3 rounded shimmer shrink-0" />
  <div v-for="n in paperCount" class="min-w-[200px] h-3 rounded shimmer" />
</div>
```

---

### Footer 액션

```html
<div class="shrink-0 border-t border-slate-800 px-6 py-4 flex items-center gap-3">
  <button class="btn-ghost text-xs px-4 py-2 flex items-center gap-2"
    @click="copyMarkdown">
    <svg ...clipboard icon... />
    Markdown 복사
  </button>
  <div class="flex-1" />
  <button class="btn-ghost text-xs px-4 py-2" @click="emit('close')">닫기</button>
</div>
```

**Markdown 복사 형식**: GitHub table syntax
```md
| | 논문1 | 논문2 |
|---|---|---|
| Study Design | RCT | 관찰연구 |
...
```

---

## 2. 프로젝트·폴더 분류 UI

### 전체 UI 변경 범위

```
변경 파일: Sidebar.vue, ScrapBoard.vue, ScrapPaperCard.vue
신규 파일: ProjectCreateModal.vue
```

---

### Sidebar.vue — Projects 섹션 추가

현재 Sidebar 구조 (아래서부터):
```
[토글 버튼]
[Filters]
[Recent]
[Related / Quick Search]
```

변경 후 — 하단에 Projects 섹션 추가:
```
[토글 버튼]
[Filters]
[Recent]
[Related / Quick Search]
─────────────────────────  ← divider
[Projects]                 ← 신규
```

**펼친 상태 (expanded: true)**:
```html
<div class="border-t border-slate-800 px-3 py-3">
  <div class="flex items-center justify-between mb-2">
    <p class="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
      Projects
    </p>
    <button class="text-slate-600 hover:text-slate-300 transition-colors"
      @click="showCreateModal = true" title="새 프로젝트">
      <svg ...plus icon... class="w-3.5 h-3.5" />
    </button>
  </div>

  <!-- 프로젝트 없을 때 -->
  <p v-if="!projects.length" class="text-[11px] text-slate-700 px-1">
    프로젝트가 없습니다
  </p>

  <!-- 프로젝트 목록 -->
  <div v-else class="flex flex-col gap-0.5">
    <button
      v-for="proj in projects"
      :key="proj.id"
      class="sidebar-item group w-full text-left"
      :class="activeProject === proj.id ? 'bg-elevated' : ''"
      @click="emit('project-select', proj.id)"
    >
      <span class="sidebar-accent" />
      <!-- 컬러 도트 -->
      <span class="w-2 h-2 rounded-full shrink-0"
        :style="{ background: proj.color }" />
      <span class="flex-1 text-xs text-slate-500 group-hover:text-slate-200 truncate">
        {{ proj.name }}
      </span>
      <!-- 논문 수 배지 -->
      <span class="text-[10px] bg-slate-800 text-slate-500 rounded px-1.5 tabular-nums">
        {{ proj.paperCount }}
      </span>
    </button>
  </div>
</div>
```

**접힌 상태 (expanded: false)**:
```html
<div class="py-3 flex flex-col items-center gap-1.5">
  <button @click="showCreateModal = true" title="새 프로젝트"
    class="text-slate-600 hover:text-slate-300 transition-colors">
    <svg ...plus icon... class="w-4 h-4" />
  </button>
  <!-- 컬러 도트만 표시 -->
  <div
    v-for="proj in projects.slice(0, 5)"
    :key="proj.id"
    class="w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform"
    :style="{ background: proj.color }"
    :title="proj.name"
    @click="emit('project-select', proj.id)"
  />
</div>
```

---

### ProjectCreateModal.vue

```
┌─ fixed inset-0 z-50 ──────────────────────┐
│  backdrop blur                             │
│                                           │
│  ┌─ bg-surface w-80 rounded-2xl ─────────┐│
│  │                                        ││
│  │  새 프로젝트                  [×]      ││
│  │  ────────────────────────────          ││
│  │  이름                                  ││
│  │  [________________________]            ││
│  │                                        ││
│  │  색상                                  ││
│  │  ● ● ● ● ● ●                          ││
│  │  (indigo cyan violet emerald rose amber)││
│  │                                        ││
│  │  아이콘                                ││
│  │  🧬  🫀  🧠  💊  🔬  📊             ││
│  │                                        ││
│  │  [취소]              [만들기]          ││
│  └────────────────────────────────────────┘│
└───────────────────────────────────────────┘
```

**컬러 팔레트 구현**:
```html
<div class="flex gap-2">
  <button
    v-for="color in PRESET_COLORS"
    :key="color"
    class="w-6 h-6 rounded-full transition-all duration-150"
    :style="{ background: color }"
    :class="selectedColor === color
      ? 'ring-2 ring-offset-2 ring-offset-surface scale-110'
      : 'opacity-70 hover:opacity-100'"
    @click="selectedColor = color"
  />
</div>
```

```js
const PRESET_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f43f5e', // rose
  '#f59e0b', // amber
]
```

---

### ScrapBoard.vue — 프로젝트 필터 탭 추가

현재 ScrapBoard 헤더:
```
Saved Papers (n)          논문을 2~5편 선택하면 종합분석 가능
```

변경 후:
```
Saved Papers (n)
─────────────────────────────────────────────────
[ All ] [ 미분류 ] [ BRCA1 연구 ] [ 알츠하이머 ] [ + ]
```

**구현**:
```html
<div class="flex items-center gap-1 mb-3 overflow-x-auto pb-1 shrink-0">
  <button
    v-for="tab in projectTabs"
    :key="tab.id"
    class="shrink-0 text-[11px] px-2.5 py-1 rounded-lg transition-all duration-150"
    :class="activeProjectTab === tab.id
      ? 'bg-primary/15 text-primary border border-primary/20'
      : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'"
    @click="activeProjectTab = tab.id"
  >
    <span v-if="tab.color"
      class="inline-block w-1.5 h-1.5 rounded-full mr-1"
      :style="{ background: tab.color }" />
    {{ tab.name }}
    <span class="ml-1 tabular-nums opacity-70">{{ tab.count }}</span>
  </button>
</div>
```

```js
const projectTabs = computed(() => [
  { id: null,        name: 'All',   count: papers.value.length, color: null },
  { id: 'unfiled',   name: '미분류', count: unfiledCount.value,  color: null },
  ...projects.value.map(p => ({
    id: p.id, name: p.name, count: papersByProject(p.id).length, color: p.color
  }))
])
```

---

### ScrapPaperCard.vue — 프로젝트 배지 추가

카드 우상단 (연도 배지 옆)에 프로젝트 컬러 도트 + 이름 추가:
```html
<div class="flex items-center gap-1.5 mb-2">
  <!-- 기존 연도 배지 -->
  <span class="year-badge">{{ paper.year }}</span>

  <!-- 프로젝트 배지 (신규) -->
  <button
    v-if="projectName"
    class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-slate-700
           text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
    @click.stop="showProjectMenu = !showProjectMenu"
  >
    <span class="w-1.5 h-1.5 rounded-full" :style="{ background: projectColor }" />
    {{ projectName }}
  </button>

  <!-- 프로젝트 재배정 드롭다운 -->
  <div v-if="showProjectMenu" class="absolute top-8 left-0 z-20 year-list w-40">
    <button
      v-for="proj in allProjects"
      :key="proj.id"
      class="year-option flex items-center gap-2"
      @click="assignToProject(paper.pmid, proj.id)"
    >
      <span class="w-2 h-2 rounded-full" :style="{ background: proj.color }" />
      {{ proj.name }}
    </button>
    <button class="year-option text-slate-600"
      @click="assignToProject(paper.pmid, null)">
      미분류로 이동
    </button>
  </div>
</div>
```

---

## 3. 논문 네트워크 그래프 UI

### 진입점: ScrapBoard 헤더

```html
<!-- ScrapBoard.vue 헤더 우측 -->
<div class="flex items-center justify-between mb-4 shrink-0">
  <h2 class="text-xs font-semibold ...">
    Saved Papers <span class="badge">{{ papers.length }}</span>
  </h2>

  <!-- 신규 버튼 -->
  <button
    class="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg
           border border-slate-700 text-slate-500 hover:text-slate-200
           hover:border-slate-600 transition-all duration-150"
    :disabled="papers.length === 0"
    @click="showNetwork = true"
  >
    <svg ...network icon... class="w-3.5 h-3.5" />
    Network View
  </button>
</div>
```

논문 0편이면 버튼 비활성화, tooltip: "논문을 스크랩하면 네트워크 그래프를 볼 수 있습니다".

---

### NetworkGraph.vue 전체 구조

```
┌─ fixed inset-0 z-50 bg-base ──────────────────────────────────┐
│                                                               │
│  ┌─ 상단 컨트롤 바 (h-12 border-b border-slate-800) ─────────┐│
│  │  [←닫기]  Network Graph  [●] 3/10 로딩 중     [?도움말]  ││
│  │                                                           ││
│  │  노드 범례:  ● 스크랩 논문  ● References  ● Citations    ││
│  │                                                           ││
│  │  [🔍+] [🔍-] [⟳Reset] | [ References ✓] [Citations ✓]  ││
│  └───────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ 캔버스 영역 (flex-1) ──────────────────┐ ┌─ 상세 패널 ──┐│
│  │                                         │ │ w-72 shrink-0││
│  │   vis-network 캔버스                    │ │              ││
│  │   (인터랙티브 그래프)                   │ │ [노드 미선택] ││
│  │                                         │ │  클릭하면    ││
│  │   노드: 원형, 크기=인용수              │ │  상세가 표시 ││
│  │   엣지: 화살표, 방향성                  │ │  됩니다      ││
│  │                                         │ │              ││
│  │   [하단] 로딩 프로그레스 바             │ │ [노드 선택시]││
│  │   "5/10 논문 처리 중..."               │ │  논문 상세   ││
│  └─────────────────────────────────────────┘ └──────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

### 상단 컨트롤 바 상세

```html
<div class="shrink-0 h-12 bg-surface border-b border-slate-800 px-4
            flex items-center gap-4 z-10">

  <!-- 닫기 -->
  <button class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200
                 transition-colors" @click="emit('close')">
    <svg ...arrow-left... class="w-4 h-4" />
    닫기
  </button>

  <div class="w-px h-5 bg-slate-800" />

  <!-- 타이틀 -->
  <span class="text-sm font-semibold text-slate-300">Network Graph</span>

  <!-- 로딩 상태 -->
  <div v-if="isLoading" class="flex items-center gap-2 text-[11px] text-primary">
    <svg class="w-3.5 h-3.5 animate-spin" ...spinner... />
    {{ loadedCount }}/{{ totalCount }} 논문 처리 중
  </div>
  <span v-else class="text-[11px] text-slate-600">
    노드 {{ nodes.length }}개 · 연결 {{ edges.length }}개
  </span>

  <div class="flex-1" />

  <!-- 범례 -->
  <div class="hidden lg:flex items-center gap-4 text-[11px] text-slate-500">
    <span class="flex items-center gap-1.5">
      <span class="w-2.5 h-2.5 rounded-full bg-primary" />스크랩 논문
    </span>
    <span class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-slate-600" />References
    </span>
    <span class="flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-secondary" />Citations
    </span>
  </div>

  <div class="w-px h-5 bg-slate-800" />

  <!-- 줌 컨트롤 -->
  <div class="flex items-center gap-1">
    <button class="btn-icon" @click="zoomIn">＋</button>
    <button class="btn-icon" @click="zoomOut">－</button>
    <button class="btn-icon" @click="resetView" title="전체 보기">⟳</button>
  </div>
</div>
```

---

### 노드 디자인 (vis-network options)

```js
const networkOptions = {
  nodes: {
    shape: 'dot',
    font: { color: '#94a3b8', size: 11, face: 'Inter' },
    borderWidth: 1.5,
    borderWidthSelected: 3,
  },
  groups: {
    scrapped: {
      color: { background: '#6366f1', border: '#818cf8' },
      size: 22,
      font: { color: '#e2e8f0', size: 12 },
    },
    reference: {
      color: { background: '#1e293b', border: '#334155' },
      size: 12,
    },
    citation: {
      color: { background: '#0e4f6b', border: '#0ea5e9' },
      size: 14,
    },
    // 스크랩+그래프 겹침
    both: {
      color: { background: '#5b21b6', border: '#8b5cf6' },
      size: 20,
    },
  },
  edges: {
    color: { color: '#334155', highlight: '#6366f1' },
    arrows: { to: { enabled: true, scaleFactor: 0.6 } },
    smooth: { type: 'dynamic' },
    width: 1,
  },
  physics: {
    stabilization: { iterations: 150 },
    barnesHut: { gravitationalConstant: -8000, damping: 0.09 },
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    hideEdgesOnDrag: true,
  },
}
```

---

### 우측 상세 패널 (노드 클릭 시)

```html
<div class="w-72 shrink-0 border-l border-slate-800 bg-surface flex flex-col overflow-hidden">

  <!-- 미선택 상태 -->
  <div v-if="!selectedNode" class="flex-1 flex flex-col items-center justify-center gap-3 p-6">
    <svg ...graph icon... class="w-10 h-10 text-slate-700" />
    <p class="text-sm text-slate-600 text-center">
      노드를 클릭하면<br/>논문 정보가 표시됩니다
    </p>
  </div>

  <!-- 선택된 노드 정보 -->
  <div v-else class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
    <!-- 그룹 배지 -->
    <span class="self-start text-[10px] px-2 py-0.5 rounded-md font-medium"
      :class="groupBadgeClass(selectedNode.group)">
      {{ groupLabel(selectedNode.group) }}
    </span>

    <!-- 제목 -->
    <h3 class="text-sm font-semibold text-slate-100 leading-snug">
      {{ selectedNode.data.title }}
    </h3>

    <!-- 메타 -->
    <p class="text-xs text-slate-500">
      {{ selectedNode.data.year }}
      <span v-if="selectedNode.data.citationCount">
        · {{ selectedNode.data.citationCount.toLocaleString() }} citations
      </span>
    </p>

    <!-- 연결 정보 -->
    <div class="bg-elevated rounded-lg p-3 text-[11px] text-slate-500 space-y-1">
      <p>References: {{ nodeEdgeCount(selectedNode.id, 'from') }}개</p>
      <p>Cited by: {{ nodeEdgeCount(selectedNode.id, 'to') }}개</p>
    </div>

    <!-- 액션 -->
    <div class="flex gap-2 mt-auto pt-3 border-t border-slate-800">
      <a v-if="selectedNode.data.doi"
        :href="`https://doi.org/${selectedNode.data.doi}`"
        target="_blank"
        class="text-xs text-slate-500 hover:text-slate-300 underline">
        DOI
      </a>
      <button
        v-if="selectedNode.group !== 'scrapped'"
        class="btn-ghost text-xs px-3 py-1.5 ml-auto"
        @click="searchFromNode(selectedNode)"
      >
        PubMed 검색 →
      </button>
    </div>
  </div>
</div>
```

---

### 하단 Progressive 로딩 바

캔버스 영역 하단 오버레이:
```html
<div v-if="isLoading"
  class="absolute bottom-0 left-0 right-0 px-4 py-2 bg-base/80 backdrop-blur-sm
         flex items-center gap-3 text-[11px] text-slate-500">
  <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
    <div
      class="h-full bg-primary transition-[width] duration-500"
      :style="{ width: `${(loadedCount / totalCount) * 100}%` }"
    />
  </div>
  <span class="shrink-0 tabular-nums">
    {{ loadedCount }}/{{ totalCount }}
  </span>
</div>
```

S2 키 없음 안내 배너 (그래프 위 상단):
```html
<div v-if="!hasS2Key"
  class="absolute top-2 left-1/2 -translate-x-1/2 z-10
         flex items-center gap-2 px-3 py-1.5 bg-amber-900/30
         border border-amber-800/40 rounded-lg text-[11px] text-warning">
  <svg ...info icon... class="w-3.5 h-3.5 shrink-0" />
  References 데이터 없음 —
  <a href="https://www.semanticscholar.org/product/api" target="_blank"
    class="underline hover:text-amber-300">
    S2 API 키 설정
  </a>
  하면 더 풍부한 그래프를 볼 수 있습니다
</div>
```

---

## 4. 저자 추적 UI

### 진입점 1: PaperCard.vue — Follow Author 버튼

저자 정보 행 (현재: `authors · journal`) 우측에 버튼 추가:
```html
<div class="flex items-center justify-between gap-2 mt-1">
  <p class="text-xs text-slate-600 truncate">
    {{ paper.authors }}<em class="text-slate-700"> · {{ paper.journal }}</em>
  </p>

  <!-- 신규: Follow 버튼 -->
  <div class="relative shrink-0">
    <button
      class="text-[10px] text-slate-600 hover:text-primary transition-colors
             flex items-center gap-1 opacity-0 group-hover:opacity-100"
      @click.stop="toggleAuthorSearch"
    >
      <svg ...user-plus icon... class="w-3 h-3" />
      Follow
    </button>

    <!-- 저자 검색 드롭다운 -->
    <div v-if="showAuthorSearch"
      class="absolute right-0 top-6 z-30 w-64 bg-surface border border-slate-700
             rounded-xl shadow-2xl overflow-hidden animate-fade-up">

      <!-- 검색 중 -->
      <div v-if="isSearchingAuthor"
        class="flex items-center gap-2 p-3 text-xs text-slate-500">
        <svg class="w-3.5 h-3.5 animate-spin" ...spinner... />
        저자 검색 중...
      </div>

      <!-- 결과 목록 -->
      <div v-else class="py-1">
        <div
          v-for="author in authorResults"
          :key="author.id"
          class="px-3 py-2 hover:bg-elevated cursor-pointer transition-colors"
          @click="followAuthor(author)"
        >
          <p class="text-xs font-medium text-slate-200">{{ author.name }}</p>
          <p class="text-[10px] text-slate-500 mt-0.5 truncate">
            {{ author.institution || '소속 미확인' }}
          </p>
          <p class="text-[10px] text-slate-600">
            h-index {{ author.hIndex }} · {{ author.worksCount }}편
          </p>
        </div>

        <!-- 결과 없음 -->
        <p v-if="!authorResults.length"
          class="px-3 py-3 text-xs text-slate-600 text-center">
          OpenAlex에서 저자를 찾을 수 없습니다
        </p>
      </div>
    </div>
  </div>
</div>
```

---

### 진입점 2: 새 탭 "Authors" 추가 (App.vue)

```js
// App.vue
const tabs = computed(() => [
  { id: 'explore', label: 'Explore',
    count: results.value.length > 0 ? totalCount.value : 0 },
  { id: 'scrap',   label: 'Saved',
    count: scrapPapers.value.length + syntheses.value.length },
  { id: 'authors', label: 'Authors',
    count: totalNewPapers.value },   // 신규 논문 수 합산
])
```

Authors 탭 활성화 시 사이드바 접힘 (기존 watch 패턴 확장):
```js
watch(activeTab, (tab) => {
  if (tab === 'scrap' || tab === 'authors') sidebar.value?.collapse()
  if (tab === 'explore') sidebar.value?.expand()
})
```

---

### Authors 탭 콘텐츠 레이아웃

```
┌─ 탭 콘텐츠 영역 (p-6 overflow-y-auto) ─────────────────────────┐
│                                                               │
│  팔로우한 저자가 없을 때:                                      │
│  ┌─ EmptyState 스타일 ────────────────────────────────────────┐│
│  │   👤 (아이콘)                                              ││
│  │   팔로우한 저자가 없습니다                                  ││
│  │   논문 카드의 Follow 버튼으로 저자를 추적하세요             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                               │
│  팔로우 저자가 있을 때:                                        │
│  헤더: "Following (n)"          [↻ Refresh]                   │
│                                                               │
│  ┌─ AuthorCard ───────────────────────────────────────────────┐│
│  │  ...                                                       ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌─ AuthorCard ───────────────────────────────────────────────┐│
│  │  ...                                                       ││
│  └────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

### AuthorCard.vue 레이아웃

```
┌─ card-dark p-4 ────────────────────────────────────────────────┐
│  상단 accent bar (프라이머리 그라디언트, 2px)                   │
│                                                               │
│  ┌─ 헤더 행 ────────────────────────────────────────────────┐ │
│  │  👤 Zhang, Lei                           [Unfollow]      │ │
│  │     Harvard Medical School, USA                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ 스탯 행 ────────────────────────────────────────────────┐ │
│  │  h-index: 42   |   187 papers   |   8.2k citations      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ 연구 분야 태그 ──────────────────────────────────────────┐ │
│  │  [Oncology] [BRCA1] [DNA repair]                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ─────────────────── (구분선)                                 │
│                                                               │
│  ┌─ 최신 논문 섹션 ──────────────────────────────────────────┐ │
│  │  🆕 3 new papers   "2026-03-15 기준"                     │ │
│  │                                                          │ │
│  │  · BRCA1 frameshift mutations in... (2026-03)  [→]      │ │
│  │  · Homologous recombination pathway (2026-01)  [→]      │ │
│  │  · PARP inhibitor resistance mechanisms (2025-11) [→]   │ │
│  │                                                          │ │
│  │  [더보기 / 접기]                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

```html
<div class="card-dark overflow-hidden">
  <!-- 상단 accent bar -->
  <div class="h-[2px] bg-gradient-to-r from-primary to-secondary" />

  <div class="p-4 flex flex-col gap-3">

    <!-- 헤더 -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center
                      text-slate-400 text-xs font-semibold shrink-0">
            {{ author.name.charAt(0) }}
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-100">{{ author.name }}</p>
            <p class="text-[11px] text-slate-500 mt-0.5">
              {{ author.institution || '소속 미확인' }}
            </p>
          </div>
        </div>
      </div>
      <button
        class="text-[11px] text-slate-600 hover:text-red-400 transition-colors shrink-0"
        @click="unfollow(author.id)"
      >
        Unfollow
      </button>
    </div>

    <!-- 스탯 -->
    <div class="flex items-center gap-3 text-[11px] text-slate-500">
      <span>h-index <span class="text-slate-300 font-medium">{{ author.hIndex }}</span></span>
      <span class="text-slate-700">|</span>
      <span><span class="text-slate-300 font-medium">{{ author.worksCount }}</span> papers</span>
      <span class="text-slate-700">|</span>
      <span><span class="text-slate-300 font-medium">{{ formatCount(author.citationCount) }}</span> citations</span>
    </div>

    <!-- 연구 분야 태그 -->
    <div v-if="author.concepts?.length" class="flex flex-wrap gap-1">
      <span
        v-for="concept in author.concepts"
        :key="concept"
        class="text-[10px] px-2 py-0.5 bg-primary/10 text-primary/80
               border border-primary/15 rounded-md"
      >{{ concept }}</span>
    </div>

    <!-- 신규 논문 섹션 -->
    <div v-if="author.newPapersCount > 0 || recentWorks.length"
      class="border-t border-slate-800 pt-3">

      <!-- 신규 배지 -->
      <div v-if="author.newPapersCount > 0"
        class="flex items-center gap-1.5 text-[11px] text-emerald-400 mb-2">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {{ author.newPapersCount }}편의 새 논문
        <span class="text-slate-600 ml-auto">
          {{ formatDate(author.lastChecked) }} 기준
        </span>
      </div>

      <!-- 논문 목록 -->
      <div class="flex flex-col gap-1.5">
        <div
          v-for="work in displayedWorks"
          :key="work.id"
          class="flex items-start gap-2 group cursor-pointer"
          @click="openWorkDetail(work)"
        >
          <span class="text-[10px] text-slate-600 mt-0.5 shrink-0 tabular-nums w-14">
            {{ work.year }}-{{ work.month?.toString().padStart(2,'0') || '??' }}
          </span>
          <p class="text-[11px] text-slate-500 group-hover:text-slate-200
                    transition-colors leading-tight line-clamp-2 flex-1">
            {{ work.title }}
          </p>
          <svg class="w-3 h-3 text-slate-700 group-hover:text-slate-400
                      shrink-0 mt-0.5 transition-colors" ...arrow-right... />
        </div>
      </div>

      <!-- 더보기 -->
      <button
        v-if="recentWorks.length > 3"
        class="text-[11px] text-slate-600 hover:text-slate-400 transition-colors mt-2"
        @click="showAllWorks = !showAllWorks"
      >
        {{ showAllWorks ? '접기' : `${recentWorks.length - 3}편 더 보기` }}
      </button>
    </div>

    <!-- 논문 없음 -->
    <p v-else class="text-[11px] text-slate-700 border-t border-slate-800 pt-3">
      최근 논문 없음
    </p>
  </div>
</div>
```

---

### Authors 탭 상단 컨트롤

```html
<div class="flex items-center justify-between mb-5 shrink-0">
  <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-widest
             flex items-center gap-2">
    Following
    <span class="badge">{{ followedAuthors.length }}</span>
  </h2>

  <button
    class="flex items-center gap-1.5 text-[11px] btn-ghost px-3 py-1.5"
    :disabled="isRefreshing"
    @click="refreshAll"
  >
    <svg class="w-3.5 h-3.5" :class="isRefreshing ? 'animate-spin' : ''"
      ...refresh icon... />
    {{ isRefreshing ? '확인 중...' : '새로고침' }}
  </button>
</div>
```

---

## 5. 변경 파일 전체 목록

### 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/App.vue` | `showComparison` ref, `ComparisonPanel` 마운트, Authors 탭 추가, tabs 배열 확장, activeTab watch 수정 |
| `src/components/Sidebar.vue` | Projects 섹션 추가, `showCreateModal` 상태, `project-select` emit |
| `src/components/ScrapBoard.vue` | 프로젝트 필터 탭 추가, Network View 버튼 추가, `showNetwork` 상태 |
| `src/components/ScrapPaperCard.vue` | 프로젝트 배지 + 재배정 드롭다운 추가 |
| `src/components/PaperCard.vue` | Follow Author 버튼 + 저자 검색 드롭다운 추가 |
| `src/composables/useScrap.js` | `projectId` 필드 추가, `assignToProject()` 함수 추가 |

### 신규 파일

| 파일 | 역할 |
|---|---|
| `src/components/ComparisonPanel.vue` | 논문 비교표 슬라이드 패널 |
| `src/components/NetworkGraph.vue` | vis-network 그래프 풀스크린 모달 |
| `src/components/AuthorCard.vue` | 개별 저자 카드 |
| `src/components/ProjectCreateModal.vue` | 프로젝트 생성 모달 |
| `src/composables/useComparison.js` | OpenAI 비교 분석 API 래퍼 |
| `src/composables/useNetwork.js` | 그래프 데이터 빌드 로직 |
| `src/composables/useSemanticScholar.js` | Semantic Scholar API 래퍼 |
| `src/composables/useAuthors.js` | 팔로우 저자 상태 관리 |
| `src/composables/useOpenAlex.js` | OpenAlex API 래퍼 |
| `src/composables/useProjects.js` | 프로젝트 상태 관리 |

### 환경변수 (`.env.example` 추가)

```env
VITE_SEMANTIC_SCHOLAR_KEY=   # semanticscholar.org/product/api 에서 무료 발급
VITE_OPENALEX_EMAIL=         # polite pool 식별용 (임의 이메일 가능)
```

---

*이 보고서는 전체 프론트엔드 코드 (`src/App.vue`, `src/components/*.vue`, `src/composables/*.js`, `src/style.css`, `tailwind.config.js`) 직접 분석을 기반으로 작성됨.*
