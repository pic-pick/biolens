# PubMed E-utilities API 상세 조사 보고서

> 작성일: 2026-03-21
> 출처: NCBI 공식 문서 (NBK25497, NBK25499, NBK25500, NBK25498), PubMed Help
> BioLens 프로젝트 구현 기준

---

## 1. Rate Limit (사용량 제한) — 정확한 수치

### 공식 수치 (NCBI 공식 문서 NBK25497 기준)

| 조건 | 초당 최대 요청 수 | 비고 |
|------|----------------|------|
| **API 키 없음** | **3 req/sec** | 기본 무료 사용 |
| **API 키 있음** | **10 req/sec** | NCBI 계정 필요 |
| **더 높은 한도** | 협의 가능 | NCBI에 직접 요청 시 |

> ✅ project.md의 "초당 3회" 기술은 정확함

### 제한 초과 시 응답

```
HTTP 상태: 429 Too Many Requests (최신 동작)
또는: HTTP 200 + JSON 에러 바디 (레거시 동작, 포맷에 따라 혼재 가능)

JSON 응답 시:
{
  "error": "API rate limit exceeded",
  "count": "11"
}

XML 응답 시:
<ERROR>API rate limit exceeded</ERROR>
```

> ⚠️ **axios.get()의 HTTP 상태만으로 감지 불충분** — 응답 body까지 파싱 필요
> → BioLens 구현 시 반드시 아래 두 가지 체크 로직 추가:
> ```javascript
> // 에러 감지 패턴
> if (response.data?.error) throw new Error(response.data.error)
> if (response.data?.esearchresult?.ERROR) throw new Error('Rate limit exceeded')
> ```

### 일일 사용량 제한

- 공식 문서에 **일일 총량 제한은 명시되어 있지 않음**
- 단, 대용량 작업은 **주말 또는 평일 동부시간 오후 9시~오전 5시** 권장
- 정책 위반 시 **IP 차단** 가능 (경고 없이)

### 상업적 사용 정책

- E-utilities 자체에 대한 상업적 이용 제한은 **명시적으로 없음**
- PubMed 초록 저작권은 각 출판사에 있으나, 요약·인용 목적은 허용 범위
- **포트폴리오/비상업 프로젝트**인 BioLens는 완전히 문제없음

### API 키 발급 방법

1. https://www.ncbi.nlm.nih.gov/account/ → NCBI 계정 생성 (무료)
2. 로그인 → **Settings 페이지** 이동
3. "API Key Management" 섹션에서 키 생성
4. 계정당 **1개 키만** 허용 (새 키 생성 시 기존 키 무효화)
5. 요청 파라미터에 `&api_key=ABCDE12345` 추가

```
사용 예:
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=123456&api_key=ABCDE12345
```

---

## 2. 검색 결과 수 제한 — 정확한 수치

### ESearch (ID 목록 가져오기)

| 파라미터 | 기본값 | 최댓값 | 비고 |
|---------|-------|-------|------|
| `retmax` | 20 | **10,000** | PubMed/PMC 한정 |
| `retstart` | 0 | 제한없음 | 페이지네이션용 |

```
PubMed 전체 검색 결과가 100,000건이어도
ESearch로 가져올 수 있는 ID는 최초 10,000건까지만 가능
(retstart + retmax ≤ 10,000)
```

**페이지네이션 방식:**
```
1페이지: retstart=0, retmax=20    → 1~20번 논문
2페이지: retstart=20, retmax=20   → 21~40번 논문
500페이지: retstart=9980, retmax=20 → 9981~10000번 논문 (최대 한도)
```

### ESummary (메타데이터 가져오기)

| 제약 | 내용 |
|------|------|
| GET 방식 | **약 200개 ID** 이하 권장 (URL 길이 제한) |
| POST 방식 | 수천 개 가능 (이론상 제한 없음) |
| BioLens 기준 | **20개 ID → 1회 GET** 으로 충분히 가능 |

### EFetch (초록/전문 가져오기)

| 제약 | 내용 |
|------|------|
| GET 방식 | **약 200개 ID** 이하 권장 |
| POST 방식 | 대용량 배치 처리 가능 |
| 복수 ID 지원 | `id=39123456,38987654,...` (콤마 구분) |

> ✅ BioLens에서 20개 카드 각각 EFetch 개별 호출 vs 배치 호출 모두 가능

---

## 3. 가져올 수 있는 데이터 범위

### 3-1. ESummary 제공 필드 (PubMed DocSum)

