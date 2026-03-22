# BioLens 구현 계획서 (plan.md)

> 작성일: 2026-03-21
> 기반 문서: `research.md` / `architecture.md` / `pubmed-api-research.md`
> 목표: 2~3일 내 Vercel 배포 완료

---

## 0. 사전 준비 (구현 시작 전 필수)

### 환경 확인
```
Node.js ≥ 18 설치 확인
npm 또는 pnpm 사용 결정 (권장: pnpm)
```

### API 키 준비
| 키 | 발급 방법 | 필수 여부 | key |
|----|---------|---------|-----|
| OpenAI API Key | platform.openai.com → Usage Limit $10~20 설정 | **필수** | `.env` 참조 |
| NCBI API Key | ncbi.nlm.nih.gov/account → Settings → API Key Management | 선택 (없으면 3 r/s로 동작) | `.env` 참조 |

### 프로젝트 생성
```bash
pnpm create vite biolens --template vue
cd biolens
pnpm install
pnpm add axios chart.js vue-chartjs
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 1. Day 1 — 기반 구축 + 검색 기능

### Day 1 작업 순서 (의존성 순)

```
[Step 1] 프로젝트 설정 (Tailwind, .env)
    ↓
[Step 2] utils 레이어 (rateLimiter, xmlParser, formatters)
    ↓
[Step 3] usePubmed.js (핵심 composable)
    ↓
[Step 4] UI 컴포넌트 (AppHeader, SearchBar, QuickTags, EmptyState 초기 버전)
    ↓
[Step 5] App.vue 검색 연동 + 동작 확인
```

---

### [1-1] Tailwind CSS 설정

**`tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        primary:    '#00B4D8',  // 밝은 청록 — 메인
        secondary:  '#0077B6',  // 진한 파랑 — 버튼
        accent:     '#90E0EF',  // 연한 청록 — 태그
        muted:      '#64748B',  // 회색 — 부가정보
        success:    '#10B981',  // 초록 — AI 완료
      }
    }
  },
  plugins: []
}
```

**`src/assets/main.css`** (또는 `style.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`main.js`**
```javascript
import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

createApp(App).mount('#app')
```

---

### [1-2] 환경변수 파일

**`.env`** (gitignore에 추가됨)
```
VITE_OPENAI_API_KEY=sk-proj-...
VITE_NCBI_API_KEY=                # 선택, 없으면 빈 값
```

**`.env.example`** (커밋용 템플릿)
```
VITE_OPENAI_API_KEY=your_openai_key_here
VITE_NCBI_API_KEY=your_ncbi_key_here_optional
```

> ⚠️ VITE_ 접두사 = 클라이언트 번들에 포함됨 (노출 위험)
> → OpenAI: Usage Limit 설정으로 피해 최소화
> → NCBI: 노출 시 재발급으로 기존 키 즉시 무효화 가능

---

### [1-3] `utils/rateLimiter.js`

**역할**: NCBI API 초당 요청 수를 자동으로 제어하는 큐 기반 속도 제한기

```javascript
// src/utils/rateLimiter.js

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function createRateLimiter(requestsPerSecond = 3) {
  const queue = []
  let lastCallTime = 0
  const minInterval = 1000 / requestsPerSecond

  async function processQueue() {
    if (queue.length === 0) return
    const now = Date.now()
    const wait = Math.max(0, minInterval - (now - lastCallTime))
    await delay(wait)
    const { fn, resolve, reject } = queue.shift()
    lastCallTime = Date.now()
    try {
      resolve(await fn())
    } catch (err) {
      reject(err)
    }
    processQueue()
  }

  function enqueue(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      if (queue.length === 1) processQueue()
    })
  }

  return { enqueue }
}

// NCBI API용 싱글턴 (키 유무에 따라 속도 결정)
const hasKey = !!import.meta.env.VITE_NCBI_API_KEY
export const ncbiLimiter = createRateLimiter(hasKey ? 9 : 2.5)
// 키 있음: 9 r/s (공식 10 r/s의 안전 마진)
// 키 없음: 2.5 r/s (공식 3 r/s의 안전 마진)
```

**구현 시 확인 사항**:
- `queue.length === 1`일 때만 `processQueue()` 시작 → 중복 실행 방지
- `processQueue()` 마지막에 재귀 호출 → 큐 빌 때까지 자동 처리

