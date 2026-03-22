# BioLens 프로젝트 상세 분석 보고서

> 최초 작성: 2026-03-21
> 최종 업데이트: 2026-03-21 (API 조사 + 아키텍처 확장 반영)
> 참조 문서: `project.md` / `pubmed-api-research.md` / `architecture.md`
> 현재 구현 상태: 기획 단계 (코드 미작성, 문서만 존재)

---

## 1. 프로젝트 정체성 요약

| 항목 | 내용 |
|------|------|
| 프로젝트명 | BioLens |
| 부제 | AI 기반 신약 연구 논문 탐색기 |
| 목적 | 신테카바이오 AI센터팀 취업 포트폴리오 |
| 개발 방식 | 바이브코딩 (Claude Code / Cursor 활용) |
| 목표 개발 기간 | 2~3일 |
| 배포 목표 | Vercel |

**한 줄 요약**: 질병명·화합물명을 영어로 검색하면 PubMed 논문을 찾아주고, GPT-4o-mini가 영어 초록을 MeSH 컨텍스트 기반으로 한국어 3줄 요약해주는 신약 연구자용 웹 도구

---

## 2. 왜 이 프로젝트인가 (지원 전략 분석)

신테카바이오 AI센터팀은 **DeepMatcher**, **NEO-ARS** 같은 AI 신약개발 플랫폼의 웹 서비스를 Vue.js + Nuxt.js로 개발·유지보수하는 팀이다.

BioLens는 세 가지 어필 포인트를 동시에 충족한다:

1. **Vue.js 직접 사용** — 공고 메인 스택인 Vue.js로 구현. React 경험자가 Vue도 다룰 수 있음을 증명
2. **바이브코딩 활용** — AI 도구를 개발 흐름에 녹이는 방식 직접 경험 (README에 명시)
3. **도메인 일치** — 신테카바이오가 다루는 바이오·신약 도메인을 직접 다루는 프로젝트

---

## 3. 기술 스택 상세 (확장)

```
프레임워크:      Vue 3 (Composition API)
빌드 도구:       Vite
스타일링:        Tailwind CSS
HTTP 클라이언트: Axios
차트:            Chart.js + vue-chartjs
외부 API:
  ├── PubMed E-utilities API  (NCBI, 무료, 키 선택)
  ├── OpenAI API              (gpt-4o-mini, 저비용)
  └── iCite API               (NIH, 무료, 인용 수)  ← 추가
배포:            Vercel
버전관리:        GitHub
개발 도구:       Claude Code (바이브코딩)
```

### 스택 선택 이유 분석

| 기술 | 선택 이유 |
|------|-----------|
| Vue 3 Composition API | 신테카바이오 공고 메인 스택, React와 유사한 함수형 패턴 |
| Vite | 빠른 개발 서버, Vue 3 기본 빌드툴 |
| Tailwind CSS | 빠른 UI 구성, 커스텀 색상 팔레트 적용 용이 |
| PubMed E-utilities | 완전 무료, 키 없이 3 r/s / 키 있으면 10 r/s |
| gpt-4o-mini | GPT-4 수준 요약 품질, 토큰당 비용 최소화, JSON 응답 강제 가능 |
| iCite API | NIH 공식 제공 무료 인용 수 API, Rate Limit 없음 |

---

## 4. PubMed API 핵심 제약사항 (조사 확정)

### 4-1. Rate Limit — 공식 확정 수치

| 조건 | 초당 최대 요청 | 비고 |
|------|-------------|------|
| API 키 없음 | **3 req/sec** | IP 기반 제한 |
| API 키 있음 | **10 req/sec** | NCBI 계정 무료 발급 |
| 일일 총량 제한 | **없음** | 초당 기준만 존재 |

**Rate Limit 초과 응답** — 중요 주의사항:
```
HTTP 429 Too Many Requests (최신)
또는 HTTP 200 + JSON 에러 바디 (레거시)
→ axios.get() 자체가 성공으로 보임 → body 파싱 필수

JSON: { "error": "API rate limit exceeded", "count": "11" }
XML:  <ERROR>API rate limit exceeded</ERROR>
```

### 4-2. 검색 결과 수 제한

| API | GET 권장 | 절대 최대 | BioLens 사용 |
|-----|---------|---------|------------|
| ESearch retmax | — | **10,000건** | **20건** |
| ESummary 배치 | **~200개 ID** | POST 무제한 | **20개** |
| EFetch 배치 | **200개 ID** | POST 무제한 | **20개 배치** |