```json
{
  "uid": "39123456",              ← PubMed ID
  "title": "BRCA1 mutations...",  ← 논문 제목 (HTML 태그 포함 가능)
  "authors": [                    ← 저자 배열
    {
      "name": "Kim J",
      "authtype": "Author",
      "clusterid": ""
    }
  ],
  "source": "Nature",             ← 저널명 (약칭)
  "fulljournalname": "Nature",    ← 저널 전체 이름
  "pubdate": "2024 Mar 15",       ← 발행일 (형식 불규칙함!)
  "epubdate": "2024 Feb 28",      ← 온라인 선발행일
  "volume": "615",                ← 권호
  "issue": "7951",                ← 이슈 번호
  "pages": "123-130",             ← 페이지
  "doi": "10.1038/s41586-024-...",← DOI (항상 있지는 않음)
  "issn": "0028-0836",            ← ISSN
  "essn": "1476-4687",            ← E-ISSN
  "pmcrefcount": "45",            ← PMC 인용 수
  "pubtype": ["Journal Article"], ← 발행 유형
  "articleids": [                 ← 논문 식별자 목록
    { "idtype": "pubmed", "value": "39123456" },
    { "idtype": "doi", "value": "10.1038/..." },
    { "idtype": "pmc", "value": "PMC1234567" }  ← PMC ID (있을 경우)
  ],
  "lang": ["eng"],                ← 언어 코드
  "sortfirstauthor": "Kim J",
  "sortpubdate": "2024/03/15 00:00",
  "history": [...]
}
```

> ⚠️ **ESummary에는 초록(abstract)이 없음**
> → 초록은 반드시 EFetch로 별도 요청해야 함

### 3-2. EFetch로 가져올 수 있는 데이터

#### rettype × retmode 조합

| rettype | retmode | 내용 | 비고 |
|---------|---------|------|------|
| `abstract` | `text` | 초록을 텍스트로 반환 | 가장 간단 |
| `medline` | `text` | MEDLINE 형식 (구조화된 텍스트) | 필드 파싱 용이 |
| (없음/기본) | `xml` | PubMed XML 전체 레코드 | 가장 풍부한 정보 |
| `uilist` | `text` | UID 목록만 |  |

#### XML 전체 레코드 포함 정보

```xml
<PubmedArticle>
  <MedlineCitation>
    <Article>
      <Journal>...</Journal>           ← 저널 상세
      <ArticleTitle>...</ArticleTitle>  ← 제목
      <Abstract>
        <AbstractText>...</AbstractText> ← 초록 (구조화 초록이면 Label별로 분리)
      </Abstract>
      <AuthorList>
        <Author>
          <LastName>Kim</LastName>
          <ForeName>Jisoo</ForeName>
          <Identifier Source="ORCID">0000-0001-...</Identifier>
          <AffiliationInfo>...</AffiliationInfo>  ← 소속기관
        </Author>
      </AuthorList>
      <PublicationTypeList>
        <PublicationType>Journal Article</PublicationType>
        <PublicationType>Randomized Controlled Trial</PublicationType>
      </PublicationTypeList>
      <ELocationID EIdType="doi">10.1038/...</ELocationID>
    </Article>
    <MeshHeadingList>                  ← MeSH 용어 목록
      <MeshHeading>
        <DescriptorName>BRCA1 Protein</DescriptorName>
        <QualifierName>genetics</QualifierName>
      </MeshHeading>
    </MeshHeadingList>
    <ChemicalList>                     ← 화학물질/약물 목록
      <Chemical>
        <RegistryNumber>...</RegistryNumber>
        <NameOfSubstance>Trastuzumab</NameOfSubstance>
      </Chemical>
    </ChemicalList>
    <KeywordList>                      ← 저자 키워드
      <Keyword>BRCA1</Keyword>
    </KeywordList>
    <GrantList>                        ← 연구비 지원
      <Grant>
        <GrantID>R01CA123456</GrantID>
        <Agency>NCI NIH HHS</Agency>
      </Grant>
    </GrantList>
  </MedlineCitation>
  <PubmedData>
    <ReferenceList>                    ← 참고문헌 목록 (있을 경우)
      <Reference>
        <Citation>Nature 2020...</Citation>
        <ArticleIdList>
          <ArticleId IdType="pubmed">32123456</ArticleId>
        </ArticleIdList>
      </Reference>
    </ReferenceList>
  </PubmedData>
</PubmedArticle>
```

#### 구조화 초록 처리 주의사항

```xml
<!-- 일반 초록 -->
<AbstractText>The study investigated...</AbstractText>

<!-- 구조화 초록 (Label 속성 존재) -->
<AbstractText Label="BACKGROUND">...</AbstractText>
<AbstractText Label="METHODS">...</AbstractText>
<AbstractText Label="RESULTS">...</AbstractText>
<AbstractText Label="CONCLUSIONS">...</AbstractText>
```