---

### [1-4] `utils/xmlParser.js`

**역할**: EFetch XML 응답에서 초록, MeSH 용어, 화학물질 파싱

```javascript
// src/utils/xmlParser.js

/**
 * EFetch XML 전체에서 각 논문을 파싱해 배열로 반환
 * @param {string} xmlText - EFetch 응답 XML 문자열
 * @returns {Array} [{ pmid, abstract, meshTerms, chemicals }]
 */
export function parseEFetchXML(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const articles = doc.querySelectorAll('PubmedArticle')

  return Array.from(articles).map((article) => {
    // PMID 추출
    const pmid = article.querySelector('PMID')?.textContent ?? null

    // 초록 파싱 (일반 초록 + 구조화 초록 모두 처리)
    const abstractNodes = article.querySelectorAll('AbstractText')
    const abstract = abstractNodes.length > 0
      ? Array.from(abstractNodes).map((node) => {
          const label = node.getAttribute('Label')
          return label ? `${label}: ${node.textContent}` : node.textContent
        }).join('\n\n')
      : null  // 초록 없는 논문 (Letter, Editorial 등)

    // MeSH 용어 추출
    const meshTerms = Array.from(
      article.querySelectorAll('MeshHeading DescriptorName')
    ).map((el) => el.textContent)

    // 화학물질/약물 추출
    const chemicals = Array.from(
      article.querySelectorAll('Chemical NameOfSubstance')
    ).map((el) => el.textContent)

    return { pmid, abstract, meshTerms, chemicals }
  })
}
```

**구현 시 확인 사항**:
- `abstractNodes.length > 0` 체크로 초록 없는 논문 null 처리
- `Label` 속성 존재 여부로 일반/구조화 초록 자동 분기
- 배치 EFetch 응답 = 여러 `<PubmedArticle>` → `querySelectorAll`로 전체 순회

---

### [1-5] `utils/formatters.js`

**역할**: ESummary 응답의 불규칙 데이터 정제

```javascript
// src/utils/formatters.js

/**
 * pubdate 문자열에서 연도 추출
 * "2024 Mar 15" / "2024" / "2024 Spring" 등 형식 불규칙
 */
export function parseYear(pubdate) {
  if (!pubdate) return null
  const match = pubdate.match(/\d{4}/)
  return match ? parseInt(match[0]) : null
}

/**
 * 저자 배열에서 최대 3명 이름 추출, 초과 시 "et al." 추가
 */
export function formatAuthors(authors = []) {
  if (!authors.length) return '저자 미상'
  const names = authors.slice(0, 3).map((a) => a.name)
  return authors.length > 3 ? `${names.join(', ')} et al.` : names.join(', ')
}

/**
 * 논문 제목에서 HTML 태그 제거
 * ESummary title에 <b>, <i>, <sub> 등 포함될 수 있음
 */
export function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * ESummary articleids 배열에서 특정 idtype 값 추출
 */
export function extractId(articleids = [], idtype) {
  return articleids.find((a) => a.idtype === idtype)?.value ?? null
}
```

---

### [1-6] `composables/usePubmed.js`

**역할**: ESearch → ESummary → 배치 EFetch 전체 파이프라인 + 에러 처리

