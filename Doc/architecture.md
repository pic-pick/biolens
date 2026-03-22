# BioLens 서비스 동작 구조 — API 조사 반영 확장판

> 작성일: 2026-03-21 (pubmed-api-research.md 완전 반영)
> 변경 사유: Rate limit 준수 구조, 배치 EFetch, 에러 감지, 추가 API 통합

---

## 1. 전체 아키텍처 조감도 (확장)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          사용자 브라우저                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                        Vue 3 SPA (Vite)                         │ │
│  │                                                                  │ │
│  │  App.vue (상태 허브)                                              │ │
│  │  ├── AppHeader.vue       로고 + 슬로건                            │ │
│  │  ├── SearchBar.vue       검색 입력 + 한글감지 안내                  │ │
│  │  ├── QuickTags.vue       빠른 검색 (영어 고정)                     │ │
│  │  ├── ResultSummary.vue   결과 수 + 차트                           │ │
│  │  │   └── TrendChart.vue  연도별 막대 차트 (Chart.js)               │ │
│  │  ├── SkeletonCard.vue    로딩 플레이스홀더                          │ │
│  │  ├── PaperCard.vue ×N   논문 카드                                 │ │
│  │  │   ├── AiSummary.vue  AI 요약 + MeSH 키워드                     │ │
│  │  │   ├── CitationBadge  인용 수 (iCite API)                      │ │
│  │  │   └── RelatedPanel   관련 논문 (ELink API) [선택]               │ │
│  │  └── EmptyState.vue     초기 / 0건 화면                           │ │
│  │                                                                  │ │
│  │  Composables                                                     │ │
│  │  ├── usePubmed.js    ESearch + ESummary + 배치 EFetch            │ │
│  │  ├── useOpenAI.js    GPT-4o-mini 요약                            │ │
│  │  ├── useICite.js     인용 수 조회 (iCite API)      [확장]          │ │
│  │  └── useELink.js     관련 논문 + 참고문헌 (ELink)   [확장]          │ │
│  │                                                                  │ │
│  │  Utils                                                           │ │
│  │  ├── rateLimiter.js  초당 N회 제한 큐                              │ │
│  │  ├── xmlParser.js    EFetch XML 파싱                              │ │
│  │  └── formatters.js   날짜/저자 포맷                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ PubMed E-utils  │  │   OpenAI API    │  │     iCite API        │
│ (NCBI, 무료)    │  │ (api.openai.com)│  │ (icite.od.nih.gov)   │
│                 │  │ gpt-4o-mini     │  │  NIH 제공, 무료        │
│ ① ESearch      │  │ Bearer 토큰 인증 │  │  인용 수 / RCR        │
│ ② ESummary     │  │                 │  └──────────────────────┘
│ ③ EFetch(배치)  │  └─────────────────┘
│ ④ ELink        │
│                 │
│ Rate Limit:     │
│  키없음: 3 r/s  │
│  키있음: 10 r/s │
└─────────────────┘
```

---

## 2. Rate Limit 준수 계층 (신규)

### 2-1. 왜 Rate Limiter가 필요한가

```
[문제]
검색 1회:          ESearch(1) + ESummary(1) = 2회  ← 여유
AI 요약 20개 연속: EFetch(20)                = 20회 ← 초당 3회 제한 위반

초당 3회 제한 기준으로 20회를 안전하게 보내려면:
  20 / 3 = 최소 6.7초 간격 필요
  단순 delay(350ms) 사이 삽입으로는 사용자 UX 저하

[해결]
rateLimiter.js — 요청 큐(Queue) 기반 속도 제한
```

### 2-2. rateLimiter.js 설계

```javascript
// utils/rateLimiter.js
export function createRateLimiter(requestsPerSecond = 3) {
  const queue = []
  let lastCallTime = 0
  const minInterval = 1000 / requestsPerSecond  // 333ms (3 r/s)

  async function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      processQueue()
    })
  }

  async function processQueue() {
    if (queue.length === 0) return
    const now = Date.now()
    const wait = Math.max(0, minInterval - (now - lastCallTime))
    await delay(wait)
    const { fn, resolve, reject } = queue.shift()
    lastCallTime = Date.now()
    try { resolve(await fn()) } catch(e) { reject(e) }
    processQueue()
  }

  return { enqueue }
}

// NCBI API 키 유무에 따라 자동 속도 조정
const apiKey = import.meta.env.VITE_NCBI_API_KEY
export const ncbiLimiter = createRateLimiter(apiKey ? 9 : 2.5)
//                                                    ↑      ↑
//                                               10 r/s  3 r/s
//                                              (안전 마진)
```

### 2-3. Rate Limit 에러 감지 — 중요 주의사항

```javascript
// ⚠️ NCBI는 HTTP 상태코드만으로 감지 불가
// HTTP 429 또는 HTTP 200 + JSON 에러 바디 혼재