> → BioLens 파싱 시 `querySelectorAll('AbstractText')`로 모든 섹션 합쳐야 함

#### 초록 없는 논문 처리

- Letter, Editorial, Comment 등 일부 유형은 초록 없음
- `<AbstractText>` 태그 자체가 없음 → `?.textContent ?? ''` 처리 필수

---

## 4. 검색 기능 범위

### 4-1. 전체 검색 필드 태그

| 태그 | 약칭 | 설명 | BioLens 활용 |
|------|------|------|-------------|
| `[Title/Abstract]` | `[tiab]` | 제목+초록 검색 | ✅ 기본 사용 |
| `[Title]` | `[ti]` | 제목만 검색 | 필요 시 |
| `[MeSH Terms]` | `[mh]` | MeSH 표준 의학 용어 | ✅ 확장 가능 |
| `[MeSH Major Topic]` | `[majr]` | 주요 MeSH 용어만 | |
| `[Author]` | `[au]` | 저자명 검색 | |
| `[Full Author Name]` | `[fau]` | 저자 전체 이름 | |
| `[Journal]` | `[ta]` | 저널명 검색 | 필터 기능에 활용 |
| `[Publication Date]` | `[dp]` | 발행 연도 범위 | ✅ 연도 필터에 활용 |
| `[Language]` | `[la]` | 언어 필터 | 영어 논문만 필터 가능 |
| `[Publication Type]` | `[pt]` | 논문 유형 필터 | |
| `[PMID]` | `[pmid]` | PMID로 직접 검색 | |
| `[Affiliation]` | `[ad]` | 저자 소속기관 | |
| `[Text Words]` | `[tw]` | 모든 텍스트 필드 | |
| `[All Fields]` | `[all]` | 전체 필드 | |
| `[Pharmacological Action]` | `[pa]` | 약물 작용 기전 | |
| `[Supplementary Concept]` | `[nm]` | 보충 개념 (신물질 등) | |
| `[Grants and Funding]` | `[gr]` | 연구비 정보 | |

### 4-2. 불리언 연산자

```
AND: cancer AND BRCA1             → 두 조건 모두 포함
OR:  BRCA1 OR BRCA2               → 하나 이상 포함
NOT: cancer NOT breast             → 첫 조건에서 두 번째 제외
괄호: (BRCA1 OR BRCA2) AND cancer  → 그룹핑 지원
```

처리 순서: **왼쪽에서 오른쪽** (괄호로 우선순위 조정)

### 4-3. 고급 검색 기법

```
날짜 범위:
  2020:2024[dp]                 → 2020~2024년 논문
  2024/01:2024/12[dp]           → 2024년 논문
  "last 5 years"[pdat]          → 최근 5년

근접 검색:
  "cancer treatment"[ti:~3]     → 제목에서 3단어 내 근접

필터:
  free full text[filter]        → 무료 전문 제공 논문
  humans[mh]                    → 인간 대상 연구
  clinical trial[pt]            → 임상시험 논문
```

---

## 5. 한국어 검색 가능 여부 — 상세 분석

### 결론 먼저

| 상황 | 가능 여부 | 설명 |
|------|---------|------|
| 한글 검색어로 논문 검색 | **사실상 불가** | PubMed 인덱스는 영어 기반 |
| 한국어 [la] 필터 | **가능** | `korean[la]` |
| 한국인 저자 논문 검색 | **가능** | 영어 이름으로 검색 |
| 한국 저널 논문 검색 | **가능** | 영어로 등록된 논문만 |
| AI 요약 → 한국어 출력 | **가능** | OpenAI가 번역/요약 |

### 상세 분석

**PubMed의 언어 구조:**
- PubMed에 등록된 논문의 제목·초록은 대부분 **영어**
- 한국어로 발행된 논문도 PubMed에는 **영어 번역본**으로 등록
- 즉, 인덱스 자체가 영어 기반 → 한글 검색어는 매칭 안됨

**`korean[la]` 필터로 검색되는 논문:**
```
korean[la] 필터 = "이 논문은 한국어로 작성되었다" 표시된 논문
→ 주로 한국 저널에 한국어로 게재된 논문
→ 해당 논문들도 PubMed에는 영어 제목+초록으로 등록됨
→ 검색은 여전히 영어로 해야 함
```