### 4-3. 초록은 ESummary에 없음 — 필수 확인

> `ESummary`는 제목·저자·저널·발행일·DOI·인용수 등을 제공하지만 **초록(abstract)은 제공하지 않는다.**
> 초록은 반드시 `EFetch` (XML) 로 별도 요청해야 하며, JSON 형식은 지원하지 않는다.

### 4-4. 한국어 검색 불가 — 확인된 사실

```
PubMed 인덱스 = 영어 기반
한글 검색어 입력 → 결과 0건 (사실상 불가)

✅ 올바른 사용법:
  영어로 검색 → AI가 한국어로 요약
  korean[la] 필터 → 한국어로 발행된 논문 필터링

❌ 작동하지 않는 방식:
  "유방암" 검색 → 결과 없음
```

---

## 5. 핵심 기능 동작 원리 (확장)

### 5-1. 논문 검색 (2-Step + 백그라운드 병렬)

```
사용자 입력 → SearchBar.vue (한글 감지 경고 포함)
      ↓
usePubmed.search(query, filters)
      ↓
[rateLimiter 큐 통과]  ← 초당 N회 자동 준수
      ↓
Step 1: ESearch (기본: 직접 ID 방식)
  params: db=pubmed, term={query}[tiab]+{날짜/유형 필터}, retmax=20
  응답: { count, idlist:[...20개 PMID] }
  ※ usehistory=y는 페이지네이션 확장 시에만 사용
    (WebEnv/query_key 관리 복잡도 → 기본 구현에는 불필요)

Step 2: ESummary (20개 ID 배치)
  params: id={idlist 쉼표 연결}, retmax=20
  응답 필드 추출:
    title, authors(3명), journal, year(정규식 파싱),
    doi(top-level 우선 → articleids fallback), pmcId(articleids에서 추출),
    hasAbstract(초록 존재 여부 사전 확인!),
    pmcrefcount(PMC 인용 수), pubtype, lang
      ↓
results.value 업데이트 → PaperCard 20개 렌더링

[ESummary 완료 시 즉시 처리]
  → pmcId 있는 카드: [📄 무료전문] 버튼 즉시 활성화 (ELink 불필요)

[백그라운드 병렬 실행]
  ├── 배치 EFetch (hasAbstract=true 카드 전체, 1회 호출)
  │     → abstract, meshTerms, chemicals 채움
  └── iCite API (20개 PMID, Rate Limit 없음)
        → citationCount, rcr 채움
      ↓
카드에 인용 수 배지 업데이트 (무료전문 버튼은 이미 활성화된 상태)
```

### 5-2. EFetch 배치 처리 (구 설계 → 신 설계)

```
[구 설계 — 개별 요청]
AI 요약 버튼 클릭마다 EFetch 1회
20개 모두 요약 시 → 20회 호출 → 초당 3회 제한으로 6.7초+ 소요

[신 설계 — 배치 요청]  ← 적용
검색 완료 직후 hasAbstract=true 카드를 모아서 EFetch 1회
→ 20개 초록을 한 번에 XML로 수신 후 파싱
→ AI 요약 버튼 클릭 시 EFetch 대기 없이 즉시 OpenAI 호출
→ NCBI API 호출 20회 → 1회로 절감
```

**구조화 초록 파싱 필수 처리:**
```javascript
// 일반 초록: <AbstractText>텍스트</AbstractText>
// 구조화 초록: <AbstractText Label="BACKGROUND">...</AbstractText>
//             <AbstractText Label="METHODS">...</AbstractText>
//             <AbstractText Label="RESULTS">...</AbstractText>

const nodes = article.querySelectorAll('AbstractText')
const abstract = Array.from(nodes).map(node => {
  const label = node.getAttribute('Label')
  return label ? `${label}: ${node.textContent}` : node.textContent
}).join('\n\n')
// → 모든 섹션 합산 → OpenAI에 전달
```

### 5-3. AI 초록 요약 (MeSH 보강 + JSON 안전화)