// 올바른 에러 감지 패턴
async function safeNCBIRequest(url, params) {
  const response = await axios.get(url, { params })

  // JSON 에러 감지 (HTTP 200으로 오는 rate limit 에러)
  if (response.data?.error) {
    throw new RateLimitError(response.data.error)
  }
  // ESearch XML 에러 감지
  if (response.data?.esearchresult?.ERROR) {
    throw new Error(response.data.esearchresult.ERROR)
  }

  return response.data
}
```

---

## 3. 핵심 플로우 1 — 논문 검색 (Rate Limit 반영)

### 3-1. 검색 시퀀스 다이어그램

```
사용자           SearchBar        App.vue         usePubmed         PubMed API
  │                 │                │                │                  │
  │ 검색어 입력      │                │                │                  │
  │────────────────►│                │                │                  │
  │ [한글 감지 시]   │                │                │                  │
  │ "영어로 입력" 경고│                │                │                  │
  │                 │  emit(search)  │                │                  │
  │                 │───────────────►│                │                  │
  │                 │                │  search(query) │                  │
  │                 │                │───────────────►│                  │
  │                 │                │                │                  │
  │                 │                │   isLoading=true                  │
  │                 │     ←──────────────────────────────────────────    │
  │                 │     [SkeletonCard 3개 표시]                        │
  │                 │                │                │                  │
  │                 │                │                │ ① ESearch        │
  │                 │                │                │  (rateLimiter)   │
  │                 │                │                │─────────────────►│
  │                 │                │                │ {idlist, count}  │
  │                 │                │                │◄─────────────────│
  │                 │                │                │                  │
  │                 │                │                │ ② ESummary       │
  │                 │                │                │  (20 IDs, 배치)   │
  │                 │                │                │─────────────────►│
  │                 │                │                │ {title, authors, │
  │                 │                │                │  source, pubdate,│
  │                 │                │                │  doi, pmcid,     │
  │                 │                │                │  hasabstract}    │
  │                 │                │                │◄─────────────────│
  │                 │                │                │                  │
  │                 │                │                │  데이터 가공       │
  │                 │                │                │  + PMC ID 추출    │
  │                 │                │                │  + 초록 유무 표시  │
  │                 │                │                │                  │
  │                 │                │  results 업데이트                 │
  │                 │                │◄───────────────│                  │
  │                 │                │  isLoading=false                  │
  │◄────────────────────────────────── │                                 │
  │  PaperCard 20개 + TrendChart 렌더링                                  │
```

### 3-2. ESearch 요청 — 개선된 파라미터 설계

```javascript
// usePubmed.js — ESearch 호출
const searchData = await ncbiLimiter.enqueue(() =>
  safeNCBIRequest(`${BASE_URL}/esearch.fcgi`, {
    db: 'pubmed',
    term: buildQuery(query, filters),  // 쿼리 빌더 함수로 분리
    retmax: 20,
    retstart: (page - 1) * 20,         // 페이지네이션 지원
    retmode: 'json',
    sort: 'relevance',
    ...(apiKey && { api_key: apiKey }) // API 키 있으면 자동 추가
  })
)