```javascript
// src/composables/usePubmed.js
import { ref } from 'vue'
import axios from 'axios'
import { ncbiLimiter } from '../utils/rateLimiter.js'
import { parseEFetchXML } from '../utils/xmlParser.js'
import { parseYear, formatAuthors, stripHtml, extractId } from '../utils/formatters.js'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const API_KEY = import.meta.env.VITE_NCBI_API_KEY || undefined

// --- NCBI 요청 래퍼 (Rate Limit 이중 감지 포함) ---
async function ncbiGet(endpoint, params) {
  return ncbiLimiter.enqueue(async () => {
    const res = await axios.get(`${BASE}/${endpoint}`, {
      params: { ...params, ...(API_KEY ? { api_key: API_KEY } : {}) }
    })
    // HTTP 200이지만 에러 바디인 경우 감지 (NCBI 레거시 동작)
    if (res.data?.error) throw new Error(`NCBI Error: ${res.data.error}`)
    if (res.data?.esearchresult?.ERROR) throw new Error(res.data.esearchresult.ERROR)
    return res.data
  })
}

export function usePubmed() {
  const results = ref([])       // PaperCard 데이터 배열
  const totalCount = ref(0)     // 전체 검색 결과 수 (차트, 페이지네이션용)
  const isLoading = ref(false)
  const error = ref(null)

  async function search(query, filters = {}) {
    if (!query.trim()) return

    isLoading.value = true
    error.value = null
    results.value = []

    try {
      // ── Step 1: ESearch ──────────────────────────────────────────
      const term = buildTerm(query, filters)
      const searchData = await ncbiGet('esearch.fcgi', {
        db: 'pubmed',
        term,
        retmax: 20,
        retmode: 'json',
        sort: 'relevance'
      })

      const idlist = searchData.esearchresult?.idlist ?? []
      totalCount.value = parseInt(searchData.esearchresult?.count ?? '0')

      if (idlist.length === 0) {
        results.value = []
        return
      }

      // ── Step 2: ESummary ─────────────────────────────────────────
      const summaryData = await ncbiGet('esummary.fcgi', {
        db: 'pubmed',
        id: idlist.join(','),
        retmode: 'json'
      })

      const uids = summaryData.result?.uids ?? []
      results.value = uids.map((uid) => {
        const item = summaryData.result[uid]
        const pmcRaw = extractId(item.articleids, 'pmc')
        // PMC ID는 "PMC1234567" 형식으로 옴 — 그대로 사용
        const pmcId = pmcRaw ?? null

        return {
          pmid:         uid,
          title:        stripHtml(item.title ?? ''),
          authors:      formatAuthors(item.authors),
          journal:      item.source ?? '',
          year:         parseYear(item.pubdate),
          doi:          item.doi || extractId(item.articleids, 'doi'),
          pmcId,
          hasAbstract:  item.hasabstract === '1',
          pubtype:      item.pubtype ?? [],
          lang:         item.lang ?? [],
          // 이하 백그라운드 비동기 채움
          abstract:     null,
          meshTerms:    [],
          chemicals:    [],
          citationCount: null,
          rcr:          null,
        }
      })

      // ESummary 완료 — pmcId 있는 카드는 무료전문 버튼 즉시 활성화 (상태 이미 반영)

      // ── 백그라운드 병렬: EFetch + iCite ────────────────────────
      const pmidsWithAbstract = results.value
        .filter((p) => p.hasAbstract)
        .map((p) => p.pmid)

      // 둘 다 fire-and-forget (await 없이 병렬 시작)
      if (pmidsWithAbstract.length > 0) fetchAbstractsBatch(pmidsWithAbstract)

    } catch (err) {
      console.error(err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // 배치 EFetch — hasAbstract=true인 논문 전체를 1회 호출로 처리
  async function fetchAbstractsBatch(pmids) {
    try {
      const res = await ncbiLimiter.enqueue(() =>
        axios.get(`${BASE}/efetch.fcgi`, {
          params: {
            db: 'pubmed',
            id: pmids.join(','),
            retmode: 'xml',
            ...(API_KEY ? { api_key: API_KEY } : {})
          }
        })
      )
      const parsed = parseEFetchXML(res.data)
      parsed.forEach(({ pmid, abstract, meshTerms, chemicals }) => {
        const card = results.value.find((p) => p.pmid === pmid)
        if (card) {
          card.abstract   = abstract
          card.meshTerms  = meshTerms
          card.chemicals  = chemicals
        }
      })
    } catch (err) {
      console.warn('배치 EFetch 실패:', err.message)
      // 실패해도 카드는 렌더링됨 — AI 요약 버튼은 단건 EFetch로 fallback
    }
  }

  // 단건 EFetch fallback (배치 완료 전 AI 요약 버튼 클릭 시)
  async function fetchAbstractSingle(pmid) {
    const card = results.value.find((p) => p.pmid === pmid)
    if (!card || card.abstract !== null) return  // 이미 채워졌으면 스킵

    const res = await ncbiLimiter.enqueue(() =>
      axios.get(`${BASE}/efetch.fcgi`, {
        params: { db: 'pubmed', id: pmid, retmode: 'xml', ...(API_KEY ? { api_key: API_KEY } : {}) }
      })
    )
    const [parsed] = parseEFetchXML(res.data)
    if (parsed && card) {
      card.abstract  = parsed.abstract
      card.meshTerms = parsed.meshTerms
      card.chemicals = parsed.chemicals
    }
  }

  return { results, totalCount, isLoading, error, search, fetchAbstractSingle }
}

// ESearch term 빌더
function buildTerm(query, filters) {
  let term = `${query}[tiab]`
  if (filters.yearFrom && filters.yearTo) {
    term += ` AND ${filters.yearFrom}:${filters.yearTo}[dp]`
  }
  if (filters.pubtype) {
    term += ` AND ${filters.pubtype}[pt]`
  }
  if (filters.freeFullText) {
    term += ` AND free full text[filter]`
  }
  return term
}
```