```
PaperCard의 [🤖 AI 요약] 버튼 클릭
      ↓
abstract 이미 있으면 즉시 진행 (배치 EFetch 덕분)
없으면 EFetch 단건 요청 후 진행
      ↓
useOpenAI.summarizeAbstract({ abstract, meshTerms, chemicals })
      ↓
OpenAI API 호출 (gpt-4o-mini)
  - max_tokens: 500
  - temperature: 0.3
  - response_format: { type: "json_object" }  ← JSON 파싱 오류 원천 차단
  - 프롬프트: 신약개발 연구자 페르소나
            + MeSH 용어 컨텍스트 포함  ← 신규
            + 화학물질/약물 컨텍스트 포함  ← 신규
            + JSON만 응답 강제
      ↓
JSON.parse → { summary: [3줄], keywords: [3개] }
      ↓
AiSummary.vue (fade-in) → MeSH 기반 정확도 높은 키워드 표시
```

### 5-4. iCite API — 인용 수 (신규)

```javascript
// E-utilities는 인용 수를 제공하지 않음
// pmcrefcount = PMC 내부 인용만 (불완전)
// → NIH iCite API 사용 (완전 무료, Rate Limit 없음)

GET https://icite.od.nih.gov/api/pubs?pmids=39123456,38987654,...

응답:
{
  "data": [{
    "pmid": 39123456,
    "citation_count": 45,          // 총 인용 수
    "citations_per_year": 12.3,    // 연간 인용 수
    "relative_citation_ratio": 2.1 // RCR > 1 = 분야 평균 이상 영향력
  }]
}
// PaperCard에 [인용 45회] [RCR 2.1] 배지로 표시
```

### 5-5. ELink API — 관련 논문 (신규, 선택 기능)

```javascript
// 관련 논문 탐색 (NCBI 알고리즘)
GET /elink.fcgi?dbfrom=pubmed&db=pubmed&id={pmid}&linkname=pubmed_pubmed

// 이 논문을 인용한 논문 목록
GET /elink.fcgi?dbfrom=pubmed&db=pubmed&id={pmid}&linkname=pubmed_pubmed_citedin

// ⚠️ PMC 무료전문 버튼은 ELink 불필요
// → ESummary의 articleids에서 pmcId 추출 후 즉시 버튼 활성화
// → ELink pubmed_pmc는 ESummary에서 pmcId가 없는 엣지케이스에만 사용 가능 (선택)
```

### 5-6. 트렌드 차트 집계 로직

```javascript
// 연도 파싱: pubdate가 "2024 Mar 15" / "2024" / "2024 Spring" 등 불규칙
year = parseInt(item.pubdate?.match(/\d{4}/)?.[0]) || null
// → 정규식으로 4자리 숫자 추출 (split보다 안전)

// 차트 집계: 2000년 이후 논문만
papers.forEach(p => {
  if (p.year > 2000) yearCount[p.year] = (yearCount[p.year] || 0) + 1
})
// Chart.js Bar Chart 렌더링
```

---

## 6. 컴포넌트 구조 분석 (확장)

```
App.vue (상태 허브)
├── AppHeader.vue          로고 + 슬로건
├── SearchBar.vue          검색 입력 + 한글 감지 경고  ← 개선
├── QuickTags.vue          빠른 검색 (영어+한국어 병기) ← 개선
├── ResultSummary.vue      결과 수 + 차트
│   └── TrendChart.vue     연도별 막대 차트 (Chart.js)
├── SkeletonCard.vue       로딩 플레이스홀더 3~4개
├── PaperCard.vue ×N       논문 카드 (핵심 컴포넌트)
│   ├── AiSummary.vue      AI 요약 + MeSH 키워드 태그  ← 개선
│   ├── CitationBadge      [인용 N회] [RCR N.N] 배지   ← 신규
│   └── RelatedPanel       관련 논문 5개 (ELink)        ← 신규(선택)
├── Pagination.vue         페이지 이동 (최대 500페이지)   ← 신규(선택)
└── EmptyState.vue         초기/0건/한글입력 3분기 화면  ← 개선
```

### PaperCard.vue 내부 상태 머신 (확장)