**BioLens 구현 전략:**
```
❌ 사용자가 "유방암" 입력 → PubMed 검색 → 0건 (작동 안 함)
✅ 사용자가 "breast cancer" 입력 → PubMed 검색 → 정상 작동
✅ AI 요약에서 한국어로 변환 → 완벽히 가능

→ QuickTags를 영어로 제공 ("BRCA1", "COVID-19", "Alzheimer")
→ 검색창 아래 "영어 검색어를 입력하세요" 안내 문구 추가 권장
→ 또는: 한글 입력 감지 시 "영어로 입력해주세요" 알림
```

**실험적 시도 (신뢰도 낮음):**
- 한글로 `"유방암"[Title/Abstract]` 입력 시: 응답이 오지만 결과 0건 가능성 높음
- PubMed 자체 웹사이트에서도 한글 검색 시 영어 자동 번역 기능 없음

---

## 6. BioLens 필수 사용 시나리오별 API 가이드

### 시나리오 A: 기본 검색 (구현 필수)

```javascript
// 검색어 "cancer immunotherapy", 20건, 관련도 순 정렬
GET /esearch.fcgi?db=pubmed&term=cancer+immunotherapy[Title/Abstract]&retmax=20&retmode=json&sort=relevance

// 응답: idlist 20개 PMID
// → 1회 호출로 완료
```

**Rate limit 소비: 1회**

### 시나리오 B: 메타데이터 가져오기 (구현 필수)

```javascript
// 20개 PMID를 한 번에 ESummary 요청
GET /esummary.fcgi?db=pubmed&id=39123456,38987654,...(20개)&retmode=json

// 응답: title, authors, source, pubdate, doi 등
// → 1회 호출로 20개 동시 처리
```

**Rate limit 소비: 1회**

**→ 검색 1회 = 총 2회 API 호출 (Rate limit 여유 충분)**

### 시나리오 C: 초록 가져오기 (AI 요약용)

**방법 1: 개별 요청 (현재 설계)**
```javascript
// 카드 1개씩 요청
GET /efetch.fcgi?db=pubmed&id=39123456&rettype=abstract&retmode=xml
// → 카드 20개 요약 시 20회 호출
// → 초당 3회 제한 → 최소 6.7초 소요
// → delay 필요: await sleep(350) 사이에 끼워야 함
```

**방법 2: 배치 요청 (권장 최적화)**
```javascript
// 여러 ID를 한 번에 요청
GET /efetch.fcgi?db=pubmed&id=39123456,38987654,...(20개)&retmode=xml
// → 1회 호출로 20개 초록 동시 수신
// → XML에서 각 논문 초록 파싱 필요
// → 호출 횟수 20분의 1로 감소
```

**→ BioLens 권장: "AI 요약" 버튼 첫 클릭 시만 EFetch 요청 (lazy loading)**

### 시나리오 D: 연도 필터 (추가 기능)

```javascript
// 2020~2024년 사이 논문만 검색
GET /esearch.fcgi?db=pubmed
  &term=cancer[tiab]+AND+2020:2024[dp]
  &retmax=20&retmode=json
```

### 시나리오 E: 페이지네이션 (추가 기능)

```javascript
// 21~40번 결과 가져오기
GET /esearch.fcgi?db=pubmed
  &term=cancer[tiab]
  &retmax=20
  &retstart=20    ← 21번째부터
  &retmode=json
```

---

## 7. 추가 유용한 API

### ELink — 관련 논문 찾기

| linkname | 설명 | BioLens 활용 |
|----------|------|-------------|
| `pubmed_pubmed` | 유사/관련 논문 | "관련 논문" 기능 |
| `pubmed_pubmed_citedin` | 해당 논문을 인용한 논문 | 인용 논문 탐색 |
| `pubmed_pubmed_refs` | 해당 논문의 참고문헌 | 참고문헌 보기 |
| `pubmed_pmc` | PMC 전문 링크 | 무료 전문 확인 |

```
GET /elink.fcgi?dbfrom=pubmed&db=pubmed&id=39123456&linkname=pubmed_pubmed_citedin&retmode=json
→ 이 논문을 인용한 다른 논문 PMID 목록 반환
```

### iCite API — 인용 수 (NIH 제공, 무료)

> E-utilities 자체는 인용 수(citation count)를 직접 제공하지 않음
> → NIH의 별도 iCite API 사용 필요

```
GET https://icite.od.nih.gov/api/pubs?pmids=39123456,38987654

응답:
{
  "data": [{
    "pmid": 39123456,
    "citation_count": 45,         ← 총 인용 수
    "citations_per_year": 12.3,   ← 연간 인용 수
    "relative_citation_ratio": 2.1 ← RCR (상대적 인용 지표)
  }]
}
```