**구현 시 확인 사항**:
- `results.value`는 반응형 배열 → 백그라운드에서 필드 채울 때 Vue가 자동 감지
- `item.doi || extractId(...)` — top-level doi 우선, 없으면 articleids fallback
- `fetchAbstractsBatch`는 fire-and-forget이므로 `isLoading`을 false로 돌려도 됨
- `card.abstract !== null` 체크로 단건 fallback 중복 요청 방지

---

### [1-7] UI 컴포넌트 (Day 1)

#### `components/AppHeader.vue`
```
표시 내용:
  - 로고 텍스트: "🔬 BioLens"
  - 슬로건: "AI 기반 신약 연구 논문 탐색기"
  - 색상: secondary (#0077B6) 배경, 흰 텍스트
```

#### `components/SearchBar.vue`
```
기능:
  - 텍스트 입력 (Enter 또는 버튼으로 검색)
  - computed hasKorean = /[\uAC00-\uD7A3]/.test(query)
  - hasKorean=true 시 경고 문구 표시:
    "PubMed는 영어 검색만 지원합니다. 예: breast cancer, BRCA1"
  - 검색 중(isLoading=true) 시 버튼 disabled + 스피너
  - emit: search(query)
```

#### `components/QuickTags.vue`
```javascript
const quickTags = [
  { en: 'BRCA1',                ko: 'BRCA1 유전자' },
  { en: 'cancer immunotherapy', ko: '암 면역치료' },
  { en: 'Alzheimer disease',    ko: '알츠하이머' },
  { en: 'COVID-19 drug',        ko: 'COVID-19 치료제' },
  { en: 'CRISPR therapy',       ko: 'CRISPR 유전자치료' },
  { en: 'PD-1 PD-L1',          ko: '면역관문억제제' },
]
// 클릭 시 en 값을 emit('search', tag.en) → 영어로 검색
// 표시: "BRCA1 (BRCA1 유전자)" 형태로 병기
```

#### `components/EmptyState.vue`
```
Props: state = 'initial' | 'empty' | 'korean'

initial: "🔬 질병명, 화합물, 유전자를 영어로 검색해보세요"
empty:   "😕 검색 결과가 없습니다. 다른 검색어를 시도해보세요."
korean:  "🇰🇷 PubMed는 영어 기반입니다. 'breast cancer'처럼 영어로 검색하세요."
```

#### `components/SkeletonCard.vue`
```
로딩 중 PaperCard 자리를 대신하는 플레이스홀더
- 제목 영역: 회색 shimmer 블록 2줄
- 저자/저널 영역: 1줄
- 버튼 영역: 2개
- animate-pulse (Tailwind) 적용
```

---

### [1-8] `App.vue` — Day 1 기본 연동

```
상태 관리:
  - usePubmed() → { results, totalCount, isLoading, error, search }
  - hasKorean computed → SearchBar에서 감지한 값 수신

렌더링 로직:
  - isLoading=true → SkeletonCard × 4
  - isLoading=false && results.length=0 && !검색한 적 없음 → EmptyState(initial)
  - isLoading=false && results.length=0 && 검색 후 → EmptyState(empty)
  - results.length>0 → PaperCard × N (Day 2에서 구현)
```

**Day 1 완료 기준**: 검색어 입력 → ESearch → ESummary → 콘솔에 results 배열 확인

---

## 2. Day 2 — 논문 카드 + AI 요약

### Day 2 작업 순서 (의존성 순)