// 쿼리 빌더 함수
function buildQuery(keyword, filters = {}) {
  let term = `${keyword}[Title/Abstract]`
  if (filters.yearFrom && filters.yearTo) {
    term += ` AND ${filters.yearFrom}:${filters.yearTo}[dp]`
  }
  if (filters.articleType) {
    term += ` AND ${filters.articleType}[pt]`  // e.g. "Review"[pt]
  }
  if (filters.freeFullText) {
    term += ` AND free full text[filter]`
  }
  return term
}
```

### 3-3. ESummary — 핵심 필드 추출 (확장)

```javascript
// ESummary 응답에서 추출할 필드 전체
results.value = ids.map(id => {
  const item = summaryRes.result[id]

  // PMC ID 추출 (무료 전문 링크용)
  const pmcId = item.articleids
    ?.find(a => a.idtype === 'pmc')?.value ?? null

  // DOI 추출 (articleids 배열에서 가장 정확함)
  const doi = item.articleids
    ?.find(a => a.idtype === 'doi')?.value
    ?? item.elocationid ?? null

  // pubdate 파싱 — 형식이 "2024 Mar 15" / "2024 Mar" / "2024" / "2024 Spring"
  const year = parseInt(item.pubdate?.match(/\d{4}/)?.[0]) || null

  return {
    id,
    title: item.title?.replace(/<\/?[^>]+(>|$)/g, ''),  // HTML 태그 제거
    authors: item.authors?.slice(0, 3).map(a => a.name) ?? [],
    hasMoreAuthors: (item.authors?.length ?? 0) > 3,
    journal: item.source,
    fullJournal: item.fulljournalname,
    year,
    pubdate: item.pubdate,
    doi,
    pmcId,                           // null이면 전문 링크 없음
    pmcRefCount: parseInt(item.pmcrefcount) || 0,  // PMC 인용 수
    pubtype: item.pubtype ?? [],
    hasAbstract: item.hasabstract === '1',  // 초록 존재 여부 사전 확인!
    lang: item.lang?.[0] ?? 'eng',
    abstract: null,                  // EFetch로 별도 취득
    meshTerms: [],                   // EFetch 후 채워짐
    chemicals: [],                   // EFetch 후 채워짐
  }
})
```

> **핵심**: `hasAbstract` 필드를 ESummary에서 미리 확인 →
> `false`이면 PaperCard에서 AI 요약 버튼 disabled 처리 가능 (EFetch 불필요)

---

## 4. 핵심 플로우 2 — 초록 가져오기 (배치 EFetch — 개선)

### 4-1. 구 설계 vs 신 설계 비교

```
[구 설계 — 개별 요청]
AI 요약 클릭 → EFetch(PMID 1개) → 1초당 3회 제한
20개 카드 모두 요약 시: 20회 API 호출 → 최소 6.7초

[신 설계 — 배치 요청]
AI 요약 클릭 시 해당 카드 1개만 EFetch
단, 검색 완료 직후 백그라운드에서 20개 초록 배치 요청:

  EFetch(20개 PMID 동시) → 1회 호출 → XML 파싱 → 각 카드에 abstract 채움
  → AI 요약 버튼 클릭 즉시 EFetch 없이 OpenAI만 호출
