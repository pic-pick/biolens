# BioLens — 신약 연구 논문 탐색기
> **Vue 3 + Vite 기반 바이브코딩 프로젝트**
> 신테카바이오 AI센터팀 지원용 포트폴리오 프로젝트
> 제작 기간: 2~3일 목표

---

## 1. 프로젝트 개요

### 왜 이 프로젝트인가
신테카바이오 AI센터팀은 DeepMatcher, NEO-ARS 같은 AI 신약개발 플랫폼의 웹 서비스를 Vue.js + Nuxt.js로 개발·유지보수하는 팀이다. 연구자들이 복잡한 바이오 데이터를 웹 화면에서 쉽게 탐색·조회할 수 있도록 만드는 것이 핵심 업무다.

BioLens는 그 방향과 정확히 맞닿아 있다. PubMed 공개 API로 신약 관련 논문을 검색하고, OpenAI API로 초록을 요약해 연구자가 빠르게 정보를 파악할 수 있게 돕는 서비스다.

### 어필 포인트 3가지
1. **Vue.js 직접 사용** — 공고 메인 스택 Vue.js로 구현. React 경험자가 Vue도 쓸 수 있다는 걸 증명
2. **바이브코딩 활용** — Cursor 또는 Claude Code로 개발, README에 명시
3. **도메인 연결** — 신테카바이오가 다루는 바이오·신약 도메인을 직접 다루는 프로젝트

### 서비스 한 줄 소개
> "질병명이나 화합물명으로 PubMed 논문을 검색하고, AI가 핵심을 요약해주는 신약 연구자용 논문 탐색 도구"

---

## 2. 기능 명세

### 2-1. 핵심 기능 (반드시 구현)

#### 🔍 논문 검색
- 검색어 입력 (질병명, 화합물명, 유전자명 등)
- PubMed E-utilities API 연동 (API 키 불필요, 무료)
- 검색 결과 최대 20건 카드 형태로 표시
- 로딩 스켈레톤 UI

#### 📄 논문 카드
각 카드에 표시할 정보:
- 논문 제목
- 저자 (최대 3명 + et al.)
- 저널명
- 발행 연도
- 초록 일부 (100자 미리보기)
- PubMed 링크 (외부 이동)
- "AI 요약" 버튼

#### 🤖 AI 초록 요약
- "AI 요약" 버튼 클릭 시 OpenAI API 호출
- 영어 초록 → 한국어 3줄 요약
- 핵심 키워드 3개 추출 (태그 형태로 표시)
- 요약 결과는 카드 하단에 펼쳐서 표시
- 로딩 중 애니메이션

#### 📊 트렌드 차트
- 검색 결과의 연도별 논문 수 막대 차트
- Chart.js 또는 Vue-chartjs 사용
- 최근 10년 기준

### 2-2. 추가 기능 (시간 되면 구현)

#### 🔖 즐겨찾기
- 논문 북마크 기능
- localStorage에 저장
- 즐겨찾기 탭에서 모아보기

#### 🏷️ 카테고리 필터
- 검색 결과 연도 범위 필터 (슬라이더)
- 저널명 필터

---

## 3. 화면 구성 (UI 설계)

### 레이아웃 구조
```
┌─────────────────────────────────────┐
│           Header / 로고              │
│         BioLens 로고 + 슬로건          │
├─────────────────────────────────────┤
│          검색 바 (중앙 배치)            │
│   [ 검색어 입력          ] [검색  ]     │
│   빠른 검색 예시 태그들                  │
├──────────────────┬──────────────────┤
│  결과 요약 패널      │  논문 카드 목록      │
│  - 총 검색 수       │  ┌────────────┐  │
│  - 연도별 차트      │  │ 카드 1      │  │
│                  │  │ 제목        │  │
│                  │  │ 저자 · 연도  │  │
│                  │  │ 초록 미리보기│   │
│                  │  │ [AI 요약]   │  │
│                  │  └────────────┘  │
│                  │  ┌────────────┐  │
│                  │  │ 카드 2      │  │
│                  │  └────────────┘  │
└──────────────────┴──────────────────┘
```

### 색상 팔레트
신테카바이오 사이트 컬러 기준으로 맞춤:
```
Primary:   #00B4D8  (밝은 청록 — 바이오/과학 느낌)
Secondary: #0077B6  (진한 파랑)
Accent:    #90E0EF  (연한 청록)
BG:        #F8FAFC  (거의 흰색)
Text:      #1E293B  (진한 남색)
Muted:     #64748B  (회색)
Success:   #10B981  (초록 — AI 요약 완료)
```

