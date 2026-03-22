# BioLens — AI 기반 신약 연구 논문 탐색기

> PubMed 공개 API로 신약 관련 논문을 검색하고, OpenAI API로 영어 초록을 한국어 3줄로 요약해주는 연구자용 웹 서비스

<br>

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [주요 기능](#2-주요-기능)
3. [기술 스택](#3-기술-스택)
4. [시작하기](#4-시작하기)
5. [바이브 코딩 개발 과정](#5-바이브-코딩-개발-과정)
6. [폴더 구조](#6-폴더-구조)
7. [API 명세](#7-api-명세)
8. [환경변수 목록](#8-환경변수-목록)
9. [트러블슈팅 / 문제 해결 기록](#9-트러블슈팅--문제-해결-기록)
10. [성능 최적화](#10-성능-최적화)
11. [회고 및 개선 계획](#11-회고-및-개선-계획)

<br>

---

## 1. 프로젝트 소개

**BioLens**는 질병명·화합물명을 영어로 검색하면 PubMed 논문을 찾아주고, GPT-4o-mini가 영어 초록을 한국어 3줄로 요약해주는 신약 연구자용 논문 탐색 도구입니다.

바이오·신약 도메인의 연구 데이터를 웹 화면에서 효율적으로 탐색·조회할 수 있도록 설계했으며, 단순 검색을 넘어 다중 논문 종합 분석, 논문 비교표, 인용 네트워크 그래프까지 제공합니다.

| 항목 | 내용 |
|---|---|
| 개발 방식 | 바이브코딩 (Claude Code) |
| 개발 기간 | 약 2~3일 |
| 배포 | Vercel |

<br>

## 2. 주요 기능

### 논문 검색

PubMed E-utilities API를 활용하여 최대 20건씩 논문을 검색하며, 무한 스크롤로 추가 결과를 자동 로드합니다. 연도 범위, 논문 유형, 무료 전문 여부 등의 필터를 제공하고, 한글 입력 시 영어 검색 안내를 자동으로 표시합니다.

### AI 초록 요약 및 번역

GPT-4o-mini를 활용하여 영어 논문 초록을 한국어 3줄로 요약하고 핵심 키워드 3개를 추출합니다. MeSH 의학 용어와 화학물질 정보를 프롬프트에 함께 전달하여 요약 품질을 높였으며, 초록 전문 한국어 번역 기능도 제공합니다.

### AI 관련 검색어 추천

검색어를 기반으로 GPT-4o-mini가 MeSH 용어, 동의어, 세부 주제를 포함한 5개의 관련 PubMed 검색 키워드를 추천합니다.

### 다중 논문 종합 분석 (Synthesis)

최대 5편의 논문을 선택하여 공통 연구 결과, 상충되는 결과, 미해결 연구 갭, 종합 결론을 AI로 분석합니다.

### 논문 비교표 (Compare)

선택된 논문들의 연구 설계, 대상, 방법론, 주요 결과, 한계점, 근거 수준을 열 기반 표로 한눈에 비교합니다.

### 연구 동향 차트

검색어 기준 2000년부터 현재까지의 연도별 논문 수를 막대 차트로 시각화합니다. 차트의 특정 연도를 클릭하면 해당 연도로 필터링됩니다.

### 논문 스크랩 및 프로젝트 분류

관심 논문을 북마크하여 Saved 탭에서 관리하고, 주제별 프로젝트(폴더)로 분류할 수 있습니다. localStorage 기반으로 동작합니다.

### 논문 인용 네트워크 그래프

Semantic Scholar API와 iCite API를 결합하여 선택한 논문의 선행 연구(references)와 후속 연구(citations)를 인터랙티브 네트워크 그래프로 시각화합니다.

### 인용 수 표시

NIH iCite API를 통해 각 논문의 인용 수(Citation Count)와 상대적 인용 지표(RCR)를 카드에 배지로 표시합니다.

<br>

## 3. 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Vue 3 (Composition API) |
| 빌드 도구 | Vite |
| 스타일링 | Tailwind CSS |
| HTTP 클라이언트 | Axios |
| 차트 | Chart.js + vue-chartjs |
| 네트워크 그래프 | vis-network |
| 외부 API | PubMed E-utilities (NCBI, 무료), OpenAI API (gpt-4o-mini), iCite API (NIH, 무료), Semantic Scholar API |
| 배포 | Vercel |
| 개발 도구 | Claude Code (바이브코딩) |

<br>

## 4. 시작하기

### 사전 요구사항

- Node.js 18 이상
- OpenAI API Key ([platform.openai.com](https://platform.openai.com))

### 설치 및 실행

```bash
git clone https://github.com/pic-pick/biolens.git
cd biolens
npm install
cp .env.example .env   # VITE_OPENAI_API_KEY 입력
npm run dev
```

### 빌드

```bash
npm run build
npm run preview
```

<br>

## 5. 바이브 코딩 개발 과정

> 이 프로젝트의 핵심 차별점은 **"기획과 코딩의 완전한 분리"** 입니다.
> 작성된 계획을 직접 검토하고 승인하기 전까지 Claude에게 코드를 작성하지 않도록 하여,
> **삽질 제거 · 주도권 확보 · 토큰 절약 · 결과물 품질 향상** 네 가지 효과를 달성했습니다.

### 사용한 AI 툴

**Claude** (Claude Code)

### AI와의 협업 방식 — "기획-코딩 분리 사이클"

```
[Research] → [Plan] → [Build]
   │            │         │
   │  마크다운    │  마크다운  │  기능 단위 개발
   │  핑퐁으로    │  핑퐁으로  │  Plan 승인 후
   │  아이디어    │  기술 명세 │  코드 작성 시작
   │  확장       │  확정     │
   ▼            ▼         ▼
research.md  plan.md    소스 코드
             architecture.md
```

### 단계 1: Research (아이디어 설계)

프로젝트의 배경과 기획 내용을 Claude에게 전달하고, 깊이 이해한 내용과 아이디어, 개선사항까지 함께 `research.md` 보고서로 작성하도록 했습니다. 이 보고서를 기반으로 마크다운 핑퐁을 통해 아이디어를 확장했습니다.

- **산출물**: `research.md` (프로젝트 정체성, 기술 스택 선택 근거, PubMed API 제약사항 분석)
- 별도로 `pubmed-api-research.md`를 작성하여 Rate Limit, 검색 결과 수 제한, 한국어 검색 불가 여부 등을 **코드 작성 전에** 사전 확인

### 단계 2: Plan (개발 명세 확정)

마찬가지로 마크다운 핑퐁 방식으로 진행했으며, 개발 기술에 대한 명확한 명세를 정하고 개발 단계를 계획했습니다. 특히 **API 사용 제한사항을 철저히 검토**하고, 구조적 구현 범위를 확실하게 잡아서 이후 응답 딜레이나 API 오류가 발생하지 않도록 제약 조건과 접근 방식을 설정했습니다.

- **산출물**: `plan.md` (Day-by-Day 구현 계획, 컴포넌트별 상세 명세, Rate Limiter 설계), `architecture.md` (전체 아키텍처, API 플로우 시퀀스 다이어그램)
- 예시: PubMed API의 "초당 3회 제한"을 사전에 파악하여 `rateLimiter.js`를 큐 기반으로 설계하고, EFetch 배치 요청(20회 → 1회) 전략을 코드 작성 전에 확정

### 단계 3: Build (기능 단위 개발)

Plan 승인 후 기능 단위로 개발을 진행했습니다.

```
메인 기능 (백엔드 + 프론트) → 디테일 API 구현 + 프론트 추가 (사이클) → UI 디테일업
```

무료 API의 제약(retmax=20, 초당 1~3회 호출)이 많았기 때문에, 데이터 로딩 딜레이를 시각적으로 줄이는 UI 설계에 특별히 신경을 썼습니다. 예를 들어, 연도별 Research Trend 차트는 순차적으로 데이터를 불러오면서 로딩 애니메이션을 표시하고, 스켈레톤 카드로 로딩 대기 시간의 체감을 줄였습니다.

### 주요 프롬프트 전략

| 전략 | 설명 |
|---|---|
| 코드 작성 차단 | "코드를 작성하지 말고, 먼저 ○○.md 보고서를 작성해" — 기획 단계에서 코드 생성을 원천 차단 |
| 마크다운 주석 정정 | 잘못된 방향은 마크다운 파일 내 주석으로 정정 처리하며 Plan 업데이트 사이클을 반복 |
| 범위 한정 지시 | "이 plan.md의 Step 3만 구현해" — 기능 단위로 범위를 좁혀 정확한 결과물 확보 |

### 개발 소요 시간

약 **2~3일** (기획 문서 작성 포함)

### 바이브 코딩을 통해 느낀 점

- 기획과 코딩을 분리하면 AI의 불필요한 시행착오를 원천적으로 방지할 수 있었습니다.
- 마크다운 핑퐁 방식은 토큰 절약과 맥락 유지에 효과적이었습니다.
- API 제약사항을 사전에 리서치하도록 지시하면 구현 단계에서의 예상치 못한 오류가 크게 줄었습니다.
- "AI가 주도"하는 것이 아니라 **"내가 기획을 주도하고 AI가 실행"** 하는 구조가 결과물 품질에 직접적인 영향을 미쳤습니다.

<br>

## 6. 폴더 구조

```
biolens/
├── public/                         # 정적 에셋 (favicon 등)
├── src/
│   ├── assets/                     # 이미지 에셋 (hero.png, 로고 SVG)
│   ├── components/
│   │   ├── AppHeader.vue           # 상단 헤더 (로고 + 인라인 검색바)
│   │   ├── SearchBar.vue           # 검색 입력 + 한글 감지 안내
│   │   ├── QuickTags.vue           # 빠른 검색 태그 (BRCA1, Alzheimer 등)
│   │   ├── QuerySuggestions.vue    # AI 기반 관련 검색어 추천
│   │   ├── Sidebar.vue             # 좌측 사이드바 (검색 이력, 필터)
│   │   ├── FilterBar.vue           # 연도·논문유형·무료전문 필터
│   │   ├── PaperCard.vue           # 논문 카드 (핵심 컴포넌트)
│   │   ├── AiSummary.vue           # AI 초록 요약 + 번역 결과 영역
│   │   ├── CitationBadge.vue       # 인용 수 배지 (iCite)
│   │   ├── SkeletonCard.vue        # 로딩 스켈레톤
│   │   ├── EmptyState.vue          # 초기 / 검색 결과 없음 화면
│   │   ├── TrendChart.vue          # 연도별 논문 수 막대 차트 (Chart.js)
│   │   ├── ResultSummary.vue       # 결과 요약 패널
│   │   ├── ScrapBoard.vue          # 스크랩 보드 (북마크 관리)
│   │   ├── ScrapPaperCard.vue      # 스크랩된 논문 카드
│   │   ├── SynthesisPanel.vue      # 다중 논문 AI 종합 분석 패널
│   │   ├── ComparisonPanel.vue     # 논문 비교표 패널
│   │   ├── NetworkGraph.vue        # 논문 인용 네트워크 그래프 (vis-network)
│   │   ├── NetworkNodeDetail.vue   # 네트워크 노드 상세 정보
│   │   ├── ProjectCreateModal.vue  # 프로젝트(폴더) 생성 모달
│   │   ├── SettingsModal.vue       # 설정 모달
│   │   └── AboutPage.vue           # About 페이지
│   ├── composables/
│   │   ├── usePubmed.js            # PubMed API (ESearch + ESummary + EFetch)
│   │   ├── useOpenAI.js            # OpenAI API (요약, 번역, 검색어 추천, 종합 분석)
│   │   ├── useICite.js             # NIH iCite API (인용 수 조회)
│   │   ├── useSemanticScholar.js   # Semantic Scholar API (인용 네트워크)
│   │   ├── useNetwork.js           # 네트워크 그래프 데이터 구성
│   │   ├── useScrap.js             # 스크랩(북마크) 관리 (localStorage)
│   │   ├── useProjects.js          # 프로젝트·폴더 분류 관리
│   │   ├── useSearchHistory.js     # 검색 이력 관리
│   │   ├── useTrending.js          # 트렌딩 키워드
│   │   └── useTilt.js              # 카드 틸트 애니메이션 효과
│   ├── utils/
│   │   ├── rateLimiter.js          # 큐 기반 API 속도 제한기
│   │   ├── xmlParser.js            # EFetch XML 파싱 (초록/MeSH/화학물질)
│   │   └── formatters.js           # 날짜·저자명·HTML 포맷 유틸
│   ├── App.vue                     # 루트 컴포넌트 (탭 관리, 상태 허브)
│   ├── main.js                     # 앱 진입점
│   └── style.css                   # 글로벌 스타일 (Tailwind + 커스텀)
├── .env.example                    # 환경변수 템플릿
├── index.html                      # Vite 진입 HTML
├── vite.config.js                  # Vite 빌드 설정
├── tailwind.config.js              # Tailwind CSS 커스텀 설정
├── postcss.config.js               # PostCSS 설정
├── package.json                    # 의존성 및 스크립트
│
├── research.md                     # [바이브코딩] 리서치 보고서
├── pubmed-api-research.md          # [바이브코딩] PubMed API 상세 조사 보고서
├── architecture.md                 # [바이브코딩] 서비스 동작 구조 설계서
├── plan.md                         # [바이브코딩] 구현 계획서
├── feature-report.md               # [바이브코딩] 신규 기능 구현 보고서
└── ui-implementation-report.md     # [바이브코딩] UI 구현 상세 보고서
```

<br>

## 7. API 명세

### 7-1. PubMed E-utilities API (NCBI 제공, 무료)

| 엔드포인트 | 용도 | 메서드 |
|---|---|---|
| `/esearch.fcgi` | 검색어로 논문 PMID 목록 조회 | GET |
| `/esummary.fcgi` | PMID로 논문 메타데이터 배치 조회 | GET |
| `/efetch.fcgi` | PMID로 초록·MeSH·화학물질 배치 조회 (XML) | GET |

**ESearch 요청 예시**

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term=cancer+immunotherapy[tiab]+AND+2020:2024[dp]
  &retmax=20
  &retstart=0
  &retmode=json
  &sort=relevance
  &api_key={NCBI_API_KEY}       ← 선택

응답: { esearchresult: { count: "15234", idlist: ["39123456", ...] } }
```

**ESummary 응답 주요 필드**: title, authors[], source(저널명), pubdate, doi, articleids[], pubtype[], attributes[]

**EFetch 응답**: XML 형식으로 초록(AbstractText), MeSH 용어(MeshHeading), 화학물질(Chemical) 제공

**인증 방식**: API 키 선택 사항 — 없으면 3 req/sec, 있으면 10 req/sec

**Rate Limit 제한**: API 키 없이 초당 3회, API 키 사용 시 초당 10회

### 7-2. OpenAI API

| 엔드포인트 | 용도 | 모델 |
|---|---|---|
| `POST /v1/chat/completions` | 초록 AI 요약 (한국어 3줄 + 키워드 3개) | gpt-4o-mini |
| `POST /v1/chat/completions` | 초록 한국어 번역 | gpt-4o-mini |
| `POST /v1/chat/completions` | AI 관련 검색어 추천 (5개) | gpt-4o-mini |
| `POST /v1/chat/completions` | 다중 논문 종합 분석 (Synthesis) | gpt-4o-mini |

**인증 방식**: `Authorization: Bearer {OPENAI_API_KEY}` 헤더

**공통 설정**: `response_format: { type: "json_object" }`으로 JSON 파싱 오류 원천 차단, `temperature: 0.2~0.3`

### 7-3. NIH iCite API (무료, Rate Limit 없음)

```
GET https://icite.od.nih.gov/api/pubs?pmids=39123456,38987654,...

응답: { data: [{ pmid, citation_count, relative_citation_ratio }] }
```

인용 수(Citation Count)와 상대적 인용 지표(RCR)를 제공합니다.

### 7-4. Semantic Scholar API (논문 네트워크용)

```
GET https://api.semanticscholar.org/graph/v1/paper/PMID:{pmid}
  ?fields=paperId,references.title,...,citations.title,...
  &limit=25

인증: x-api-key 헤더 (선택, 없으면 100 req/5min)
```

선행 연구(references)와 후속 연구(citations) 데이터를 제공하며, 24시간 localStorage 캐시를 적용하여 반복 요청을 방지합니다.

<br>

## 8. 환경변수 목록

| 키 | 필수 여부 | 용도 | 예시값 |
|---|---|---|---|
| `VITE_OPENAI_API_KEY` | **필수** | OpenAI API 인증 (초록 요약, 번역, 종합 분석) | `sk-proj-xxxx...` |
| `VITE_NCBI_API_KEY` | 선택 | PubMed API 속도 향상 (3 → 10 req/sec) | `abcde12345` |
| `VITE_SEMANTIC_SCHOLAR_KEY` | 선택 | Semantic Scholar 네트워크 그래프 속도 향상 | `s2-api-xxxx...` |

> `VITE_` 접두사가 붙은 환경변수는 Vite 빌드 시 클라이언트 번들에 포함됩니다.
> OpenAI는 [Usage Limit](https://platform.openai.com/settings/organization/limits) 설정으로 비용을 제한하고,
> NCBI 키는 노출 시 재발급으로 기존 키를 즉시 무효화할 수 있습니다.

<br>

## 9. 트러블슈팅 / 문제 해결 기록

### PubMed API Rate Limit 초과 (초당 3회 제한)

- **상황**: 논문 20개의 초록을 개별 EFetch로 요청하면 20회 API 호출이 발생하여 초당 3회 제한을 위반하고, 순차 처리 시 최소 6.7초 이상 소요
- **해결**: 큐 기반 `rateLimiter.js`를 구현하여 모든 NCBI 요청의 속도를 자동 제어하고, 개별 EFetch 20회를 배치 EFetch 1회로 전환하여 API 호출 횟수를 95% 절감
- **선택 이유**: 단순 `delay()` 삽입보다 큐 기반 접근이 동시성 문제를 안전하게 처리하며, 배치 요청이 UX와 효율 모두에서 효과적

### NCBI Rate Limit 에러가 HTTP 200으로 반환되는 문제

- **상황**: Rate Limit 초과 시 HTTP 429가 아닌 HTTP 200과 함께 JSON 에러 바디(`{ "error": "API rate limit exceeded" }`)로 응답하는 레거시 동작이 존재
- **해결**: `axios.get()` 응답의 HTTP 상태코드뿐만 아니라 `response.data.error` 및 `esearchresult.ERROR` 필드까지 검사하는 이중 에러 감지 로직을 구현
- **선택 이유**: axios는 HTTP 200을 성공으로 판단하므로, 바디 레벨 에러를 놓치면 잘못된 데이터가 UI에 표시될 수 있음

### ESummary에 초록(abstract)이 포함되지 않는 문제

- **상황**: 초기 설계에서 ESummary로 모든 데이터를 가져올 수 있다고 가정했으나, ESummary는 초록을 제공하지 않음
- **해결**: `pubmed-api-research.md` 리서치 단계에서 사전 발견하여, EFetch(XML)로 별도 요청하는 2-step 아키텍처로 설계. 검색 완료 직후 배치 EFetch를 백그라운드로 실행하여 AI 요약 버튼 클릭 시 대기 없이 즉시 동작하도록 구현
- **선택 이유**: 기획 단계 리서치 덕분에 코드 작성 전에 발견하여, 구현 중 재설계 없이 처리할 수 있었음

### 무료 API 데이터 로딩 딜레이에 따른 UX 저하

- **상황**: 연도별 Research Trend 차트가 2000년부터 현재까지 각 연도별 ESearch를 개별 호출해야 하므로 체감 딜레이 발생
- **해결**: `Promise.all()`로 연도별 요청을 병렬 실행하되 rateLimiter 큐를 통해 자동 속도 제어. 차트 영역에 로딩 애니메이션을 표시하고, 검색 결과 카드를 먼저 렌더링한 뒤 차트는 비동기로 업데이트
- **선택 이유**: 사용자가 실제로 보는 논문 카드가 먼저 표시되어야 체감 속도가 빠르게 느껴짐

### 구조화 초록(Structured Abstract) 파싱 누락

- **상황**: 일부 논문의 초록이 `<AbstractText Label="BACKGROUND">`, `<AbstractText Label="METHODS">` 등으로 분리되어 있어, 단순 파싱 시 일부 섹션만 추출됨
- **해결**: `xmlParser.js`에서 `querySelectorAll('AbstractText')`로 모든 섹션을 가져온 후, Label 속성이 있으면 `"BACKGROUND: ..."` 형태로 합산하여 전체 초록을 복원
- **선택 이유**: AI 요약의 품질은 초록 전문의 완전한 전달 여부에 직접적으로 의존

<br>

## 10. 성능 최적화

### API 호출 최적화

| 항목 | 최적화 전 | 최적화 후 |
|---|---|---|
| 검색 1회 API 호출 수 | ESearch(1) + ESummary(1) + EFetch 개별(20) = **22회** | ESearch(1) + ESummary(1) + EFetch 배치(1) = **3회** |
| 초록 로딩 시간 (20건) | 최소 6.7초 (순차 개별 요청) | 1회 배치 요청으로 즉시 완료 |
| Rate Limit 안전성 | delay() 수동 삽입 | 큐 기반 자동 속도 제한 (안전 마진 포함) |

### UX 최적화

- **스켈레톤 카드**: 로딩 중 레이아웃 시프트(Layout Shift) 방지
- **무한 스크롤**: 하단 200px 진입 시 자동으로 다음 20건 로드
- **스크롤 진행 바**: 현재 스크롤 위치를 시각적으로 표시
- **배치 EFetch 백그라운드 실행**: 카드 렌더링과 초록 로딩이 병렬 진행
- **Semantic Scholar 네트워크 캐시**: localStorage 24시간 TTL로 반복 요청 방지

<br>

## 11. 회고 및 개선 계획

### 잘된 점

- **"기획-코딩 분리" 전략의 효과**: `research.md` → `plan.md` → 코드 순서로 진행하면서 API 제약사항을 사전에 발견하고, 구현 단계에서 방향 전환 없이 일관된 흐름으로 완성할 수 있었습니다.
- **제약을 기회로 전환**: 무료 API의 제약(retmax=20, 초당 3회)을 UX 설계의 동기로 활용하여, 배치 요청, 스켈레톤 UI, 병렬 비동기 로딩 등 실무에서도 활용 가능한 패턴을 직접 구현하는 계기가 되었습니다.
- **일관된 확장**: 단순 논문 검색 + AI 요약에서 출발하여 종합 분석(Synthesis), 논문 비교표(Compare), 인용 네트워크 그래프까지 기능을 확장하면서도 통일된 디자인 시스템을 유지했습니다.

### 아쉬운 점

- 프론트엔드 단독 SPA 구조여서 OpenAI API 키가 클라이언트에 노출되는 한계가 있습니다. 프록시 서버를 도입하여 키를 서버 사이드에서 관리하는 구조로 개선이 필요합니다.
- 모바일 반응형은 기본 수준으로 구현되어 있으나, 네트워크 그래프나 비교표 등 복잡한 UI의 모바일 최적화가 더 필요합니다.

### 추가하고 싶은 기능

- 백엔드 프록시 서버 도입 (API 키 보안 + 응답 캐싱)
- 논문 전문(Full Text) PDF 뷰어 연동 (PMC 무료 논문 대상)
- 논문 추천 알고리즘 (검색 이력 + 스크랩 기반)