```

### 4-2. 배치 EFetch 구현 설계

```javascript
// usePubmed.js — 배치 초록 가져오기
async function fetchAbstractsBatch(ids) {
  // hasAbstract=true인 ID만 필터링 (불필요한 요청 제거)
  const validIds = ids.filter(id => {
    const paper = results.value.find(p => p.id === id)
    return paper?.hasAbstract !== false
  })

  if (validIds.length === 0) return

  // 단 1회 API 호출로 20개 초록 동시 수신
  const xmlText = await ncbiLimiter.enqueue(() =>
    axios.get(`${BASE_URL}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: validIds.join(','),    // ← 콤마 구분 복수 ID
        retmode: 'xml',
        ...(apiKey && { api_key: apiKey })
      }
    }).then(r => r.data)
  )

  // XML 파싱 — 각 논문 초록 추출
  const parsed = parseEFetchXML(xmlText)   // xmlParser.js로 분리

  // 결과 카드에 채우기
  parsed.forEach(({ pmid, abstract, meshTerms, chemicals }) => {
    const paper = results.value.find(p => p.id === pmid)
    if (paper) {
      paper.abstract = abstract
      paper.meshTerms = meshTerms   // MeSH 용어 → AI 키워드 보강에 활용
      paper.chemicals = chemicals   // 약물명 → AI 키워드 보강에 활용
    }
  })
}

// xmlParser.js — EFetch XML 파싱
export function parseEFetchXML(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')
  const articles = doc.querySelectorAll('PubmedArticle')

  return Array.from(articles).map(article => {
    const pmid = article.querySelector('PMID')?.textContent

    // 구조화 초록 처리 (BACKGROUND/METHODS/RESULTS/CONCLUSIONS 분리된 경우)
    const abstractNodes = article.querySelectorAll('AbstractText')
    const abstract = Array.from(abstractNodes)
      .map(node => {
        const label = node.getAttribute('Label')
        return label ? `${label}: ${node.textContent}` : node.textContent
      })
      .join('\n\n')

    // MeSH 용어 추출
    const meshTerms = Array.from(article.querySelectorAll('DescriptorName'))
      .map(n => n.textContent)

    // 화학물질/약물 추출
    const chemicals = Array.from(article.querySelectorAll('NameOfSubstance'))
      .map(n => n.textContent)

    return { pmid, abstract: abstract || null, meshTerms, chemicals }
  })
}
```

### 4-3. 초록 가져오기 타이밍 전략 (결정 트리)

```
검색 완료 (20개 카드 렌더링)
      │
      ▼
[전략 A — 즉시 배치 (권장)]
ESummary 완료 직후 → hasAbstract=true 카드만 배치 EFetch (1회)
장점: AI 요약 버튼 클릭 즉시 응답 (EFetch 대기 없음)
단점: 초기 로딩 시 추가 1회 API 호출

[전략 B — Lazy Loading (UX 절충)]
AI 요약 버튼 클릭 시 → 해당 카드 EFetch (1회/카드)
장점: 초기 로딩 최소화
단점: 첫 AI 요약 시 EFetch+OpenAI 직렬 대기

[전략 C — 하이브리드 (최적)]
① 검색 완료 → 1~3번 카드 EFetch (사용자가 볼 가능성 높은 상위 카드)
② 사용자가 나머지 카드 AI 요약 클릭 → lazy EFetch

→ BioLens 포트폴리오 기준: 전략 A (단순, 임팩트 있음)
```

---

## 5. 핵심 플로우 3 — AI 요약 (MeSH 보강 적용)

### 5-1. 개선된 시퀀스

```
사용자         PaperCard        useOpenAI        OpenAI API
  │               │                │                 │
  │ [AI 요약] 클릭  │                │                 │
  │──────────────►│                │                 │
  │               │ abstract 있음?  │                 │
  │               ├── 없음: EFetch 먼저 (전략 B/C)      │
  │               │                │                 │
  │               │  isLoading=true                  │
  │               │                │                 │
  │               │ summarizeAbstract({              │
  │               │   abstract,                      │
  │               │   meshTerms,    ← MeSH 용어 추가  │
  │               │   chemicals     ← 약물명 추가     │
  │               │ })                               │
  │               │───────────────►│                 │
  │               │                │  POST /v1/chat/completions
  │               │                │  (MeSH + 약물 컨텍스트 포함 프롬프트)
  │               │                │─────────────────►│
  │               │                │ { summary, keywords }
  │               │                │◄─────────────────│
  │               │◄───────────────│                 │
  │               │ aiSummary 저장  │                 │
  │◄──────────────│                │                 │
  │ AiSummary 렌더링                │                 │
  │ • 3줄 요약                      │                 │
  │ • MeSH 기반 키워드 태그           │                 │
```

### 5-2. MeSH 보강 프롬프트

```javascript
// useOpenAI.js — MeSH 컨텍스트 포함 프롬프트
async function summarizeAbstract({ abstract, meshTerms = [], chemicals = [] }) {
  const meshContext = meshTerms.length
    ? `\nMeSH 용어: ${meshTerms.slice(0, 5).join(', ')}`
    : ''
  const chemContext = chemicals.length
    ? `\n관련 약물/화합물: ${chemicals.slice(0, 3).join(', ')}`
    : ''

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `당신은 신약개발 분야 전문 연구자입니다.
아래 영어 논문 초록을 분석해 JSON으로만 응답하세요.
${meshContext}${chemContext}

초록:
${abstract}

응답 형식 (JSON만, 다른 텍스트 없이):
{
  "summary": [
    "핵심 내용 1 (한국어, 1~2문장)",
    "핵심 내용 2 (한국어, 1~2문장)",
    "핵심 내용 3 (한국어, 1~2문장)"
  ],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`
      }],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' }  // ← JSON 파싱 오류 방지
    },
    { headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` } }
  )

  return JSON.parse(response.data.choices[0].message.content)
}
```

> `response_format: { type: 'json_object' }` — GPT-4o-mini에서 JSON 외 텍스트 혼입을 원천 차단

---

## 6. 확장 API 통합 — iCite & ELink

### 6-1. iCite API — 인용 수 (NIH 공식, 무료)

> E-utilities 자체는 인용 수를 제공하지 않음 (pmcrefcount는 PMC 내부 인용만)
> → NIH iCite API로 정확한 총 인용 수 취득

```javascript
// useICite.js
const ICITE_BASE = 'https://icite.od.nih.gov/api/pubs'

export function useICite() {
  async function fetchCitations(pmids) {
    if (!pmids.length) return {}

    const response = await axios.get(ICITE_BASE, {
      params: { pmids: pmids.join(',') }
    })

    // PMID → 인용 데이터 맵 반환
    return response.data.data.reduce((acc, pub) => {
      acc[pub.pmid] = {
        citationCount: pub.citation_count ?? 0,
        citationsPerYear: pub.citations_per_year?.toFixed(1) ?? '0',
        rcr: pub.relative_citation_ratio?.toFixed(2) ?? null,
        // RCR > 1 = 해당 분야 평균 이상 영향력
      }
      return acc
    }, {})
  }

  return { fetchCitations }
}