### EInfo — 데이터베이스 정보

```
GET /einfo.fcgi?db=pubmed&retmode=json
→ 검색 가능한 모든 필드 목록, 레코드 수 등
```

### History Server — 대용량 처리

```javascript
// Step 1: ESearch + usehistory=y (서버에 결과 저장)
GET /esearch.fcgi?db=pubmed&term=cancer&usehistory=y&retmax=0
// 응답: { webenv: "MCID_...", query_key: "1", count: "500000" }
// WebEnv 세션 유지: 약 1시간 (비활성 시 만료)

// Step 2: 저장된 결과를 배치로 EFetch
GET /efetch.fcgi?db=pubmed&query_key=1&WebEnv=MCID_...&retstart=0&retmax=200&rettype=abstract&retmode=xml
GET /efetch.fcgi?db=pubmed&query_key=1&WebEnv=MCID_...&retstart=200&retmax=200&rettype=abstract&retmode=xml

// 여러 검색 결과 조합
// 검색1 → query_key=1, 검색2 → query_key=2 (동일 WebEnv)
// term=%231+AND+%232 로 조합 가능
```

---

## 8. BioLens 구현을 위한 최종 권장사항

### Rate Limit 대응 전략

```javascript
// 1. API 키 등록 (NCBI 계정) → 10 req/sec으로 업그레이드
//    .env: VITE_NCBI_API_KEY=ABCDE12345
//    모든 요청에 &api_key=${key} 추가

// 2. Rate limit 에러 감지
if (response.data.error === 'API rate limit exceeded') {
  // 재시도 로직 or 사용자에게 알림
}

// 3. EFetch 배치 처리로 요청 횟수 최소화
//    개별 20회 → 배치 1회

// 4. 요청 간 최소 간격 (API 키 없는 경우)
const delay = (ms) => new Promise(r => setTimeout(r, ms))
await delay(400) // 초당 2.5회 = 안전 마진
```

### 포트폴리오 데모 기준 실용적 설정

```
API 키: 없어도 됨 (초당 3회, 1회 검색 = 2회 호출)
retmax: 20 (충분)
EFetch: lazy loading (AI 요약 버튼 클릭 시만)
배치 EFetch: 선택적 (UX 개선 시)
페이지네이션: 추가 기능으로 구현
```

### 데이터 신뢰도 주의사항

```
pubdate 필드: "2024 Mar 15", "2024 Mar", "2024", "2024 Spring" 등 형식 불규칙
  → parseInt(item.pubdate?.split(' ')[0]) || 0 (현재 설계) ✅ 적절한 처리

authors 필드: 일부 논문은 저자 목록이 매우 길거나 Corporate Author만 있음
  → item.authors?.slice(0, 3) || [] ✅ 적절한 처리

abstract: ESummary에 없음 → EFetch 필수
  → 초록 없는 논문(Letter 등) 처리 필요

doi: 항상 존재하지 않음 (특히 오래된 논문)
  → articleids 배열에서 추출 or pubmed URL로 대체
```

---

## 9. 요약 테이블

| 항목 | 수치/결론 |
|------|-----------|
| Rate Limit (키 없음) | **초당 3회** |
| Rate Limit (키 있음) | **초당 10회** |
| Rate Limit 초과 에러 | **HTTP 429** (또는 HTTP 200 + JSON 에러 바디) |
| 일일 총량 제한 | **없음** |
| ESearch 최대 결과 | **10,000건** (retmax 최댓값) |
| BioLens 기본 설정 | retmax=20 |
| ESummary 권장 배치 | **500개** (GET), 이상은 POST |
| EFetch 권장 배치 | **200개** (GET), 이상은 POST |
| EFetch JSON 지원 | **없음** (XML/TEXT만 가능) |
| ESummary JSON 지원 | **있음** (`retmode=json`) |
| EFetch 초록 형식 | XML (retmode=xml) 또는 TEXT (rettype=abstract&retmode=text) |
| ESummary 초록 포함 | **없음** (별도 EFetch 필수) |
| 한글 검색어 | **불가** (영어 인덱스 기반, 실용성 없음) |
| 한국어 논문 필터 | `korean[la]` 으로 가능 |
| 논문 언어 필터 | `[Language]` 태그 사용 |
| 인용 수 | iCite API 별도 활용 (E-utilities 미지원) |
| 상업적 사용 | 허용 (대규모 상업적 시 NCBI 협의 권장) |
| API 키 발급 | NCBI 계정 무료 생성 후 Settings 페이지 |
| History Server 유효시간 | **약 1시간** (비활성 시 만료) |
