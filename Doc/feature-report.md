# BioLens 신규 기능 구현 상세 보고서

> 작성일: 2026-03-21
> 대상 기능: 논문 비교표 / 프로젝트·폴더 분류 / 논문 네트워크 그래프 / 저자 추적

---

## 목차

1. [논문 비교표 (Comparison Table)](#1-논문-비교표)
2. [프로젝트·폴더 분류 (Projects)](#2-프로젝트폴더-분류)
3. [논문 네트워크 그래프 (Citation Network)](#3-논문-네트워크-그래프)
4. [저자 추적 (Author Tracker)](#4-저자-추적)
5. [응답 시간 예상 & 타협점](#5-응답-시간-예상--타협점)
6. [구현 우선순위 & 로드맵](#6-구현-우선순위--로드맵)

---

## 1. 논문 비교표

### 1-1. 개요

선택된 2~5편의 논문을 OpenAI structured output으로 분석해
방법론 / 대상 / 결과 / 한계 / 근거 수준을 열 기반 표로 나란히 비교.
기존 SynthesisPanel과 버튼 하나 차이로 분기되는 구조.

---

### 1-2. 신뢰성 평가

**Abstract 기반의 구조적 한계가 명확히 존재한다.**

AI가 추출하는 내용은 abstract에 **명시된 문장만** 기반으로 하며, full text를 참조하지 않는다.

| 항목 | 신뢰도 | 이유 |
|---|---|---|
| Study design 분류 | 85~90% | `pubtype[]` 메타데이터를 프롬프트에 함께 주입해 보정 가능 |
| Sample size / p-value | abstract 기재 시 95%+ | 숫자는 hallucination 적음, 단 abstract에 없으면 추정 불가 |
| Primary outcome 요약 | 80~85% | 복잡한 복합 endpoint는 단순화될 수 있음 |
| Limitations 추출 | 60~70% | abstract에 limitations 섹션이 없는 논문이 많음 → 공란 처리 필요 |
| Evidence level 판단 | 75~80% | RCT vs 관찰연구는 잘 구분, 세부 등급(1a/1b)은 오류 가능 |

**종합 평가**: "AI가 정리한 참고용 요약표" 수준. 임상 의사결정 근거로 쓰기엔 부족하나, 리서치 흐름 파악 및 논문 간 빠른 비교 목적으로는 충분히 유효하다.

**신뢰성 향상 조치**:
- temperature 0.1로 낮춰 결정론적 응답 유도
- 불확실한 필드는 `"정보 없음"` 반환 강제 (프롬프트에 명시)
- abstract 없는 논문은 비교 대상에서 경고 표시 후 제외 유도

---

### 1-3. 기존 Synthesis와의 차별점

현재 Synthesis와 비교표는 **같은 재료로 다른 요리를 하는 것**이다.

**기존 Synthesis (현재 구현)**
```
여러 논문 abstract를 읽고 →
  "공통적으로 이런 결론이 나왔고,
   이런 부분에서 상충하며,
   이런 연구가 더 필요하다"
  → 문단(paragraph) 형태 텍스트로 출력
```
→ **"숲"을 보는 도구.** 전체 흐름과 종합 결론 도출.

**비교표 (신규)**
```
           논문 A        논문 B        논문 C
─────────────────────────────────────────────
Design     RCT           관찰연구      Meta-analysis
n          342명         1,200명       23개 연구 통합
Treatment  SGLT-2        GLP-1         둘 다
Outcome    HbA1c↓ 0.8%  체중↓ 4.2kg  심혈관 보호
Limit      단일 인종     추적 짧음     이질성 높음
```
→ **"나무"를 보는 도구.** 논문별 속성을 나란히 놓고 직접 대조.

**실사용 시나리오 차이**:
- Synthesis: "이 5편 논문이 전반적으로 뭘 말하는가?" → 결론 도출용
- 비교표: "이 5편에서 각각 sample size가 얼마였나?" → 데이터 추출용 (systematic review 작성 시 실제로 필요한 단계)

두 기능은 대체 관계가 아니라 **상호 보완 관계**이며, 비교표 하단에 Synthesis 버튼을 배치해 자연스럽게 연계할 수 있다.

---

### 1-4. API 상세 & 제약

#### OpenAI gpt-4o-mini (기존 사용 중)

| 항목 | 내용 |
|---|---|
| 엔드포인트 | `POST /v1/chat/completions` |
| 모델 | `gpt-4o-mini` (현재 사용), `gpt-4o`로 품질 향상 가능 |
| JSON 강제 | `response_format: { type: "json_object" }` |
| 컨텍스트 | gpt-4o-mini 128k tokens → 논문 5편 abstract 합산 ~3,000 tokens 소비 |
| 비용 | gpt-4o-mini: $0.15/1M input, $0.60/1M output → 비교 1회 약 $0.001 미만 |

#### 핵심 제약사항

1. **Abstract 없는 논문** — `hasAbstract: false` 또는 `abstractFailed: true` 논문은 제외하거나 메타데이터만으로 제한된 비교 제공. 버튼 UI 단에서 abstract 없는 논문이 선택됐을 때 경고 표시 필요.

2. **긴 Abstract** — 일부 Review 논문 abstract가 800+ 단어. 5편 합산 시 4,000+ tokens 가능. `max_tokens: 1200`으로 응답 제한, 프롬프트 내 abstract를 300 단어 이내로 trim 처리.

3. **JSON 파싱 실패** — 모델이 간혹 JSON 외 텍스트를 앞뒤에 붙임. `JSON.parse`는 try-catch + 정규식 추출(`/{[\s\S]*}/`) 이중 방어.

4. **언어 혼용** — abstract는 영어, 결과는 한국어로 출력 지시해야 함. 프롬프트에 `"모든 응답은 한국어로"` 명시.

5. **근거 수준 판단 오류** — AI가 study design을 잘못 분류할 수 있음. `pubtype[]` 메타데이터를 프롬프트에 함께 주입해 보정.

---

### 1-3. 구현 설계

#### 데이터 스키마 (OpenAI 응답)

```json
{
  "papers": [
    {
      "pmid": "12345678",
      "studyDesign": "Randomized Controlled Trial",
      "population": "성인 당뇨병 환자 n=342",
      "intervention": "SGLT-2 억제제 10mg/일",
      "methodology": "이중맹검, 위약 대조, 52주 추적",
      "primaryOutcome": "HbA1c 0.8% 감소 (p<0.001)",
      "limitations": "단일 인종 코호트, 추적 기간 짧음",
      "evidenceLevel": "1b"
    }
  ],
  "consensus": "전반적으로 SGLT-2 억제제의 혈당 강하 효과 일치",
  "conflicts": "심혈관 보호 효과에서 연구 간 이질성 존재",
  "researchGap": "소아·청소년 대상 장기 연구 부재"
}
```

#### 신규 파일

**`src/composables/useComparison.js`**
```js
// useOpenAI.js의 패턴을 그대로 따름
export async function comparePapers(papers) {
  const abstracts = papers.map((p, i) =>
    `[${i+1}] PMID:${p.pmid} | ${p.pubtype?.join(', ') || ''}\n${p.abstract?.slice(0, 1500) || '초록 없음'}`
  ).join('\n\n')

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
      { role: 'user', content: abstracts }
    ]
  })
  return JSON.parse(res.choices[0].message.content)
}
```

**`src/components/ComparisonPanel.vue`**
- SynthesisPanel과 동일한 slide-in 패널 구조 재사용
- 패널 내부: 수평 스크롤 테이블 (`overflow-x-auto`)
- 열: 각 논문 1열 (max 5열)
- 행: Study Design / Population / Methodology / Primary Outcome / Limitations / Evidence Level
- 하단: consensus / conflicts / researchGap 섹션
- 우측 상단: Markdown 복사 버튼, CSV 다운로드 버튼

#### UI 진입점

기존 Floating Action Bar ("Analyze" 버튼 옆):
```
[ 2 / 5 selected ]  [Compare]  [Analyze]  [Cancel]
```

#### 테이블 디자인 원칙

- 헤더 행: 논문 번호 + 제목 (truncate) + 연도 배지
- 셀 색상: 근거 수준별 (1a/1b → green, 2a/2b → blue, 3 → yellow, 4 → slate)
- consensus 행: 초록 하이라이트
- conflicts 행: 노란 하이라이트
- 모바일: 세로 스택 레이아웃 전환

---

### 1-4. 추가 엣지케이스

- **1편만 선택**: 비교 불가 → 버튼 비활성화 (최소 2편)
- **동일 논문 중복**: pmid 중복 체크
- **재분석**: 결과 캐싱 — `Map<pmidComboKey, result>` 로 같은 조합 재요청 방지
- **Export**: Markdown 형태로 복사 시 GitHub table syntax 사용

---

## 2. 프로젝트·폴더 분류

### 2-1. 개요

스크랩 보드를 주제별 프로젝트로 분류 관리.
외부 API 불필요, localStorage 확장으로만 구현.
현재 `biolens_scraps` 구조에 `projectId` 필드 추가.

---

### 2-2. localStorage 제약

| 제약 | 내용 | 대응 |
|---|---|---|
| 용량 | 브라우저별 5~10MB (Chrome: 5MB) | 논문 1편 ~3KB, 1,000편도 3MB → 여유로움 |
| 동기 I/O | `setItem`은 블로킹 | 빈번한 쓰기는 debounce 300ms |
| 기기 미동기 | 다른 기기에서 접근 불가 | 향후 Supabase 마이그레이션 경로 설계 |
| 탭 충돌 | 멀티탭 동시 수정 시 덮어씀 | `storage` 이벤트 리스너로 타 탭 변경 감지 |
| 직렬화 | 함수·Date 객체 손실 | `createdAt`은 ISO string으로 저장 |

---

### 2-3. 데이터 구조 설계

#### `biolens_projects` (신규 key)

```json
[
  {
    "id": "proj_1710000000000",
    "name": "BRCA1 연구",
    "color": "#6366f1",
    "icon": "dna",
    "createdAt": "2026-03-21T00:00:00.000Z",
    "paperCount": 0
  }
]
```

#### `biolens_scraps` (기존 구조 확장)

```json
[
  {
    "pmid": "...",
    "projectId": "proj_1710000000000",  // null이면 미분류
    "...": "기존 필드 유지"
  }
]
```

#### `biolens_syntheses` (기존 구조 확장)

```json
[
  {
    "id": "...",
    "projectId": "proj_1710000000000",
    "...": "기존 필드 유지"
  }
]
```

---

### 2-4. 구현 설계

#### 신규 파일

**`src/composables/useProjects.js`**
```js
// useScrap.js 패턴 동일하게 module-level singleton
const projects = ref(JSON.parse(localStorage.getItem('biolens_projects') || '[]'))

export function useProjects() {
  function createProject(name, color, icon) { ... }
  function deleteProject(id) {
    // 해당 프로젝트 논문들 → projectId: null로 변경 (고아 방지)
  }
  function renameProject(id, name) { ... }
  function assignPaper(pmid, projectId) { ... }  // useScrap과 교차 참조
  return { projects, createProject, deleteProject, renameProject, assignPaper }
}
```

#### useScrap.js 수정 사항

- `scrapPaper()`: `projectId: null` 기본값 추가
- `assignToProject(pmid, projectId)` 함수 추가
- computed `papersByProject(projectId)` 추가

#### UI 구성

**사이드바 (Sidebar.vue 확장)**
- 사이드바 하단에 Projects 섹션 추가
- 각 프로젝트: 컬러 도트 + 이름 + 논문 수 배지
- `+` 버튼 → 프로젝트 생성 인라인 인풋
- 프로젝트 클릭 → ScrapBoard 필터링
- 우클릭 or `...` → 이름 변경 / 삭제 컨텍스트 메뉴
- 접힌 상태: 컬러 도트만 표시

**ScrapBoard.vue 수정**
- 상단 필터 탭: `All` / `미분류` / 각 프로젝트명
- 논문 카드 우상단: 프로젝트 색 배지 (클릭 시 재배정 드롭다운)
- 드래그 앤 드롭: 논문을 사이드바 프로젝트로 드래그해서 배정

**ProjectCreateModal.vue (신규)**
- 이름 입력
- 컬러 팔레트 (6가지 프리셋: indigo, cyan, violet, emerald, rose, amber)
- 아이콘 선택 (6가지: 🧬 🫀 🧠 💊 🔬 📊 → SVG 처리)
- 확인 시 `createProject()` 호출

#### 엣지케이스

- **프로젝트 삭제**: 소속 논문 → 자동으로 "미분류"로 이동 (삭제 불가 옵션은 UX 복잡도 증가로 제외)
- **논문 중복 배정 방지**: 동일 pmid는 하나의 프로젝트에만 소속
- **프로젝트 0개**: "미분류" 탭만 표시, Projects 섹션 숨김
- **이름 중복**: 허용 (색으로 구분 가능)
- **50개 이상 프로젝트**: 사이드바 스크롤 처리

---

## 3. 논문 네트워크 그래프

### 3-1. 개요

스크랩된 논문들 간의 인용 관계를 인터랙티브 노드 그래프로 시각화.
iCite(기존) + Semantic Scholar API(신규) 이중 소스로 데이터 풍부화.

---

### 3-2. API 상세 & 제약

#### iCite API (기존 사용 중)

| 항목 | 내용 |
|---|---|
| 엔드포인트 | `https://icite.od.nih.gov/api/pubs?pmids={...}` |
| 반환 | `cited_by_clin[]`, `cited_by[]` (이 논문을 인용한 PMIDs) |
| 반환 없음 | **references** (이 논문이 인용한 논문) — iCite는 cited_by만 제공 |
| 한계 | PubMed 인덱스 논문만 커버, 최신 논문(6~12개월 내) 누락 가능 |
| Rate limit | 공식 제한 없음, 실사용 30 req/min 이내 권장 |

#### Semantic Scholar API (신규)

| 항목 | 내용 |
|---|---|
| 베이스 URL | `https://api.semanticscholar.org/graph/v1` |
| 인증 | 없이도 사용 가능, API Key로 rate limit 완화 |
| 키 발급 | [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api) — 무료 학술용 |
| PMID 조회 | `/paper/PMID:{pmid}?fields=references,citations,title,year` |
| Rate limit (키 없음) | **100 req / 5분** (12초에 1건) |
| Rate limit (키 있음) | **1 req / sec** (더 안정적) |
| 응답 크기 | citation이 많은 논문은 references 수백 개 → `limit=50` 파라미터 필요 |
| 커버리지 | 2억+ 논문, PubMed보다 광범위 (preprint 포함) |
| PMID 미보유 논문 | DOI로 대체 조회: `/paper/DOI:{doi}` |

#### 핵심 제약사항

1. **Rate limit 병목** (Semantic Scholar 키 없음 기준)
   스크랩 논문 10편 기준 10 req → 120초 소요 불가.
   → **키 발급 필수** + rateLimiter에 1초 간격 설정.
   → `VITE_SEMANTIC_SCHOLAR_KEY` 환경변수 추가.

2. **그래프 폭발 문제**
   논문 A가 200개 논문을 인용 → 노드 200개 생성 → 렌더링 불가.
   → 1-hop만 표시 (스크랩 논문 ↔ 직접 연결된 논문).
   → `limit=20` (인용/피인용 각 상위 20개).

3. **PMID ↔ Semantic Scholar ID 불일치**
   일부 논문은 S2 내부 ID만 있고 PMID 없음.
   → PMID 조회 실패 시 DOI로 재시도, 그래도 없으면 노드에서 제외.

4. **데이터 신선도**
   S2 인덱싱 지연 1~4주. 최신 논문은 references 불완전.
   → 노드에 "데이터 불완전" 점선 테두리 표시.

5. **논문 중복**
   iCite와 S2에서 동일 논문이 다른 ID로 올 수 있음.
   → PMID를 primary key로 dedup.

---

### 3-3. 구현 설계

#### 그래프 라이브러리: `vis-network`

선택 이유:
- npm 패키지 간단: `npm install vis-network`
- Canvas 기반 → 50~100 노드 성능 양호
- 인터랙션(hover, drag, zoom) 기본 내장
- Vue wrapper 없이도 `ref` + `onMounted`로 연동 용이

#### 신규 파일

**`src/composables/useSemanticScholar.js`**
```js
const BASE = 'https://api.semanticscholar.org/graph/v1'
const KEY  = import.meta.env.VITE_SEMANTIC_SCHOLAR_KEY

// 1초 간격 rate limiter (기존 rateLimiter.js 패턴 재사용)
const s2Limiter = createRateLimiter(1)

export async function fetchPaperGraph(pmid) {
  return s2Limiter.enqueue(async () => {
    const fields = 'paperId,title,year,citationCount,references,citations'
    const params = new URLSearchParams({ fields, limit: 20 })
    if (KEY) params.set('x-api-key', KEY)  // 헤더 방식과 파라미터 방식 혼용 주의
    const res = await axios.get(
      `${BASE}/paper/PMID:${pmid}`,
      { params, headers: KEY ? { 'x-api-key': KEY } : {} }
    )
    return res.data
  })
}
```

**`src/composables/useNetwork.js`**
```js
// 스크랩 논문 → S2 그래프 데이터 조합
export function useNetwork() {
  const nodes     = ref([])
  const edges     = ref([])
  const isLoading = ref(false)
  const error     = ref(null)

  async function buildGraph(scrapPapers) {
    isLoading.value = true
    const nodeMap = new Map()
    const edgeSet = new Set()

    for (const paper of scrapPapers) {
      // 스크랩 논문 노드 (primary)
      nodeMap.set(paper.pmid, {
        id: paper.pmid, label: paper.title.slice(0, 30) + '…',
        group: 'scrapped', value: paper.citationCount || 1,
        data: paper
      })

      try {
        const graph = await fetchPaperGraph(paper.pmid)

        // references (이 논문이 인용한 논문)
        for (const ref of graph.references?.slice(0, 20) || []) {
          if (!nodeMap.has(ref.paperId)) {
            nodeMap.set(ref.paperId, {
              id: ref.paperId, label: ref.title?.slice(0, 30) + '…' || ref.paperId,
              group: 'reference', value: 1, data: ref
            })
          }
          const edgeKey = `${paper.pmid}->${ref.paperId}`
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey)
            edges.value.push({ from: paper.pmid, to: ref.paperId, arrows: 'to' })
          }
        }

        // citations (이 논문을 인용한 논문) - iCite cited_by와 교차 검증
        for (const cit of graph.citations?.slice(0, 20) || []) {
          // ... 동일 패턴
        }
      } catch { /* 개별 논문 실패는 조용히 스킵 */ }
    }

    nodes.value = [...nodeMap.values()]
    isLoading.value = false
  }

  return { nodes, edges, isLoading, error, buildGraph }
}
```

**`src/components/NetworkGraph.vue`**
- ScrapBoard 탭 영역 위 "Network" 버튼 클릭 시 풀스크린 모달로 표시
- `onMounted`: vis-network 인스턴스 생성
- 노드 색상:
  - 스크랩 논문: `#6366f1` (indigo, 크기 대)
  - reference 논문: `#334155` (slate, 크기 소)
  - citation 논문: `#0ea5e9` (sky, 크기 소)
  - 스크랩+그래프 겹침: `#8b5cf6` (violet)
- 노드 크기: `citationCount`에 비례 (log scale)
- 호버: 제목, 저자, 연도 툴팁
- 클릭: 우측 패널에 논문 상세 표시
- 컨트롤: Zoom +/- 버튼, "Reset view", 그룹 필터 토글

#### 탭 진입점

```
ScrapBoard 상단 헤더 우측:
[ Saved Papers (n) ]                    [ 📊 Network View ]
```

---

### 3-4. 제약 극복 전략

rate limit이 가장 큰 현실적 병목이다. API 키 유무에 따른 영향이 결정적이다.

| 상황 | 스크랩 10편 기준 소요 시간 | 판단 |
|---|---|---|
| S2 키 없음 | ~120초 (12초 간격) | 사실상 사용 불가 |
| S2 키 있음 | ~12초 (1초 간격) | 허용 가능 |
| iCite만 사용 | ~1초 | 빠르지만 references 방향 데이터 없음 |

**① 2-tier Progressive 렌더링 (핵심 전략)**

사용자가 "기다리는" 것이 아니라 그래프가 "채워지는" 것을 보게 한다.

```
즉시 (0초)   : iCite cited_by 데이터로 스크랩 논문 노드 + cited_by 엣지 렌더
+1~2초       : S2 논문1 references 도착 → 새 엣지 애니메이션으로 추가
+2~3초       : S2 논문2 references 도착 → 추가
...
완성 표시    : "모든 데이터 로드 완료" 상태 표시
```

**② 24시간 캐싱으로 재요청 최소화**

`biolens_network_cache` localStorage key에 `{ pmid: graphData, fetchedAt }` 저장.
동일 논문 다음에 열면 API 호출 없이 즉시 복원.
스크랩 논문이 자주 변경되지 않는 실사용 패턴에서 캐시 히트율 높음.

**③ 노드 스마트 선별 (그래프 폭발 방지)**

전체 references/citations 중 `citationCount` 내림차순 상위 20개만 표시.
나머지는 "숨겨진 노드 N개 더 보기" 버튼으로 on-demand 확장.
노드 총 50개 초과 시 자동 클러스터링 적용.

**④ S2 API 키 없을 때 제한 모드 (Graceful Degradation)**

키 미설정 시 S2 요청 생략, iCite cited_by 데이터만으로 그래프 구성.
UI에 "references 방향 데이터 없음 — Semantic Scholar API 키를 설정하면 더 풍부한 그래프를 볼 수 있습니다" 안내 배너 표시.

**⑤ 데이터 불완전 시각화**

S2 인덱싱 미완료 논문은 노드 테두리를 점선으로 표시.
hover 시 "인덱싱 지연으로 인해 데이터가 불완전할 수 있습니다" 툴팁.

---

### 3-5. 성능 최적화

- 스크랩 논문 10편 이상: 경고 ("그래프가 복잡해질 수 있습니다")
- 노드 50개 초과 시 겹치는 reference 자동 클러스터링
- 초기 로딩: 스크랩 논문 노드 먼저 렌더 → S2 데이터 비동기로 엣지 추가
- 그래프 데이터 24시간 캐싱: `biolens_network_cache` localStorage key

---

## 4. 저자 추적

### 4-1. 개요

관심 저자를 등록하고, 최신 논문 활동을 트래킹.
NCBI eUtils(기존)로 PubMed 논문 검색, OpenAlex API(신규)로 저자 프로필 상세 조회.

---

### 4-2. API 상세 & 제약

#### NCBI eUtils (기존)

| 항목 | 내용 |
|---|---|
| 저자 검색 | `{name}[au]` 또는 `{name}[1au]` (제1저자) |
| 정확도 이슈 | "Kim J" 검색 시 수천 건 오탐 — 이름 모호성 심각 |
| 해결책 | OpenAlex의 고유 저자 ID와 연계 |

#### OpenAlex API (신규)

| 항목 | 내용 |
|---|---|
| 베이스 URL | `https://api.openalex.org` |
| 인증 | 불필요 (Polite Pool: 이메일 파라미터만 권장) |
| 저자 검색 | `/authors?search={name}&per_page=5` |
| 저자 상세 | `/authors/{id}` → h-index, works_count, citation_count, institution, concepts |
| 저자 논문 | `/works?filter=author.id:{id}&sort=publication_date:desc&per_page=20` |
| ORCID 연동 | `/authors/orcid:{orcid}` 로 정확한 조회 가능 |
| Rate limit | **10 req/sec** (Polite Pool, 이메일 제공 시) |
| Rate limit | **100k req/day** (무료 API key 발급 시) |
| 환경변수 | `VITE_OPENALEX_EMAIL` (polite pool용) |

| 핵심 제약 | 내용 | 대응 |
|---|---|---|
| 저자 동명이인 | 흔한 이름은 여러 OpenAlex Author로 분리됨 | 검색 결과 목록에서 소속기관 확인 후 사용자 선택 |
| 데이터 지연 | 최신 논문 인덱싱 1~8주 지연 | "Last updated" 표시, PubMed 검색으로 보완 |
| ORCID 미보유 | 일부 저자는 ORCID 없음 | OpenAlex 자체 ID 사용 |
| 소속기관 정보 | 저자가 이직하면 과거 기관으로 나올 수 있음 | `last_known_institution` 필드 사용 |
| 폐쇄 프로필 | 일부 저자 OpenAlex 미등재 | NCBI fallback: `{name}[au]` 검색으로 대체 |

#### ORCID Public API (선택적 보강)

| 항목 | 내용 |
|---|---|
| 엔드포인트 | `https://pub.orcid.org/v3.0/{orcid}/works` |
| 인증 | 불필요 (Public API) |
| 장점 | 저자가 직접 등록한 verified 논문 목록 |
| 한계 | 저자가 업데이트하지 않으면 누락, 한국 연구자 등록률 낮음 |

---

### 4-3. 구현 설계

#### 데이터 구조

**`biolens_followed_authors` (신규 localStorage key)**
```json
[
  {
    "id": "A5023888391",
    "openAlexId": "A5023888391",
    "orcid": "0000-0002-1234-5678",
    "name": "Zhang, Lei",
    "institution": "Harvard Medical School",
    "hIndex": 42,
    "worksCount": 187,
    "concepts": ["Oncology", "BRCA1", "DNA repair"],
    "followedAt": "2026-03-21T00:00:00.000Z",
    "lastChecked": "2026-03-21T00:00:00.000Z",
    "lastKnownPmid": "39123456",
    "newPapersCount": 0
  }
]
```

#### 신규 파일

**`src/composables/useOpenAlex.js`**
```js
const BASE  = 'https://api.openalex.org'
const EMAIL = import.meta.env.VITE_OPENALEX_EMAIL || 'biolens@example.com'

export async function searchAuthors(name) {
  const res = await axios.get(`${BASE}/authors`, {
    params: { search: name, per_page: 5, mailto: EMAIL }
  })
  return res.data.results.map(a => ({
    id: a.id.split('/').pop(),
    name: a.display_name,
    institution: a.last_known_institution?.display_name,
    hIndex: a.summary_stats?.h_index,
    worksCount: a.works_count,
    citationCount: a.cited_by_count,
    concepts: a.x_concepts?.slice(0, 3).map(c => c.display_name),
    orcid: a.orcid
  }))
}

export async function fetchAuthorRecentWorks(openAlexId, since) {
  const filter = `author.id:${openAlexId},from_publication_date:${since}`
  const res = await axios.get(`${BASE}/works`, {
    params: { filter, sort: 'publication_date:desc', per_page: 10, mailto: EMAIL }
  })
  return res.data.results
}
```

**`src/composables/useAuthors.js`**
```js
const followedAuthors = ref(
  JSON.parse(localStorage.getItem('biolens_followed_authors') || '[]')
)

export function useAuthors() {
  async function followAuthor(authorData) { ... }
  async function unfollowAuthor(id) { ... }
  async function checkNewPapers(author) {
    const works = await fetchAuthorRecentWorks(author.openAlexId, author.lastChecked)
    const newCount = works.length
    // localStorage 업데이트
    return newCount
  }
  async function refreshAll() {
    // 모든 팔로우 저자 순차 체크 (rate limit 고려 500ms 간격)
    for (const author of followedAuthors.value) {
      await checkNewPapers(author)
      await sleep(500)
    }
  }
  return { followedAuthors, followAuthor, unfollowAuthor, refreshAll }
}
```

#### UI 구성

**논문 카드에 "Follow Author" 버튼 추가 (PaperCard.vue)**
- 저자명 옆 `+Follow` 버튼 (제1저자 또는 교신저자)
- 클릭 → 저자 검색 드롭다운 (OpenAlex 결과 최대 5건)
- 동명이인 시 소속기관 표시로 구분

**새 탭: "Authors" (App.vue tabs 배열에 추가)**
```
[ Explore (n) ] [ Saved (n) ] [ Authors (n) ]
```

**AuthorCard.vue**
```
┌──────────────────────────────────────────┐
│ 👤 Zhang, Lei                      [Unfollow] │
│    Harvard Medical School                │
│    h-index: 42  |  187 papers  |  8.2k citations │
│    🏷 Oncology · BRCA1 · DNA repair       │
│    ─────────────────────────────         │
│    🆕 3 new papers since last visit       │
│    · BRCA1 mutations in... (2026-03)     │
│    · Homologous recombination... (2026-01)│
└──────────────────────────────────────────┘
```

**새 논문 알림 배지**
- Authors 탭 레이블: `Authors (3)` — 신규 논문 수 합산 표시
- App 초기 로딩 시 `refreshAll()` 백그라운드 실행 (silent)
- 논문 클릭 → PubMed 검색 or 상세 팝업

---

### 4-4. 엣지케이스

- **저자 팔로우 한도**: 20명 제한 권장 (API 부하 관리)
- **refresh 실패**: 네트워크 오류 시 `lastChecked` 갱신 안 함 → 다음 기회에 재시도
- **동일 저자 중복 팔로우**: openAlexId 기준 중복 체크
- **개인정보**: 저자 이름·소속은 공개 학술 데이터, 로컬 저장 이슈 없음
- **팔로우 저자의 논문이 스크랩과 겹칠 때**: 논문 카드에 "팔로우 저자 논문" 배지 표시

---

## 5. 응답 시간 예상 & 타협점

각 기능별 사용자가 체감하는 대기 시간과 허용 가능한 최대치를 정리한다.

### 5-1. 기능별 응답 시간 예상

| 기능 | 예상 응답 시간 | 최대 타협선 | UX 전략 |
|---|---|---|---|
| **논문 비교표** | 3~5초 | **5초** | 스켈레톤 테이블 즉시 표시 (행 레이블은 즉시, 셀 내용은 로딩 애니메이션) |
| **프로젝트/폴더** | <100ms | 타협 불필요 | 사실상 즉시, localStorage 동기 처리 |
| **저자 검색 (팔로우 시)** | 0.5~1.5초 | 2초 | 드롭다운 내 인라인 스피너 |
| **저자 refresh (앱 로드 시)** | 5~15초 | 무제한 | 백그라운드 실행 — 완료 후 배지만 업데이트 |
| **네트워크 그래프 초기 렌더** | <1초 | 1초 | iCite 데이터로 즉시 첫 그래프 |
| **네트워크 그래프 S2 보강 (키 있음)** | +12~20초 | 20초 | Progressive 렌더링으로 체감 대기 없음 |
| **네트워크 그래프 S2 보강 (키 없음)** | 불가 | — | iCite 단독 제한 모드 제공 |

### 5-2. 기능별 상세 분석

**논문 비교표 (5초 타협)**

사용자가 직접 기다리는 유일한 긴 구간.
gpt-4o-mini 실측 기준 논문 5편 / 1,200 tokens 응답 시 평균 3~4초.
5초를 초과하는 경우는 OpenAI 서버 부하 시 간헐적으로 발생.
→ 5초 타임아웃 설정, 초과 시 "응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요" 표시.
→ 스켈레톤 테이블을 즉시 렌더해 체감 대기 시간을 줄임.

**네트워크 그래프 (Progressive 렌더링이 핵심)**

전체 로딩 완료를 기다리게 하면 안 된다.
iCite 기반 초기 그래프를 1초 내 렌더한 뒤, S2 데이터가 오는 만큼 점진적으로 엣지를 추가.
사용자는 "그래프가 로드되길 기다리는" 것이 아니라 "그래프가 점점 풍부해지는" 것을 경험.
S2 API 키 없으면 그래프 기능 자체가 반쪽짜리가 되므로 **키 발급은 사실상 필수**.

**저자 refresh (백그라운드 원칙)**

앱 초기 로딩 시 silent하게 실행, 사용자 인터랙션을 막지 않음.
완료 후 Authors 탭 배지만 업데이트.
팔로우 저자 20명 기준 최대 20초 소요 — 전혀 문제없음 (백그라운드).

---

## 6. 구현 우선순위 & 로드맵

### 의존성 그래프

```
논문 비교표          → 독립 (OpenAI만 추가)
프로젝트/폴더        → 독립 (localStorage만)
저자 추적            → useOpenAlex.js 신규
네트워크 그래프      → useSemanticScholar.js 신규 + vis-network 설치
```

### 추천 구현 순서

| Phase | 기능 | 예상 작업량 | 신규 의존성 |
|---|---|---|---|
| 1 | 논문 비교표 | 소 (2~3일) | 없음 |
| 2 | 프로젝트/폴더 | 중 (4~5일) | 없음 |
| 3 | 저자 추적 | 중 (4~5일) | OpenAlex API |
| 4 | 네트워크 그래프 | 대 (7~10일) | Semantic Scholar + vis-network |

### 환경변수 추가 목록

```env
# .env.example에 추가할 항목
VITE_SEMANTIC_SCHOLAR_KEY=   # https://www.semanticscholar.org/product/api
VITE_OPENALEX_EMAIL=         # polite pool 식별용 이메일 (임의 가능)
```

### 공통 주의사항

1. **localStorage 총 용량 모니터링**: 4개 기능 모두 추가 시 `biolens_*` 키 총합 측정 유틸 추가 권장
2. **에러 경계**: 각 신규 composable은 기존 패턴처럼 try-catch + silent fail 원칙 유지
3. **Rate Limiter 재사용**: `createRateLimiter(rps)` 팩토리 함수로 rateLimiter.js 리팩토링 후 각 API에 맞게 인스턴스 생성
4. **오프라인 대응**: `navigator.onLine` 체크 후 API 호출, 오프라인 시 캐시 데이터 표시

---

*이 보고서는 현재 BioLens 코드베이스(`usePubmed.js`, `useScrap.js`, `useOpenAI.js`, `useICite.js`, `rateLimiter.js`, `SynthesisPanel.vue`) 분석을 기반으로 작성됨.*