// 사용 타이밍: ESummary 완료 후 백그라운드에서 병렬 호출
// iCite는 rate limit 없음 (NIH 공식 제공)
const citations = await fetchCitations(ids)
results.value.forEach(paper => {
  if (citations[paper.id]) {
    paper.citationCount = citations[paper.id].citationCount
    paper.rcr = citations[paper.id].rcr
  }
})
```

**PaperCard에서 표시:**
```
┌──────────────────────────────────────┐
│ BRCA1 mutations in breast cancer...  │
│ Kim J, Park S, et al. · Nature · 2024│
│                    [인용 45회] [RCR 2.1] ← CitationBadge
└──────────────────────────────────────┘
```

### 6-2. ELink API — 관련 논문 / 인용 논문 (E-utilities 확장)

```javascript
// useELink.js
export function useELink() {
  // 관련 논문 (NCBI 알고리즘 기반)
  async function fetchRelatedPapers(pmid) {
    const data = await ncbiLimiter.enqueue(() =>
      axios.get(`${BASE_URL}/elink.fcgi`, {
        params: {
          dbfrom: 'pubmed',
          db: 'pubmed',
          id: pmid,
          linkname: 'pubmed_pubmed',   // 관련 논문
          retmode: 'json',
          ...(apiKey && { api_key: apiKey })
        }
      }).then(r => r.data)
    )

    const linkSet = data.linksets?.[0]?.linksetdbs
      ?.find(l => l.linkname === 'pubmed_pubmed')
    return linkSet?.links?.slice(0, 5) ?? []  // 상위 5개 PMID 반환
  }

  // 이 논문을 인용한 논문 목록
  async function fetchCitedBy(pmid) {
    const data = await ncbiLimiter.enqueue(() =>
      axios.get(`${BASE_URL}/elink.fcgi`, {
        params: {
          dbfrom: 'pubmed',
          db: 'pubmed',
          id: pmid,
          linkname: 'pubmed_pubmed_citedin',  // 인용한 논문
          retmode: 'json',
          ...(apiKey && { api_key: apiKey })
        }
      }).then(r => r.data)
    )

    const linkSet = data.linksets?.[0]?.linksetdbs
      ?.find(l => l.linkname === 'pubmed_pubmed_citedin')
    return linkSet?.links?.slice(0, 5) ?? []
  }

  // PMC 전문 무료 링크 확인
  async function fetchPMCLink(pmid) {
    const data = await ncbiLimiter.enqueue(() =>
      axios.get(`${BASE_URL}/elink.fcgi`, {
        params: {
          dbfrom: 'pubmed',
          db: 'pmc',
          id: pmid,
          linkname: 'pubmed_pmc',    // PMC 전문 링크
          retmode: 'json',
          ...(apiKey && { api_key: apiKey })
        }
      }).then(r => r.data)
    )

    const pmcIds = data.linksets?.[0]?.linksetdbs
      ?.find(l => l.linkname === 'pubmed_pmc')?.links
    return pmcIds?.[0] ? `https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcIds[0]}/` : null
  }

  return { fetchRelatedPapers, fetchCitedBy, fetchPMCLink }
}
```

---

## 7. 한국어 검색 대응 전략

### 7-1. PubMed 검색 언어 제약 (확인된 사실)

```
PubMed 인덱스 구조:
  - 논문 제목·초록 → 영어로만 색인
  - 한국어 논문도 PubMed 등록 시 영어 제목/초록으로 변환
  - 한글 검색어 → 매칭 불가 (결과 0건)

korean[la] 필터:
  - "이 논문이 한국어로 작성됨" 표시 논문 필터
  - 검색 자체는 여전히 영어로 해야 함
  - 예: breast cancer AND korean[la]
```

### 7-2. SearchBar.vue 한글 감지 로직

```javascript
// SearchBar.vue
const hasKorean = computed(() =>
  /[\uAC00-\uD7A3]/.test(searchQuery.value)  // 한글 유니코드 범위
)

const koreanWarning = computed(() =>
  hasKorean.value
    ? 'PubMed는 영어 검색만 지원합니다. 예: "breast cancer", "BRCA1"'
    : ''
)
```

```html
<!-- SearchBar.vue template -->
<input v-model="searchQuery" placeholder="예: BRCA1, cancer immunotherapy" />
<p v-if="koreanWarning" class="text-amber-500 text-sm mt-1">
  {{ koreanWarning }}