```
[기본 상태]
  isExpanded=false, isAiLoading=false, aiSummary=null
  hasAbstract=(ESummary에서 사전 확인)
  citationCount=(iCite에서 비동기 채움)
        ↓ [더보기 클릭]
[초록 펼침]
  isExpanded=true → 초록 전체 + MeSH 칩 표시
        ↓ [AI 요약 클릭]
        (hasAbstract=false면 버튼 disabled → 이 단계 없음)
[AI 로딩]
  isAiLoading=true → "⏳ 분석 중..." (disabled)
  abstract 있으면: 즉시 OpenAI
  abstract 없으면: EFetch 단건 → OpenAI
        ↓ [응답 성공]
[AI 완료]
  aiSummary = { summary: [3줄], keywords: [3개] }
  → AiSummary.vue fade-in 렌더링
        ↓ [응답 실패]
[오류]
  hasError=true
  → 에러 메시지 + 재시도 버튼
  초록 없음이면: "이 논문은 초록이 제공되지 않습니다."
  API 오류이면: "AI 요약 생성에 실패했습니다."
```

---

## 7. 디렉토리 구조 설계 (확장)

```
biolens/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── AppHeader.vue        로고, 네비게이션
│   │   ├── SearchBar.vue        검색 + 한글 감지 경고
│   │   ├── QuickTags.vue        영어+한국어 병기 태그
│   │   ├── ResultSummary.vue    총 결과 수, 차트 패널
│   │   ├── TrendChart.vue       연도별 막대 차트
│   │   ├── PaperCard.vue        논문 카드 (핵심)
│   │   ├── AiSummary.vue        AI 요약 + MeSH 키워드
│   │   ├── CitationBadge.vue    인용 수 + RCR 배지     ← 신규
│   │   ├── SkeletonCard.vue     로딩 스켈레톤
│   │   ├── Pagination.vue       페이지 이동            ← 신규(선택)
│   │   └── EmptyState.vue       검색 결과 없음
│   ├── composables/
│   │   ├── usePubmed.js         ESearch + ESummary + 배치EFetch
│   │   ├── useOpenAI.js         OpenAI 요약 (MeSH 컨텍스트)
│   │   ├── useICite.js          iCite 인용 수          ← 신규
│   │   └── useELink.js          관련/인용 논문, PMC 링크 ← 신규(선택)
│   ├── utils/
│   │   ├── rateLimiter.js       초당 N회 요청 큐        ← 신규
│   │   ├── xmlParser.js         EFetch XML 파싱        ← 신규
│   │   └── formatters.js        날짜, 저자명 포맷
│   ├── App.vue
│   └── main.js
├── .env                         VITE_OPENAI_API_KEY, VITE_NCBI_API_KEY
├── .env.example
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

**설계 패턴**: Vue 3 Composition API Composable 패턴
- 비즈니스 로직: composables/에 집중
- API 호출: rateLimiter를 통해 속도 제어
- XML 파싱: xmlParser.js로 분리 (테스트 용이)

---

## 8. API 명세 상세 (확장)

### 8-1. PubMed E-utilities — 전체 사용 API

| API | 용도 | Rate Limit 소비 | 호출 횟수/검색 |
|-----|------|---------------|-------------|
| ESearch | 검색어 → PMID 목록 (기본: 직접 ID 방식) | 1회 | 1회 |
| ESummary | PMID → 메타데이터 20개 배치 | 1회 | 1회 |
| EFetch | 초록 + MeSH + 약물 배치 | 1회 | 1회 (배치) |
| ELink | 관련/인용 논문, PMC 링크 | 1회/카드 | 선택적 |
| **합계 (기본)** | | **3회** | **rateLimiter 2.5 r/s 자동 제어** |

**ESearch — 쿼리 빌더 지원 파라미터:**
```
term 구성 예시:
  cancer[tiab]                          기본 검색
  cancer[tiab] AND 2020:2024[dp]        연도 필터
  cancer[tiab] AND Review[pt]           리뷰 논문만
  cancer[tiab] AND free full text[filter] 무료 전문만
  (BRCA1 OR BRCA2)[tiab] AND cancer     불리언 조합