```
[Step 1] useICite.js (PaperCard가 인용 수 표시에 사용)
    ↓
[Step 2] useOpenAI.js (PaperCard가 AI 요약에 사용)
    ↓
[Step 3] PaperCard.vue + AiSummary.vue + CitationBadge.vue
    ↓
[Step 4] EmptyState 완성 (3분기 상태 완성)
    ↓
[Step 5] App.vue에서 백그라운드 useICite 연동
```

---

### [2-1] `composables/useICite.js`

**역할**: 20개 PMID를 한 번에 iCite API에 요청해 인용 수/RCR 채우기

```javascript
// src/composables/useICite.js
import axios from 'axios'

const ICITE_URL = 'https://icite.od.nih.gov/api/pubs'

/**
 * pmids 배열로 iCite 일괄 조회 → Map<pmid, {citationCount, rcr}> 반환
 * Rate Limit 없음 — rateLimiter 불필요
 */
export async function fetchCitations(pmids = []) {
  if (pmids.length === 0) return new Map()

  try {
    const res = await axios.get(ICITE_URL, {
      params: { pmids: pmids.join(',') }
    })
    const map = new Map()
    for (const pub of res.data?.data ?? []) {
      map.set(String(pub.pmid), {
        citationCount: pub.citation_count ?? 0,
        rcr:           pub.relative_citation_ratio ?? null,
        // rcr null = 데이터 없음, 0과 구분 필요
      })
    }
    return map
  } catch (err) {
    console.warn('iCite 요청 실패:', err.message)
    return new Map()  // 실패해도 카드 렌더링에 영향 없음
  }
}
```

**App.vue에서 사용 패턴**:
```javascript
// ESummary 완료 후 바로 호출 (fire-and-forget)
const citationMap = await fetchCitations(results.value.map(p => p.pmid))
results.value.forEach(card => {
  const data = citationMap.get(card.pmid)
  if (data) {
    card.citationCount = data.citationCount
    card.rcr = data.rcr
  }
})
```

---

### [2-2] `composables/useOpenAI.js`

**역할**: 초록 + MeSH + 화학물질을 받아 GPT-4o-mini로 한국어 3줄 요약

```javascript
// src/composables/useOpenAI.js
import axios from 'axios'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const URL = 'https://api.openai.com/v1/chat/completions'

/**
 * @param {string} abstract - 영어 초록 전문
 * @param {string[]} meshTerms - MeSH 용어 목록
 * @param {string[]} chemicals - 화학물질/약물 목록
 * @returns {{ summary: string[], keywords: string[] }}
 */
export async function summarizeAbstract({ abstract, meshTerms = [], chemicals = [] }) {
  const context = []
  if (meshTerms.length)  context.push(`MeSH 용어: ${meshTerms.slice(0, 10).join(', ')}`)
  if (chemicals.length)  context.push(`주요 약물/화합물: ${chemicals.slice(0, 5).join(', ')}`)

  const systemPrompt = `당신은 신약개발 분야의 전문 연구원입니다.
논문 초록을 읽고 신약개발 연구자에게 유용한 핵심 내용을 한국어로 요약합니다.
반드시 아래 JSON 형식으로만 응답하세요:
{"summary": ["첫번째 줄", "두번째 줄", "세번째 줄"], "keywords": ["키워드1", "키워드2", "키워드3"]}`

  const userContent = [
    context.length ? context.join('\n') : '',
    `\n논문 초록:\n${abstract}`
  ].join('')

  const res = await axios.post(
    URL,
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent }
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' }
      // json_object 모드: 반드시 systemPrompt에 "JSON"이라는 단어 포함해야 함 (위 충족)
    },
    {
      headers: { Authorization: `Bearer ${API_KEY}` }
    }
  )

  return JSON.parse(res.data.choices[0].message.content)
  // response_format: json_object → JSON.parse 실패 원천 차단됨
}
```

**구현 시 확인 사항**:
- `response_format: json_object`는 system/user 메시지 중 "JSON"이라는 단어가 있어야 활성화됨 → 위 코드는 systemPrompt에 포함
- MeSH 상위 10개, 화학물질 상위 5개만 포함 (토큰 절약)
- 실패 시 호출 측에서 try/catch로 에러 처리

---

### [2-3] `components/PaperCard.vue`