</p>
```

### 7-3. QuickTags — 영어 + 번역 병기

```javascript
// QuickTags.vue
const quickTags = [
  { en: 'BRCA1',                ko: 'BRCA1 유전자' },
  { en: 'cancer immunotherapy', ko: '암 면역치료' },
  { en: 'Alzheimer disease',    ko: '알츠하이머' },
  { en: 'COVID-19 drug',        ko: 'COVID-19 치료제' },
  { en: 'CRISPR therapy',       ko: 'CRISPR 유전자치료' },
  { en: 'PD-1 PD-L1',          ko: '면역관문억제제' },
]
// 표시: "BRCA1 (BRCA1 유전자)" — 클릭 시 영어 term으로 검색
```

---

## 8. 컴포넌트 간 데이터 흐름 (전체 확장판)

```
App.vue (상태 관리 허브)
│
│  state:
│  ├── searchQuery: String
│  ├── currentPage: Number          ← 페이지네이션 추가
│  ├── results: Paper[]             (usePubmed 관리)
│  ├── isLoading: Boolean
│  ├── totalCount: Number
│  ├── error: String|null
│  └── activeTab: 'search'|'bookmarks'  ← 탭 관리
│
├──► SearchBar.vue
│    emits: search(query)
│    내부: 한글 감지 경고, debounce(선택)
│
├──► QuickTags.vue
│    emits: search(query)
│    내부: { en, ko } 태그 목록, 영어로 검색 전달
│
├──► ResultSummary.vue
│    props: totalCount, papers[]
│    └──► TrendChart.vue
│         내부: yearCount 집계, Chart.js Bar Chart
│
├──► SkeletonCard.vue (v-if="isLoading")
│
├──► PaperCard.vue ×N (v-for="paper in results")
│    props: paper {
│      id, title, authors, hasMoreAuthors,
│      journal, year, doi, pmcId,
│      hasAbstract, abstract,         ← 배치 EFetch 후 채워짐
│      meshTerms, chemicals,          ← EFetch XML에서 추출
│      citationCount, rcr,            ← iCite API
│      pubtype
│    }
│    내부 state:
│    ├── isExpanded: Boolean
│    ├── isAiLoading: Boolean
│    ├── aiSummary: Object|null       (요약 결과, 세션 내 캐시)
│    ├── hasError: Boolean
│    ├── showRelated: Boolean         (관련 논문 패널)
│    └── relatedPapers: Paper[]       (ELink)
│    └──► AiSummary.vue (v-if="aiSummary")
│         props: summary[], keywords[]
│         내부: fade-in, MeSH 키워드 태그
│
├──► Pagination.vue (v-if="totalCount > 20")  [확장]
│    props: totalCount, currentPage, pageSize=20
│    emits: pageChange(page)
│    내부: retstart 계산, 최대 500페이지(10,000건) 한도 표시
│
└──► EmptyState.vue (v-if="!isLoading && results.length === 0")
     props: hasSearched, hasKoreanInput
     내부: 검색 전 / 결과없음 / 한글입력 세 가지 분기 표시
```

---

## 9. 전체 상태 전이 다이어그램 (App 레벨)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [초기 상태]                                                       │
│  isLoading=false, results=[], hasSearched=false                  │
│  → EmptyState (초기 화면, QuickTags 표시)                          │
│                                                                  │
│       │ 검색 실행 (영어 검색어)                                     │
│       ▼                                                          │
│  [검색 로딩]                                                       │
│  isLoading=true                                                  │
│  → SkeletonCard ×3                                               │
│  → ESearch → ESummary (2회 API 호출, ~500ms)                      │
│                                                                  │
│       │ 결과 수신                    │ 0건                         │
│       ▼                             ▼                            │
│  [결과 표시]                    [결과없음]                          │
│  isLoading=false               hasSearched=true                  │
│  results=[20개]                → EmptyState (검색 결과 없음)        │
│  → PaperCard 렌더링                                               │
│  → TrendChart 렌더링                                              │
│  → 백그라운드: 배치 EFetch (초록)                                   │
│  → 백그라운드: iCite API (인용 수)                                  │
│                                                                  │
│       │ 페이지 변경                   │ API 오류                    │
│       ▼                             ▼                            │
│  [페이지 로딩]                   [오류 상태]                         │
│  currentPage++                  error 메시지 표시                  │
│  → 새 ESearch(retstart=N)       → 재시도 버튼                       │
│  → 새 ESummary                                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. PaperCard 내부 상태 전이 (확장)

```
┌───────────────────────────────────────────────────────────────┐
│                    PaperCard.vue                               │
│                                                               │
│  [기본 상태]                                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 제목 (HTML 태그 제거 후)                                   │  │
│  │ Kim J, Park S, et al. · Nature · 2024                   │  │
│  │ [인용 45회] [RCR 2.1]              ← CitationBadge       │  │
│  │ 초록 100자... [더 보기]                                    │  │
│  │                                                         │  │
│  │ [🔗 PubMed] [📄 무료전문]  [🤖 AI 요약] [🔖 북마크]        │  │
│  │              ↑ pmcId 있을 때만 표시                       │  │
│  │              ↑ hasAbstract=false면 AI요약 disabled       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ─── "더 보기" 클릭 ──► isExpanded=true                        │
│  → 초록 전체 + MeSH 용어 칩 표시                                 │
│                                                               │
│  ─── "AI 요약" 클릭 ──► isAiLoading=true                      │
│  → abstract 없으면: EFetch(1개) → abstract 채움               │
│  → summarizeAbstract({ abstract, meshTerms, chemicals })    │
│  → OpenAI 응답 → aiSummary 저장 → AiSummary 렌더링            │
│                                                               │
│  [AI 완료 상태]                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 🤖 AI 요약                                               │  │
│  │ • BRCA1 돌연변이가 유방암 예후에 미치는 영향 분석          │  │
│  │ • 3,200명 코호트 연구 — 특정 변이 패턴이 치료 반응성 연관  │  │
│  │ • PARP 억제제 치료 효과 예측 바이오마커 가능성 제시        │  │
│  │                                                         │  │
│  │ #BRCA1  #유방암  #PARP억제제                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ─── "관련 논문" 클릭 (선택 기능) ──► showRelated=true         │
│  → ELink pubmed_pubmed → 관련 5개 PMID → ESummary → 미니 카드  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 11. 페이지네이션 — History Server 방식