### AI 요약 카드 상태
```
[기본 상태]
제목: BRCA1 mutations in breast cancer patients...
저자: Kim J, Park S, et al. · Nature · 2024
초록: The study investigated the relationship...
                         [🤖 AI 요약 보기]

[로딩 상태]
                         [⏳ 분석 중...]

[완료 상태]
제목: BRCA1 mutations in breast cancer patients...
저자: Kim J, Park S, et al. · Nature · 2024
초록: The study investigated the relationship...
─────────────────────────────────────
🤖 AI 요약
• BRCA1 돌연변이가 유방암 환자 예후에 미치는 영향 분석
• 3,200명 환자 코호트에서 특정 변이 패턴이 치료 반응성과 연관
• PARP 억제제 치료 효과 예측을 위한 바이오마커 가능성 제시

🏷️ #BRCA1  #유방암  #PARP억제제
─────────────────────────────────────
```

---

## 4. 기술 스택

```
프레임워크:  Vue 3 (Composition API)
빌드 도구:   Vite
스타일링:    Tailwind CSS (CDN 방식 or npm)
HTTP:       Axios
차트:        Chart.js + vue-chartjs
API:
  - PubMed E-utilities (무료, 키 불필요)
  - OpenAI API (GPT-4o-mini, 저렴)
배포:        Vercel
버전관리:    GitHub
개발 도구:   Cursor (바이브코딩)
```

---

## 5. 프로젝트 디렉토리 구조

```
biolens/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── AppHeader.vue        # 로고, 네비게이션
│   │   ├── SearchBar.vue        # 검색 입력 + 버튼
│   │   ├── QuickTags.vue        # 빠른 검색 태그
│   │   ├── ResultSummary.vue    # 총 결과 수, 차트 패널
│   │   ├── TrendChart.vue       # 연도별 막대 차트
│   │   ├── PaperCard.vue        # 논문 카드 (핵심)
│   │   ├── AiSummary.vue        # AI 요약 결과 영역
│   │   ├── SkeletonCard.vue     # 로딩 스켈레톤
│   │   └── EmptyState.vue       # 검색 결과 없음
│   ├── composables/
│   │   ├── usePubmed.js         # PubMed API 호출 로직
│   │   └── useOpenAI.js         # OpenAI API 호출 로직
│   ├── utils/
│   │   └── formatters.js        # 날짜, 저자명 포맷 함수
│   ├── App.vue
│   └── main.js
├── .env                         # API 키 환경변수
├── .env.example
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 6. API 명세

### 6-1. PubMed E-utilities API (무료)

**검색 (ESearch)**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi

파라미터:
  db=pubmed
  term={검색어}[Title/Abstract]
  retmax=20          (최대 결과 수)
  retmode=json
  sort=relevance

응답: { esearchresult: { idlist: ["39123456", "38987654", ...] } }
```

**상세 정보 가져오기 (ESummary)**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi

파라미터:
  db=pubmed
  id={id1,id2,id3,...}  (comma-separated)
  retmode=json

응답:
  result[id].title      논문 제목
  result[id].authors    저자 배열
  result[id].source     저널명
  result[id].pubdate    발행일
  result[id].uid        PubMed ID
```

**초록 가져오기 (EFetch)**
```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi

파라미터:
  db=pubmed
  id={pmid}
  rettype=abstract
  retmode=xml          (XML로 파싱 필요)
```

> ⚠️ 주의: API 요청 속도 제한 — 초당 3회 이하 권장 (키 없는 경우)

### 6-2. OpenAI API

**초록 요약 프롬프트**
```javascript
const prompt = `
당신은 신약개발 분야 전문 연구자입니다.
아래 영어 논문 초록을 분석해서 다음 형식으로 응답해주세요.

[초록]
${abstract}

응답 형식 (JSON):
{
  "summary": [
    "핵심 내용 1 (한국어, 1~2문장)",
    "핵심 내용 2 (한국어, 1~2문장)",
    "핵심 내용 3 (한국어, 1~2문장)"
  ],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`

// 모델: gpt-4o-mini (저렴, 충분히 빠름)
// max_tokens: 500
```

---

## 7. 컴포넌트 상세 명세

### PaperCard.vue (핵심 컴포넌트)
```vue
Props:
  paper: {
    id: String,          // PubMed ID
    title: String,       // 논문 제목
    authors: Array,      // 저자 배열
    journal: String,     // 저널명
    year: Number,        // 발행 연도
    abstract: String,    // 초록 전문
  }

State:
  isExpanded: Boolean    // 초록 펼침 여부
  isLoading: Boolean     // AI 요약 로딩
  aiSummary: Object      // { summary: [], keywords: [] }
  hasError: Boolean      // API 오류 여부

Methods:
  fetchAiSummary()       // OpenAI API 호출
  toggleExpand()         // 초록 펼침/접기
  openPubMed()           // PubMed 링크 열기