**내부 상태 설계**:
```javascript
// Props: paper (results.value의 단일 항목)
const isExpanded   = ref(false)   // 초록 펼침
const isAiLoading  = ref(false)   // AI 요약 중
const aiSummary    = ref(null)    // { summary: [], keywords: [] }
const aiError      = ref(null)
```

**상태 머신 흐름**:
```
[기본] 제목, 저자, 저널, 연도, DOI 표시
  → hasAbstract=false: "AI 요약" 버튼 disabled + 회색
  → pmcId 있음: "📄 무료전문" 버튼 활성화 (ESummary에서 즉시)
  → citationCount 있음: CitationBadge 표시 (iCite 완료 후)
        ↓ [더보기 클릭]
[초록 펼침] abstract 표시 + MeSH 칩 표시
        ↓ [AI 요약 클릭]
[AI 로딩] isAiLoading=true → "⏳ 분석 중..." 버튼
  → paper.abstract 있으면: 즉시 OpenAI 호출
  → paper.abstract=null이면: fetchAbstractSingle → 완료 후 OpenAI 호출
        ↓ [성공]
[AI 완료] aiSummary = { summary, keywords } → AiSummary.vue fade-in
        ↓ [실패]
[오류] aiError = "AI 요약 생성에 실패했습니다." + 재시도 버튼
```

**AI 요약 버튼 처리 함수**:
```javascript
async function handleAiSummary() {
  if (!paper.hasAbstract || isAiLoading.value) return
  isAiLoading.value = true
  aiError.value = null
  try {
    // 배치 EFetch가 아직 미완료면 단건 fallback
    if (!paper.abstract) await fetchAbstractSingle(paper.pmid)
    aiSummary.value = await summarizeAbstract({
      abstract:  paper.abstract,
      meshTerms: paper.meshTerms,
      chemicals: paper.chemicals,
    })
  } catch (err) {
    aiError.value = err.message
  } finally {
    isAiLoading.value = false
  }
}
```

**무료 전문 링크 처리**:
```javascript
// PMC ID는 "PMC1234567" 형식으로 제공됨
const pmcUrl = computed(() =>
  paper.pmcId
    ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcId}/`
    : null
)
```

---

### [2-4] `components/AiSummary.vue`

```
Props: summary ({ summary: string[], keywords: string[] })

표시:
  - summary: 3줄을 순서 있는 목록으로
  - keywords: 태그 형태 (accent 색상 배지)
  - transition: fade-in (Vue Transition 컴포넌트)
```

---

### [2-5] `components/CitationBadge.vue`

```
Props: citationCount (number|null), rcr (number|null)

표시:
  - citationCount != null: "인용 {n}회" 배지 (secondary 색상)
  - rcr != null: "RCR {n}" 배지
    - rcr >= 2.0: green (영향력 높음)
    - rcr >= 1.0: blue (평균 이상)
    - rcr < 1.0:  gray (평균 이하)
  - null 상태 (iCite 로딩 중): 배지 숨김 (공간 차지 안 함)
```

---

**Day 2 완료 기준**: 카드 렌더링 → AI 요약 버튼 클릭 → 한국어 3줄 요약 표시 확인

---

## 3. Day 3 — 차트 + 선택 기능 + 배포

### Day 3 작업 순서

```
[Step 1] TrendChart.vue + ResultSummary.vue
    ↓
[Step 2] 반응형 레이아웃 정리 (Tailwind breakpoints)
    ↓
[Step 3] [선택] useELink.js + RelatedPanel.vue
    ↓
[Step 4] [선택] Pagination.vue
    ↓
[Step 5] README.md 작성
    ↓
[Step 6] Vercel 배포
```

---

### [3-1] `components/TrendChart.vue`

**데이터 집계 로직** (`App.vue` 또는 composable에서):
```javascript
// results.value에서 연도별 논문 수 집계
const yearCount = computed(() => {
  const counts = {}
  results.value.forEach((p) => {
    if (p.year && p.year > 2000) {
      counts[p.year] = (counts[p.year] || 0) + 1
    }
  })
  // 연도 오름차순 정렬
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a - b)
  )
})
```

**Chart.js 설정**:
```javascript
// vue-chartjs Bar 컴포넌트 사용
chartData = {
  labels: Object.keys(yearCount),
  datasets: [{
    label: '논문 수',
    data: Object.values(yearCount),
    backgroundColor: '#00B4D8',  // primary
    borderRadius: 4,
  }]
}
chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { ticks: { stepSize: 1 } } }
}
```

---

### [3-2] `components/ResultSummary.vue`

```
Props: totalCount (number), papers (PaperCard 데이터 배열)