```javascript
// usePubmed.js — History Server 기반 페이지네이션

async function search(query, filters = {}) {
  // Step 1: 검색 + 서버 History 저장
  const searchData = await ncbiLimiter.enqueue(() =>
    safeNCBIRequest(`${BASE_URL}/esearch.fcgi`, {
      db: 'pubmed',
      term: buildQuery(query, filters),
      retmax: 0,            // ID는 필요 없고 count + history만
      usehistory: 'y',      // 서버에 결과 저장
      retmode: 'json',
      ...(apiKey && { api_key: apiKey })
    })
  )

  const { count, webenv, querykey } = searchData.esearchresult
  totalCount.value = parseInt(count)
  // webenv, querykey는 이후 페이지 이동에 재사용 (약 1시간 유효)
  searchSession.value = { webenv, querykey }

  await loadPage(1)
}

async function loadPage(page) {
  const { webenv, querykey } = searchSession.value
  const retstart = (page - 1) * 20

  // Step 2: History에서 페이지 단위로 가져오기 (재검색 없음)
  const summaryData = await ncbiLimiter.enqueue(() =>
    safeNCBIRequest(`${BASE_URL}/esummary.fcgi`, {
      db: 'pubmed',
      query_key: querykey,
      WebEnv: webenv,
      retstart,
      retmax: 20,
      retmode: 'json',
      ...(apiKey && { api_key: apiKey })
    })
  )
  // 결과 가공 → results.value 업데이트
}
```

> 페이지 이동 시 ESearch 재호출 없이 ESummary만 호출 → **API 호출 50% 절감**

---

## 12. API 호출 횟수 완전 분석

### 시나리오별 호출 횟수 (키 없음 기준, 초당 3회 제한)

| 시나리오 | 호출 횟수 | 소요 시간 | Rate Limit 위험 |
|---------|---------|---------|----------------|
| 검색만 | 2회 (ESearch + ESummary) | ~0.7초 | 없음 |
| 검색 + 배치 EFetch | 3회 (+EFetch 1회 배치) | ~1초 | 없음 |
| 검색 + iCite 병렬 | 3회 (iCite는 별도 서버) | ~1초 | 없음 |
| AI 요약 1개 | 1회 (abstract 이미 있으면 0) | ~2~3초 | 없음 |
| AI 요약 20개 | 20회 (OpenAI, NCBI 아님) | 순차 시 ~40초 | OpenAI 제한만 |
| 관련 논문 조회 | 1회 (ELink) | ~0.4초 | 없음 |
| 페이지 이동 | 1회 (ESummary, History 재사용) | ~0.4초 | 없음 |
| 전체 최악 케이스 | ~7회 (NCBI 기준) | ~2.5초 | 없음 |

> **결론**: NCBI API 키 없이도 Rate Limit 위반 없음 (설계 구조상 최대 ~7회/검색)

---

## 13. 에러 처리 전략 (완전판)