```

### usePubmed.js
```javascript
export function usePubmed() {
  const results = ref([])
  const isLoading = ref(false)
  const totalCount = ref(0)
  const error = ref(null)

  async function search(query) {
    // 1. ESearch로 ID 목록 가져오기
    // 2. ESummary로 메타데이터 가져오기
    // 3. 결과 가공해서 results에 저장
  }

  return { results, isLoading, totalCount, error, search }
}
```

### useOpenAI.js
```javascript
export function useOpenAI() {
  async function summarizeAbstract(abstract) {
    // OpenAI API 호출
    // JSON 파싱
    // { summary: [], keywords: [] } 반환
  }

  return { summarizeAbstract }
}
```

---

## 8. 개발 순서 (Day-by-Day)

### Day 1 — 기반 구축 + 검색 기능
```
[ ] 1. Vite + Vue 3 프로젝트 생성
        npm create vite@latest biolens -- --template vue
        cd biolens && npm install

[ ] 2. Tailwind CSS 설치 및 설정
        npm install -D tailwindcss postcss autoprefixer
        npx tailwindcss init -p

[ ] 3. Axios 설치
        npm install axios

[ ] 4. .env 파일 생성
        VITE_OPENAI_API_KEY=sk-...

[ ] 5. AppHeader.vue 작성
        - 로고 (BioLens 텍스트 로고)
        - 서브타이틀: "AI 기반 신약 연구 논문 탐색기"

[ ] 6. SearchBar.vue 작성
        - 입력창 + 검색 버튼
        - Enter 키 이벤트 처리
        - 검색어 유효성 검사

[ ] 7. QuickTags.vue 작성
        빠른 검색 예시:
        "BRCA1" / "COVID-19 drug" / "Alzheimer" / "cancer immunotherapy"

[ ] 8. usePubmed.js 작성
        - ESearch API 연동
        - ESummary API 연동
        - 에러 처리

[ ] 9. App.vue에서 검색 연동
        - 검색어 → usePubmed.search() 호출
        - 결과를 결과 목록으로 전달
```

### Day 2 — 논문 카드 + AI 요약
```
[ ] 10. SkeletonCard.vue 작성
         - 로딩 중 회색 플레이스홀더 카드 3~4개

[ ] 11. PaperCard.vue 작성
         - 논문 메타데이터 표시
         - 초록 100자 미리보기 + "더보기" 토글
         - PubMed 링크 버튼
         - "🤖 AI 요약" 버튼

[ ] 12. useOpenAI.js 작성
         - OpenAI API 호출
         - 프롬프트 설계
         - JSON 파싱 + 에러 처리

[ ] 13. AiSummary.vue 작성
         - 요약 3줄 표시
         - 키워드 태그 표시
         - 애니메이션 (fade-in)

[ ] 14. EmptyState.vue 작성
         - 검색 전 초기 화면
         - 검색 결과 없을 때 화면

[ ] 15. EFetch API 연동 (초록 가져오기)
         - XML 파싱 로직 추가
         - 초록이 없는 논문 처리
```

### Day 3 — 차트 + 마무리 + 배포
```
[ ] 16. TrendChart.vue 작성
         - Chart.js 설치: npm install chart.js vue-chartjs
         - 연도별 논문 수 집계 로직
         - 막대 차트 렌더링

[ ] 17. ResultSummary.vue 작성
         - 총 검색 결과 수
         - TrendChart 포함

[ ] 18. 반응형 레이아웃 정리
         - 모바일 대응 (Tailwind breakpoints)
         - 카드 그리드 조정

[ ] 19. README.md 작성 (중요!)
         - 프로젝트 소개
         - 바이브코딩(Cursor) 활용 명시
         - 기술 스택
         - 로컬 실행 방법

[ ] 20. Vercel 배포
         - GitHub 연동
         - 환경변수 설정 (VITE_OPENAI_API_KEY)
         - 배포 URL 확인

[ ] 21. 포트폴리오에 추가
         - 포트폴리오 사이트에 BioLens 프로젝트 추가
         - 배포 URL + GitHub 링크
```

---

## 9. 주요 코드 스니펫

### PubMed 검색 API 호출
```javascript
// usePubmed.js
import axios from 'axios'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