표시:
  - "총 {totalCount}건 중 {papers.length}건 표시"
  - TrendChart 컴포넌트 (papers 전달)
  - results.length=0 시 숨김
```

---

### [3-3] 반응형 레이아웃

```
모바일 (기본):
  - 카드 1열 세로 배치
  - SearchBar 전체 너비

태블릿 이상 (md:):
  - 메인 컨텐츠 최대 너비 3xl (768px)
  - 좌우 패딩 증가

데스크탑 (lg:):
  - ResultSummary + 카드 목록 레이아웃 (차트 사이드바 또는 상단)
```

---

### [3-4] [선택] `composables/useELink.js`

**시간 여유 있을 때만 구현**

```javascript
// src/composables/useELink.js
// 용도: 관련 논문 탐색 (pubmed_pubmed linkname)

export async function fetchRelatedPapers(pmid) {
  // GET /elink.fcgi?dbfrom=pubmed&db=pubmed&id={pmid}&linkname=pubmed_pubmed&retmode=json
  // 반환: 관련 논문 PMID 배열 (상위 5개만 사용)
  // → ESummary로 제목/저자 추가 조회 → RelatedPanel에 표시
}

export async function fetchCitedByPapers(pmid) {
  // GET /elink.fcgi?dbfrom=pubmed&db=pubmed&id={pmid}&linkname=pubmed_pubmed_citedin&retmode=json
  // 반환: 이 논문을 인용한 논문 PMID 배열
}
```

> ⚠️ ELink도 NCBI API → ncbiLimiter 통과 필수

---

### [3-5] [선택] `components/Pagination.vue`

**History Server 방식** (usehistory=y 사용):

```javascript
// usePubmed.js 확장
// ESearch 시 usehistory=y 추가 → webEnv, queryKey 저장
// 페이지 이동 시: ESummary(query_key, WebEnv, retstart) + 배치EFetch
// → ESearch 재호출 불필요 (NCBI 서버에 약 1시간 유지)

async function goToPage(pageNum) {
  const retstart = (pageNum - 1) * 20
  const summaryData = await ncbiGet('esummary.fcgi', {
    db: 'pubmed',
    query_key: queryKey.value,
    WebEnv: webEnv.value,
    retstart,
    retmax: 20,
    retmode: 'json'
  })
  // results 재구성 → 배치 EFetch 재실행
}
```

```
Pagination.vue 표시:
  - "< 이전" / "다음 >" 버튼
  - "페이지 X / Y" (최대 500페이지 = 10,000건 ÷ 20)
  - 첫/마지막 페이지에서 해당 버튼 disabled
```

---

### [3-6] `README.md`

**필수 포함 내용**:
```markdown
# BioLens 🔬

AI 기반 신약 연구 논문 탐색기

## 주요 기능
- PubMed E-utilities API를 통한 논문 검색 (최대 20건/회)
- GPT-4o-mini 기반 초록 한국어 3줄 요약 (MeSH 컨텍스트 강화)
- NIH iCite API 연동으로 인용 수 / RCR(상대적 인용 지표) 표시
- PMC 무료 전문 링크 자동 감지
- 연도별 논문 트렌드 차트

## 기술 스택
Vue 3 (Composition API) + Vite / Tailwind CSS / Chart.js

## 바이브코딩 (Vibe Coding)
이 프로젝트는 Claude Code를 활용한 바이브코딩 방식으로 개발되었습니다.
AI와의 협업으로 설계부터 구현까지 진행했으며, [...]
```

> ⚠️ 바이브코딩 명시는 신테카바이오 포트폴리오 어필 포인트 — 반드시 포함

---

### [3-7] Vercel 배포

```bash
# 1. GitHub 레포 생성 후 push
git init
git add .
git commit -m "feat: initial BioLens implementation"
git remote add origin https://github.com/pic-pick/biolens
git push -u origin main

# 2. Vercel 연동
vercel.com → Import from GitHub → biolens 선택

# 3. 환경변수 설정 (Vercel 대시보드)
VITE_OPENAI_API_KEY = sk-proj-...
VITE_NCBI_API_KEY   = (있으면 입력)