```

**ESummary — 주요 추출 필드:**
```
// result[id] 기준 주요 필드
title        "BRCA1 mutations..."   논문 제목 (HTML 태그 포함 가능 → 제거 필요)
authors      [{name: "Kim J"}, ...] 저자 배열 (3명만 사용)
source       "Nature"               저널명
pubdate      "2024 Mar 15"          발행일 (형식 불규칙 → 정규식으로 연도 추출)
doi          "10.1038/..."          DOI (top-level 필드 우선, 없으면 articleids에서 fallback)
articleids   [{idtype:"pmc", value:"PMC1234567"}, ...]  PMC ID 포함 여부 확인
hasabstract  "1" or "0"             초록 존재 여부 사전 확인 → AI 요약 버튼 제어 (핵심!)
pmcrefcount  "45"                   PMC 인용 수 (불완전 → iCite API 사용 권장)
```

**EFetch — rettype × retmode 조합:**

| rettype | retmode | 내용 | BioLens 사용 |
|---------|---------|------|-------------|
| (기본) | `xml` | 전체 레코드 (초록+MeSH+약물) | ✅ 배치 사용 |
| `abstract` | `text` | 초록 텍스트만 | 단건 fallback |
| `medline` | `text` | MEDLINE 형식 | — |

> **EFetch는 JSON 미지원** — XML 파싱 필수

### 8-2. iCite API (NIH)

```
GET https://icite.od.nih.gov/api/pubs?pmids={pmid1,pmid2,...}
Rate Limit: 없음
인증: 불필요

응답:
  citation_count       총 인용 수
  citations_per_year   연간 인용 수
  relative_citation_ratio  RCR (1.0 = 분야 평균, >1 = 평균 이상)
```

### 8-3. OpenAI API

```
POST https://api.openai.com/v1/chat/completions
모델: gpt-4o-mini
max_tokens: 500
temperature: 0.3
response_format: { type: "json_object" }  ← JSON 파싱 오류 원천 차단
인증: Bearer {VITE_OPENAI_API_KEY}

프롬프트 구성:
  역할: "신약개발 분야 전문 연구자"
  컨텍스트: MeSH 용어 + 화학물질/약물 목록
  입력: 영어 초록 전문
  출력: { summary: [3줄 한국어], keywords: [3개] }
```

---

## 9. Rate Limit 준수 구조 (신규)

### 9-1. rateLimiter.js 설계

```javascript
// 큐 기반 속도 제한 — 초당 N회 자동 준수
export function createRateLimiter(requestsPerSecond) {
  // 요청을 큐에 적재 → minInterval(ms) 간격으로 순차 처리
  // NCBI 키 없음: 2.5 r/s (안전 마진), 키 있음: 9 r/s
}

// 모든 NCBI 요청 공통 래퍼
async function safeNCBIRequest(url, params) {
  // HTTP 429 감지 → 2초 후 1회 재시도
  // HTTP 200 + JSON error 감지 → 동일 처리
  // ESearch XML 에러 필드 감지
}
```

### 9-2. 환경변수 구성

```
.env
  VITE_OPENAI_API_KEY=sk-proj-...       ← 필수
  VITE_NCBI_API_KEY=ABCDE12345          ← 선택 (있으면 10 r/s)

⚠️ VITE_ 접두사 = 클라이언트 번들 노출
  → OpenAI Usage Limit ($10~20/월) 설정 권장
  → NCBI 키 노출되어도 재발급으로 기존 키 무효화 가능