```javascript
// 모든 NCBI API 호출을 감싸는 공통 에러 처리

async function safeNCBIRequest(url, params) {
  try {
    const response = await axios.get(url, { params })

    // [에러 유형 1] Rate Limit (HTTP 200 or 429)
    if (response.data?.error?.includes('rate limit')) {
      console.warn('Rate limit hit, retrying after 2s...')
      await delay(2000)
      return safeNCBIRequest(url, params)  // 1회 재시도
    }

    // [에러 유형 2] ESearch 결과 내 에러 필드
    if (response.data?.esearchresult?.ERROR) {
      throw new Error(`PubMed 검색 오류: ${response.data.esearchresult.ERROR}`)
    }

    return response.data
  } catch (e) {
    if (e.response?.status === 429) {
      await delay(2000)
      return safeNCBIRequest(url, params)
    }
    throw e
  }
}

// PaperCard 레벨 에러 처리
async function fetchAiSummary() {
  isAiLoading.value = true
  hasError.value = false
  try {
    // abstract 없으면 먼저 가져오기
    if (!paper.abstract && paper.hasAbstract) {
      await fetchSingleAbstract(paper.id)
    }
    if (!paper.abstract) {
      throw new Error('초록 없음')
    }
    aiSummary.value = await summarizeAbstract({
      abstract: paper.abstract,
      meshTerms: paper.meshTerms,
      chemicals: paper.chemicals,
    })
  } catch (e) {
    hasError.value = true
    errorMessage.value = e.message.includes('초록')
      ? '이 논문은 초록이 제공되지 않습니다.'
      : 'AI 요약 생성에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    isAiLoading.value = false
  }
}
```

---

## 14. 환경변수 & 배포 구조 (확장)

```
.env (로컬)
  VITE_OPENAI_API_KEY=sk-proj-...      ← 필수
  VITE_NCBI_API_KEY=ABCDE12345         ← 선택 (없으면 3 r/s, 있으면 10 r/s)

.env.example
  VITE_OPENAI_API_KEY=          ← 빈값으로 예시
  VITE_NCBI_API_KEY=            ← 빈값으로 예시

Vercel 환경변수 설정 (배포 시):
  Settings → Environment Variables
  VITE_OPENAI_API_KEY → Production/Preview/Development
  VITE_NCBI_API_KEY   → 선택

⚠️ VITE_ 접두사 = 클라이언트 번들에 포함됨 (노출 가능)
  → OpenAI Usage Limit 설정 권장 ($10~$20/월 상한)
  → NCBI 키는 노출되어도 무방 (재발급 시 기존 키 무효화만)
```

---

## 15. 완전한 사용자 시나리오 워크스루

```
① 사용자 접속
   → EmptyState: "질병명·화합물명을 영어로 검색하세요"
   → QuickTags: BRCA1, 암 면역치료, Alzheimer, ...

② 한글 입력 시도: "유방암"
   → SearchBar 경고: "PubMed는 영어 검색만 지원합니다"
   → 태그 클릭 제안

③ "cancer immunotherapy" 검색
   → SkeletonCard 3개 표시
   → ESearch → 15,234건 PMID 수신 (20개 사용)
   → ESummary → 제목/저자/저널/PMC ID/hasAbstract 수신
   → PaperCard 20개 렌더링 (총 0.7초)
   → 백그라운드: 배치 EFetch (초록 + MeSH + 약물)
   → 백그라운드: iCite (인용 수)
   → TrendChart 렌더링

④ 카드에 인용 수 배지 표시 (iCite 응답 후)
   → [인용 234회] [RCR 3.2]

⑤ PMC ID 있는 논문: [📄 무료전문] 버튼 활성화
   → 클릭 시 PMC 전문 새 탭으로 이동

⑥ "🤖 AI 요약" 클릭
   → abstract 이미 있으면 즉시 OpenAI 호출
   → 없으면: EFetch(1개) → OpenAI 호출
   → MeSH 용어 컨텍스트 포함 한국어 3줄 요약
   → 키워드 태그 표시

⑦ 2페이지 이동
   → History Server 재사용 → ESummary만 호출 (ESearch 재호출 없음)
   → 새 20개 카드

⑧ 북마크 클릭
   → localStorage에 논문 저장
   → 즐겨찾기 탭 이동 → 저장된 논문 렌더링 (API 없음)
```

---

## 16. 구현 우선순위 & 확장 로드맵

| 단계 | 구현 항목 | 기술 |
|------|---------|------|
| **필수 (Day 1~2)** | ESearch + ESummary + PaperCard | usePubmed.js |
| **필수 (Day 2)** | 배치 EFetch + XML 파싱 | xmlParser.js |
| **필수 (Day 2)** | OpenAI 요약 + JSON 안전 파싱 | useOpenAI.js |
| **필수 (Day 3)** | rateLimiter.js + 에러 처리 | rateLimiter.js |
| **필수 (Day 3)** | TrendChart + 배포 | TrendChart.vue |
| **권장 확장** | iCite 인용 수 배지 | useICite.js |
| **권장 확장** | 한글 감지 안내 | SearchBar.vue |
| **권장 확장** | PMC 무료전문 링크 | PaperCard.vue |
| **선택 확장** | ELink 관련 논문 패널 | useELink.js |
| **선택 확장** | History Server 페이지네이션 | usePubmed.js |
| **선택 확장** | NCBI API 키 환경변수 | .env |