# 4. 배포 확인
https://biolens.vercel.app
```

---

## 4. 구현 시 핵심 주의사항 체크리스트

### API 관련
- [ ] `ncbiLimiter.enqueue()` 안에 모든 NCBI 요청 래핑 — 직접 axios 호출 금지
- [ ] EFetch 응답 body 파싱 시 에러 감지 (`res.data?.error` 체크)
- [ ] EFetch는 XML 응답 → `axios.get` 의 `responseType` 기본값(JSON 자동 파싱) 주의
  ```javascript
  // EFetch는 XML이므로 responseType 별도 설정 불필요 (axios가 string으로 받음)
  // 단, Content-Type이 text/xml이면 res.data가 string
  ```
- [ ] iCite API는 `ncbiLimiter` 불필요 (Rate Limit 없음)

### ESummary 데이터 파싱
- [ ] `hasabstract` — 소문자 (`item.hasabstract === '1'`)
- [ ] `pmcId` — `articleids`의 `idtype:"pmc"` value값 그대로 사용 ("PMC1234567" 형태)
- [ ] `doi` — `item.doi` 우선, 없으면 `extractId(item.articleids, 'doi')`
- [ ] `pubdate` — `match(/\d{4}/)` 정규식으로 연도 추출 (`split(' ')[0]`보다 안전)
- [ ] `title` — `stripHtml()`로 HTML 태그 제거

### Vue 반응성
- [ ] `results.value` 배열 항목의 필드를 나중에 채울 때 → 초기에 `null`로 선언해야 Vue가 감지
- [ ] `card.abstract = parsed.abstract` 직접 대입 → 반응형 동작 확인
- [ ] `ref()` vs `reactive()` 선택: 배열은 `ref([])`, 단일 객체는 `reactive({})`

### OpenAI
- [ ] `response_format: { type: 'json_object' }` — system 메시지에 반드시 "JSON" 포함
- [ ] 환경변수 없을 시 (데모 환경) → 명확한 에러 메시지 표시

---

## 5. 파일 생성 순서 최종 정리

```
Day 1:
  src/utils/rateLimiter.js          ← 가장 먼저 (모든 NCBI 호출의 기반)
  src/utils/xmlParser.js
  src/utils/formatters.js
  src/composables/usePubmed.js      ← utils 완료 후
  src/components/AppHeader.vue
  src/components/SearchBar.vue
  src/components/QuickTags.vue
  src/components/SkeletonCard.vue
  src/components/EmptyState.vue
  src/App.vue                       ← 컴포넌트 완료 후 연동

Day 2:
  src/composables/useICite.js       ← PaperCard보다 먼저
  src/composables/useOpenAI.js      ← PaperCard보다 먼저
  src/components/CitationBadge.vue
  src/components/AiSummary.vue
  src/components/PaperCard.vue      ← 모든 의존성 완료 후

Day 3:
  src/components/TrendChart.vue
  src/components/ResultSummary.vue
  [선택] src/composables/useELink.js
  [선택] src/components/RelatedPanel.vue
  [선택] src/components/Pagination.vue
  README.md
  Vercel 배포
```

---

## 6. 기능 완료 판단 기준 (테스트 시나리오)

| 시나리오 | 확인 방법 | 완료 기준 |
|---------|---------|---------|
| 기본 검색 | "breast cancer" 입력 → 검색 | 카드 20개 렌더링, 제목/저자/저널 표시 |
| 한글 경고 | "유방암" 입력 | 경고 문구 표시, 결과 없음 |
| QuickTags | 태그 클릭 | 영어 검색어로 자동 검색 |
| AI 요약 | 카드 → AI 요약 클릭 | 한국어 3줄 + 키워드 3개 표시 |
| 무료 전문 | PMC ID 있는 카드 | 버튼 표시 → 클릭 시 PMC 링크 새 탭 |
| 인용 수 | 검색 후 | 카드에 인용 N회 배지 표시 |
| Rate Limit | 빠른 연속 검색 | 에러 없이 정상 동작 |
| 초록 없는 논문 | Letter/Editorial 카드 | AI 요약 버튼 disabled |
| 트렌드 차트 | 검색 결과 있을 때 | 연도별 막대 차트 표시 |
```