```

### 9-3. 검색 1회 API 호출 횟수 분석

| 시나리오 | NCBI 호출 | iCite 호출 | OpenAI 호출 | Rate Limit 위험 |
|---------|---------|----------|-----------|--------------|
| 검색만 (초록 없이) | 2회 | 0 | 0 | 없음 |
| 검색 + 배치EFetch + iCite (기본) | 3회 | 1회 | 0 | 없음 |
| AI 요약 1개 | 0 | 0 | 1회 | 없음 |
| AI 요약 20개 | 0 | 0 | 20회 | OpenAI 쪽만 |
| 관련 논문 조회 (ELink, 선택) | 1회 | 0 | 0 | 없음 |
| 페이지 이동 | 2회 (ESummary + EFetch) | 0 | 0 | 없음 |
| **최악 합계** | **~6회** | **1회** | **가변** | **없음** |

> 최악 시나리오 계산: ESearch 1 + ESummary 1 + EFetch 1 + ELink 1 + 페이지이동(ESummary 1 + EFetch 1) = **6회**
> 단, 이 6회는 동시 발생하지 않음 — rateLimiter 큐로 순차 처리하므로 초당 3회 제한 안전

---

## 10. 한국어 검색 대응 전략

### 검색 자체

```
❌ "유방암" 입력 → 결과 0건 (PubMed 영어 인덱스 기반)
✅ "breast cancer" 입력 → 정상 작동
✅ AI 요약 → 한국어로 출력 (OpenAI가 번역+요약)
```

### SearchBar.vue — 한글 감지

```javascript
const hasKorean = computed(() => /[\uAC00-\uD7A3]/.test(query.value))
// 감지 시: "PubMed는 영어 검색만 지원합니다. 예: breast cancer, BRCA1"
```

### QuickTags.vue — 영어+한국어 병기

```javascript
const quickTags = [
  { en: 'BRCA1',                ko: 'BRCA1 유전자' },
  { en: 'cancer immunotherapy', ko: '암 면역치료' },
  { en: 'Alzheimer disease',    ko: '알츠하이머' },
  { en: 'COVID-19 drug',        ko: 'COVID-19 치료제' },
  { en: 'CRISPR therapy',       ko: 'CRISPR 유전자치료' },
  { en: 'PD-1 PD-L1',          ko: '면역관문억제제' },
]
// 클릭 시 영어 term으로 검색 전달
```

---

## 11. 색상 팔레트 (디자인 시스템)

신테카바이오 사이트 컬러 기준:

| 변수 | 컬러 코드 | 용도 |
|------|----------|------|
| Primary | `#00B4D8` | 밝은 청록 — 메인 색상 |
| Secondary | `#0077B6` | 진한 파랑 — 강조, 버튼 |
| Accent | `#90E0EF` | 연한 청록 — 태그, 보조 |
| Background | `#F8FAFC` | 거의 흰색 — 페이지 배경 |
| Text | `#1E293B` | 진한 남색 — 본문 |
| Muted | `#64748B` | 회색 — 부가 정보 |
| Success | `#10B981` | 초록 — AI 요약 완료 |

---

## 12. 개발 로드맵 (Day-by-Day, 확장)

### Day 1 — 기반 구축 + 검색 기능

1. Vite + Vue 3 프로젝트 생성
2. Tailwind CSS 설치·설정
3. Axios + 의존성 설치
4. `.env` 파일 생성 (OPENAI 키, NCBI 키)
5. AppHeader.vue 작성
6. SearchBar.vue — 한글 감지 경고 포함
7. QuickTags.vue — 영어+한국어 병기 태그
8. **rateLimiter.js + xmlParser.js** 작성 ← 신규
9. **usePubmed.js** — ESearch + ESummary + 배치EFetch (History Server는 페이지네이션 확장 시 추가)
10. App.vue 검색 연동

### Day 2 — 논문 카드 + AI 요약

1. SkeletonCard.vue
2. **useICite.js** — 인용 수 배치 조회 ← 신규 (PaperCard보다 먼저)
3. **useOpenAI.js** — MeSH 컨텍스트 + `response_format: json_object`
4. **PaperCard.vue** — hasAbstract 사전 체크, PMC 무료전문 버튼, 인용 배지
5. AiSummary.vue — 3줄 요약 + 키워드 태그 + fade-in
6. EmptyState.vue — 초기/0건/한글입력 3가지 분기

### Day 3 — 차트 + 확장 기능 + 배포

1. TrendChart.vue (Chart.js, 연도별 집계)
2. ResultSummary.vue (총 결과 수 + 차트)
3. 반응형 레이아웃 (Tailwind breakpoints)
4. [선택] useELink.js — 관련 논문 / PMC 링크
5. [선택] Pagination.vue — History Server 기반
6. README.md 작성 (바이브코딩 명시 필수)
7. Vercel 배포 (GitHub 연동, 환경변수 설정)
8. 포트폴리오에 추가

---

## 13. 리스크 & 대응 방안 (확장·수정)

| 항목 | 리스크 | 대응 방안 |
|------|--------|-----------|
| PubMed Rate Limit | 키 없이 초당 3회 | rateLimiter.js 큐 구조 (자동 준수) |
| Rate Limit 에러 감지 | HTTP 200으로 에러 오는 경우 있음 | body 파싱 + HTTP 429 이중 감지 |
| EFetch 배치 XML 파싱 | 구조화 초록, 초록 없는 논문 | querySelectorAll + hasAbstract 사전 체크 |
| OpenAI JSON 파싱 오류 | JSON 외 텍스트 포함 가능 | `response_format: json_object` 옵션 |
| OpenAI API 키 노출 | VITE_ 변수 = 번들 포함 | Usage Limit 설정, Vercel 환경변수 |
| NCBI API 키 노출 | 동일 | 재발급으로 기존 키 무효화 (피해 최소) |
| pubdate 형식 불규칙 | "2024 Mar" / "2024" / "2024 Spring" | `match(/\d{4}/)`로 4자리 추출 |
| title HTML 태그 포함 | `<b>`, `<i>` 등 포함될 수 있음 | replace로 HTML 제거 |
| 한글 검색어 | 결과 0건 | 한글 감지 경고 + 영어 안내 |
| iCite API 응답 없음 | 일부 PMID 누락 가능 | 응답 없는 PMID = citationCount=0 처리 |