export function usePubmed() {
  const results = ref([])
  const isLoading = ref(false)
  const totalCount = ref(0)
  const error = ref(null)

  async function search(query) {
    if (!query.trim()) return
    isLoading.value = true
    error.value = null
    results.value = []

    try {
      // Step 1: ID 목록 검색
      const searchRes = await axios.get(`${BASE_URL}/esearch.fcgi`, {
        params: {
          db: 'pubmed',
          term: `${query}[Title/Abstract]`,
          retmax: 20,
          retmode: 'json',
          sort: 'relevance'
        }
      })
      const ids = searchRes.data.esearchresult.idlist
      totalCount.value = parseInt(searchRes.data.esearchresult.count)

      if (ids.length === 0) return

      // Step 2: 메타데이터 가져오기
      const summaryRes = await axios.get(`${BASE_URL}/esummary.fcgi`, {
        params: {
          db: 'pubmed',
          id: ids.join(','),
          retmode: 'json'
        }
      })

      // Step 3: 데이터 가공
      results.value = ids.map(id => {
        const item = summaryRes.data.result[id]
        return {
          id,
          title: item.title,
          authors: item.authors?.slice(0, 3).map(a => a.name) ?? [],
          journal: item.source,
          year: parseInt(item.pubdate?.split(' ')[0]) || 0,
          abstract: ''  // EFetch로 별도 요청
        }
      })
    } catch (e) {
      error.value = '검색 중 오류가 발생했습니다.'
    } finally {
      isLoading.value = false
    }
  }

  return { results, isLoading, totalCount, error, search }
}
```

### OpenAI 초록 요약
```javascript
// useOpenAI.js
import axios from 'axios'

export function useOpenAI() {
  async function summarizeAbstract(abstract) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `당신은 신약개발 분야 연구자입니다. 아래 영어 논문 초록을 분석해 JSON으로 응답하세요.

초록: ${abstract}

응답 형식:
{
  "summary": ["핵심 내용 1", "핵심 내용 2", "핵심 내용 3"],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}

규칙: 반드시 JSON만 응답, 한국어로 요약`
        }],
        max_tokens: 500,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const content = response.data.choices[0].message.content
    return JSON.parse(content)
  }

  return { summarizeAbstract }
}
```

### 연도별 차트 데이터 집계
```javascript
// TrendChart.vue 내부
function buildChartData(papers) {
  const yearCount = {}
  papers.forEach(p => {
    if (p.year > 2000) {
      yearCount[p.year] = (yearCount[p.year] || 0) + 1
    }
  })
  const labels = Object.keys(yearCount).sort()
  const data = labels.map(y => yearCount[y])
  return { labels, data }
}
```

---

## 10. README.md 초안

```markdown
# BioLens 🔬
> AI 기반 신약 연구 논문 탐색기

질병명·화합물명으로 PubMed 논문을 검색하고,
AI가 영어 초록을 한국어 3줄로 요약해주는 연구자용 도구입니다.

## 🔗 링크
- **배포 사이트**: https://biolens.vercel.app
- **GitHub**: https://github.com/pic-pick/biolens

## ⚡ 기술 스택
- **Frontend**: Vue 3, Vite, Tailwind CSS
- **API**: PubMed E-utilities, OpenAI API (gpt-4o-mini)
- **차트**: Chart.js + vue-chartjs
- **배포**: Vercel

## 🤖 개발 방식
이 프로젝트는 **바이브코딩(Vibe Coding)** 방식으로 개발했습니다.
Cursor AI를 활용해 컴포넌트 구조 설계와 API 연동 로직을 작성하고,
직접 수정·검증하며 완성했습니다.

## 🚀 로컬 실행
git clone https://github.com/pic-pick/biolens
cd biolens
npm install
cp .env.example .env  # VITE_OPENAI_API_KEY 입력
npm run dev

## 📌 주요 기능
- PubMed 논문 검색 (최대 20건)
- AI 초록 요약 (한국어 3줄 + 키워드)
- 연도별 논문 트렌드 차트
- 빠른 검색 태그 (BRCA1, Alzheimer 등)
```

---

## 11. 포트폴리오 등록 시 설명 문구

```
BioLens — 신약 연구 논문 탐색기 (2026.03)

PubMed 공개 API와 OpenAI API를 연동해 신약 관련 논문을 검색하고
AI가 영어 초록을 한국어로 요약해주는 웹 서비스입니다.
Vue 3 + Vite 기반으로 바이브코딩(claud code) 방식으로 개발했습니다.

Tech: Vue 3 · Vite · Tailwind CSS · OpenAI API · PubMed API · Chart.js
```

---

## 12. 신테카바이오 자소서 연결 문구 (항목 1 추가)

기존 항목 1 마지막 문단에 아래 내용 추가:

> "최근에는 바이브코딩 방식에도 관심을 갖고 직접 시도해봤습니다. PubMed API와 OpenAI API를 연동해 신약 연구자용 논문 탐색 서비스 BioLens를 Vue 3로 개발했고, Cursor를 활용해 컴포넌트 구조와 API 로직을 빠르게 구성하면서 AI 도구를 개발 흐름에 녹이는 방식을 직접 경험했습니다."

---