---

## 14. 추가 기능 명세 (우선순위 재정렬)

### 권장 추가 기능 (포트폴리오 임팩트 높음)

#### 인용 수 배지 (iCite API)
- 카드에 `인용 N회` / `RCR N.N` 배지 표시
- API 1회 호출로 20개 동시 처리 (Rate Limit 없음)
- 구현 난이도 낮음, 임팩트 높음

#### 무료 전문 링크 (PMC)
- ESummary의 `articleids` 배열에서 `idtype:"pmc"` 항목 추출 → pmcId 확보
- pmcId 있는 카드에만 [📄 무료전문] 버튼 표시 (ELink API 불필요)
- 클릭 → `https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcId}/` 새 탭 열기

#### 한글 감지 안내
- 유니코드 정규식으로 한글 입력 감지
- 실시간 경고 + 영어 예시 제공

### 선택 추가 기능 (시간 여유 시)

#### 즐겨찾기 (북마크)
- localStorage 기반 저장 (API 없음)
- 즐겨찾기 탭에서 모아보기

#### 연도/유형 필터
- 연도 범위 슬라이더 → ESearch term에 `[dp]` 필터 추가
- 논문 유형 필터 (Review, Clinical Trial 등) → `[pt]` 필터

#### 페이지네이션
- History Server 활용(usehistory=y) → ESearch 재호출 없이 ESummary + EFetch로 페이지 이동
- 최대 500페이지 (10,000건 ÷ 20건) 한도 표시

#### 관련 논문 패널 (ELink)
- 카드에 "관련 논문 보기" 토글
- ELink pubmed_pubmed → 상위 5개 PMID → ESummary → 미니 카드

---

## 15. 현재 구현 상태

```
VibeCodingProject/
├── .idea/                ← JetBrains IDE 설정
├── project.md            ← 최초 기획 문서
├── research.md           ← 이 파일 (종합 분석 보고서)
├── pubmed-api-research.md ← PubMed API 상세 조사
└── architecture.md       ← 서비스 동작 구조 상세
```

**결론**: 코드 구현은 전혀 이루어지지 않은 **순수 기획·설계 단계**.
3개 md 파일이 완성된 상태로, Day 1부터 구현 시작 가능.

---

## 16. 포트폴리오 활용 전략

- **README**: 바이브코딩(Claude Code) 방식 명시
- **배포 URL**: `https://biolens.vercel.app` (목표)
- **GitHub**: `https://github.com/pic-pick/biolens` (목표)
- **자소서 연결 문구**:
  > "PubMed API와 OpenAI API를 연동해 신약 연구자용 논문 탐색 서비스 BioLens를 Vue 3로 개발했고, iCite API를 추가 연동해 논문 인용 지표(RCR)까지 표시했습니다."

---

## 17. 결론

BioLens는 **2~3일 단기 개발** 제약 안에서 신테카바이오 지원이라는 명확한 목적을 가진 전략적 포트폴리오 프로젝트다.

**API 조사를 통해 확정된 설계 방향:**
- EFetch 개별 요청 → **배치 1회** 로 최적화 (Rate Limit 걱정 없음)
- ESummary `hasAbstract` 필드로 AI 요약 버튼 사전 제어
- `response_format: json_object` 로 OpenAI JSON 파싱 안정화
- iCite API 추가로 인용 수 배지 기능 (난이도 낮음, 임팩트 큼)
- 한글 감지 경고 + QuickTags 영어+한국어 병기로 UX 개선
- NCBI API 키 발급(무료)으로 10 r/s 확보 → rateLimiter 9 r/s로 상향 가능

**API 키 없는 기본 구성으로도** 검색 1회당 NCBI API 호출 최대 3회(ESearch + ESummary + EFetch) → rateLimiter 2.5 r/s로 순차 처리하므로 초당 3회 제한 내 모든 핵심 기능 동작 가능.
