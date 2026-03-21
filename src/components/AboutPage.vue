<template>
  <Teleport to="body">
    <div ref="rootEl" class="about-root" @keydown.esc="emit('close')" tabindex="-1">

      <!-- ── 고정 배경 ── -->
      <div aria-hidden="true" class="about-bg">
        <div class="about-dots" />
        <div class="ab ab-1" /><div class="ab ab-2" />
        <div class="ab ab-3" /><div class="ab ab-4" />
        <div class="about-vignette" />
      </div>

      <!-- ── 고정 상단 네비 ── -->
      <nav class="about-nav">
        <button class="nav-back" @click="emit('close')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          뒤로가기
        </button>

        <div class="nav-logo">
          <div class="nav-logo-icon">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span>BioLens</span>
        </div>

        <button class="nav-close" @click="emit('close')" title="닫기">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
          </svg>
        </button>
      </nav>

      <!-- ══════════════════════════════════
           OVERVIEW
      ══════════════════════════════════ -->
      <section class="ab-section overview-section">
        <div class="ab-inner">
          <div class="overview-grid">

            <!-- 왼쪽: 텍스트 -->
            <div class="overview-text">
              <div class="ab-eyebrow" data-animate>About BioLens</div>
              <h1 class="overview-title" data-animate>
                생명과학 연구자를 위한<br>
                <span class="grad-text">AI 논문 탐색 도구</span>
              </h1>
              <p class="overview-desc" data-animate>
                BioLens는 PubMed 3,700만 편의 논문을 AI와 함께 빠르게 탐색하고,
                요약·번역·비교·종합분석까지 한 곳에서 해결할 수 있는 생명과학 연구자 전용 플랫폼입니다.
                복잡한 문헌 검색을 단순하게, 영어 논문을 부담 없이, 여러 연구를 한눈에 비교할 수 있도록 설계되었습니다.
              </p>
              <div class="overview-tags" data-animate>
                <span class="tag">🔬 PubMed 기반</span>
                <span class="tag">🤖 GPT-4o-mini</span>
                <span class="tag">📊 NIH iCite 인용지표</span>
                <span class="tag">🕸️ 인용 네트워크</span>
              </div>
            </div>

            <!-- 오른쪽: 스탯 카드 -->
            <div class="overview-stats" data-animate>
              <div class="stat-block">
                <span class="stat-num">3,700만<sup>+</sup></span>
                <span class="stat-label">PubMed 논문 데이터베이스</span>
                <p class="stat-detail">매일 수천 편씩 업데이트되는 세계 최대 생명과학 논문 DB에 직접 연결됩니다.</p>
              </div>
              <div class="stat-divider" />
              <div class="stat-block">
                <span class="stat-num">6가지</span>
                <span class="stat-label">핵심 기능</span>
                <p class="stat-detail">검색부터 저장, AI 분석, 인용 네트워크 탐색까지 연구의 전 과정을 지원합니다.</p>
              </div>
              <div class="stat-divider" />
              <div class="stat-block">
                <span class="stat-num">5개</span>
                <span class="stat-label">신뢰 데이터 출처</span>
                <p class="stat-detail">PubMed, iCite, OpenAI, Semantic Scholar, OpenAlex를 연동합니다.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════
           CORE FEATURES
      ══════════════════════════════════ -->
      <section class="ab-section feat-section">
        <div class="ab-inner">
          <div class="ab-eyebrow" data-animate>Features</div>
          <h2 class="ab-title" data-animate>BioLens가 할 수 있는 것</h2>
          <p class="ab-subtitle" data-animate>6가지 핵심 기능이 서로 연결되어 논문 탐색부터 심층 분석까지 하나의 흐름으로 이어집니다.</p>

          <div class="feat-grid">
            <div
              v-for="(f, i) in features"
              :key="i"
              class="feat-card"
              :style="{ '--fc': f.color, '--fg': f.glow }"
              data-animate
              :data-delay="i * 60"
            >
              <div class="feat-card-bg" />
              <div class="feat-header">
                <div class="feat-icon-wrap" :style="{ background: f.iconBg }">
                  <svg class="feat-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" v-html="f.icon" />
                </div>
                <div>
                  <h3 class="feat-title">{{ f.title }}</h3>
                  <span class="feat-badge" :style="{ color: f.color, borderColor: f.color + '40', background: f.color + '15' }">{{ f.badge }}</span>
                </div>
              </div>
              <p class="feat-desc">{{ f.desc }}</p>
              <ul class="feat-points">
                <li v-for="p in f.points" :key="p">{{ p }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════
           HOW IT WORKS
      ══════════════════════════════════ -->
      <section class="ab-section how-section">
        <div class="ab-inner">
          <div class="ab-eyebrow" data-animate>How to Use</div>
          <h2 class="ab-title" data-animate>사용 방법</h2>
          <p class="ab-subtitle" data-animate>설치나 회원가입 없이 즉시 사용할 수 있습니다. 아래 순서대로 따라가세요.</p>

          <div class="steps-list">
            <div
              v-for="(s, i) in steps"
              :key="i"
              class="step-row"
              data-animate
              :data-delay="i * 70"
            >
              <div class="step-left">
                <div class="step-badge">
                  <span class="step-num-inner">{{ String(i + 1).padStart(2, '0') }}</span>
                </div>
                <div v-if="i < steps.length - 1" class="step-line" />
              </div>
              <div class="step-content">
                <div class="step-meta">
                  <span class="step-icon">{{ s.icon }}</span>
                  <h3 class="step-title">{{ s.title }}</h3>
                </div>
                <p class="step-desc">{{ s.desc }}</p>
                <div v-if="s.tips" class="step-tips">
                  <p v-for="tip in s.tips" :key="tip" class="step-tip">
                    <span class="tip-dot" />{{ tip }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════
           DATA SOURCES
      ══════════════════════════════════ -->
      <section class="ab-section sources-section">
        <div class="ab-inner">
          <div class="ab-eyebrow" data-animate>Data Sources</div>
          <h2 class="ab-title" data-animate>신뢰할 수 있는 데이터 기반</h2>
          <p class="ab-subtitle" data-animate>글로벌 검증 데이터베이스와 최신 AI 기술을 연결해 정확하고 신뢰할 수 있는 분석을 제공합니다.</p>

          <div class="sources-grid">
            <div
              v-for="(s, i) in sources"
              :key="i"
              class="source-card"
              :style="{ '--sc': s.color }"
              data-animate
              :data-delay="i * 70"
            >
              <div class="source-top">
                <div class="source-icon-wrap" :style="{ background: s.color + '20', borderColor: s.color + '30' }">
                  <span class="source-icon">{{ s.icon }}</span>
                </div>
                <div>
                  <div class="source-name">{{ s.name }}</div>
                  <div class="source-type">{{ s.type }}</div>
                </div>
              </div>
              <p class="source-desc">{{ s.desc }}</p>
              <div class="source-tag-row">
                <span v-for="tag in s.tags" :key="tag" class="source-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════
           FAQ
      ══════════════════════════════════ -->
      <section class="ab-section faq-section">
        <div class="ab-inner">
          <div class="ab-eyebrow" data-animate>FAQ</div>
          <h2 class="ab-title" data-animate>자주 묻는 질문</h2>

          <div class="faq-grid">
            <div
              v-for="(q, i) in faqs"
              :key="i"
              class="faq-card"
              data-animate
              :data-delay="i * 55"
            >
              <div class="faq-q">{{ q.q }}</div>
              <div class="faq-a">{{ q.a }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════
           TECH STACK & FOOTER
      ══════════════════════════════════ -->
      <section class="ab-section footer-section">
        <div class="ab-inner">
          <div class="tech-row" data-animate>
            <div class="tech-block">
              <p class="tech-label">Frontend</p>
              <div class="tech-tags">
                <span class="tech-chip">Vue 3</span>
                <span class="tech-chip">Tailwind CSS</span>
                <span class="tech-chip">Vite</span>
              </div>
            </div>
            <div class="tech-divider" />
            <div class="tech-block">
              <p class="tech-label">APIs</p>
              <div class="tech-tags">
                <span class="tech-chip">PubMed E-utilities</span>
                <span class="tech-chip">NIH iCite</span>
                <span class="tech-chip">OpenAI GPT-4o-mini</span>
                <span class="tech-chip">Semantic Scholar</span>
                <span class="tech-chip">OpenAlex</span>
              </div>
            </div>
            <div class="tech-divider" />
            <div class="tech-block">
              <p class="tech-label">Storage</p>
              <div class="tech-tags">
                <span class="tech-chip">localStorage</span>
                <span class="tech-chip">sessionStorage</span>
              </div>
            </div>
          </div>

          <div class="footer-bottom" data-animate>
            <div class="footer-brand">
              <div class="footer-logo-icon">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div>
                <p class="footer-name">BioLens · v1.0</p>
                <p class="footer-sub">AI 기반 생명과학 논문 탐색 플랫폼</p>
              </div>
            </div>
            <button class="footer-cta" @click="emit('close')">
              탐색 시작하기
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['close'])
const rootEl = ref(null)

const features = [
  {
    title: '논문 검색',
    badge: 'PubMed 3,700만 편',
    desc: '세계 최대 생명과학 논문 DB인 PubMed에 실시간으로 연결해 검색합니다. 한국어로 입력해도 AI가 최적의 영어 검색어를 추천해 정확한 결과를 얻을 수 있습니다.',
    points: ['연도 범위 · 논문 유형 · 무료전문 필터', '연구 동향 차트 (2000~현재 연도별 게재 수)', '무한 스크롤로 다음 결과 자동 로딩'],
    icon: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/>',
    color: '#6366f1', glow: 'rgba(99,102,241,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(99,102,241,0.1))',
  },
  {
    title: '인용 지표',
    badge: 'NIH iCite',
    desc: '논문별 인용 수와 분야 내 상대적 영향력(RCR)을 자동으로 표시합니다. 수천 편 중 실제로 영향력 있는 핵심 논문을 한눈에 골라낼 수 있습니다.',
    points: ['인용 수 (Citation Count) 자동 표시', '상대적 영향력 RCR 지표', '논문 카드에서 즉시 확인'],
    icon: '<path d="M3 13l4-4 4 4 4-7 4 3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 20h18" stroke-linecap="round"/>',
    color: '#06b6d4', glow: 'rgba(6,182,212,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(6,182,212,0.35), rgba(6,182,212,0.1))',
  },
  {
    title: 'AI 요약 · 번역',
    badge: 'GPT-4o-mini',
    desc: '논문별 AI 3줄 요약과 초록 한국어 번역을 즉시 제공합니다. 의학·생물학 전문 용어는 한국어·영어를 함께 표기해 정확성을 높입니다.',
    points: ['논문당 AI 핵심 3줄 요약', '초록 전문 한국어 번역', '전문 용어 한·영 병기'],
    icon: '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-linecap="round"/>',
    color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(139,92,246,0.1))',
  },
  {
    title: '비교 · 종합분석',
    badge: 'AI 자동 분석',
    desc: '최대 5편을 선택하면 연구 설계, 대상군, 중재/노출, 주요 결과, 한계점, 근거 수준을 열별로 비교하는 구조화된 분석표를 자동 생성합니다.',
    points: ['6항목 구조화 비교표 자동 생성', '공통 결과 · 상충 결과 · Research Gap 요약', 'Markdown 형식으로 복사 가능'],
    icon: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-linecap="round"/>',
    color: '#10b981', glow: 'rgba(16,185,129,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.1))',
  },
  {
    title: '저장 · 폴더 관리',
    badge: 'Saved Board',
    desc: '마음에 드는 논문을 저장하고 색상별 커스텀 폴더로 분류합니다. 비교/종합분석 결과도 함께 저장되어 언제든 다시 열람할 수 있습니다.',
    points: ['색상별 커스텀 폴더 생성', '분석 결과 보드에 저장 · 재열람', '로컬 브라우저에 안전 보관'],
    icon: '<path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" stroke-linecap="round"/>',
    color: '#f59e0b', glow: 'rgba(245,158,11,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.1))',
  },
  {
    title: '인용 네트워크',
    badge: 'Semantic Scholar',
    desc: '논문의 참고문헌과 피인용 논문을 인터랙티브 그래프로 시각화합니다. 연구 흐름을 탐색하며 핵심 관련 논문을 발굴할 수 있습니다.',
    points: ['참고문헌 · 피인용 논문 그래프', '노드 클릭으로 논문 상세 이동', '연구 흐름의 시각적 탐색'],
    icon: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h10M17 5.5l-10 5M17 18.5l-10-5" stroke-linecap="round"/>',
    color: '#ec4899', glow: 'rgba(236,72,153,0.35)',
    iconBg: 'linear-gradient(135deg, rgba(236,72,153,0.35), rgba(236,72,153,0.1))',
  },
]

const steps = [
  {
    icon: '🔍',
    title: '검색어 입력',
    desc: 'PubMed 검색어를 입력합니다. 영어 키워드가 기본이지만, 한국어로 입력하면 AI가 최적화된 영어 검색어를 자동으로 추천해줍니다.',
    tips: ['예: "BRCA1 breast cancer" / "암 면역치료" 입력 시 영어 추천', '트렌딩 토픽 클릭으로 인기 연구주제 바로 검색'],
  },
  {
    icon: '🎛️',
    title: '필터 설정',
    desc: '왼쪽 사이드바에서 발표 연도 범위, 논문 유형(리뷰/임상시험/메타분석 등), 무료 전문 여부를 설정해 원하는 논문만 추립니다.',
    tips: ['연구 동향 차트의 연도 바 클릭 → 해당 연도만 필터 적용', '필터 변경 시 자동으로 재검색'],
  },
  {
    icon: '📄',
    title: '논문 확인',
    desc: '인용 수·RCR 지표로 영향력을 먼저 확인하고, AI 요약으로 핵심 내용을 빠르게 파악합니다. 초록 번역 버튼으로 한국어 전문 번역도 즉시 확인합니다.',
    tips: ['카드 우측 상단 "AI 요약" 버튼 클릭', '"번역" 버튼으로 초록 전문 한국어 번역'],
  },
  {
    icon: '💾',
    title: '논문 저장',
    desc: '마음에 드는 논문은 저장 버튼으로 Saved 탭에 보관합니다. 색상별 폴더를 만들어 주제·프로젝트별로 분류해 체계적으로 관리합니다.',
    tips: ['폴더 미선택 시 "미분류" 보관', 'Saved 탭에서 폴더 이동·삭제 가능'],
  },
  {
    icon: '🔬',
    title: '심층 분석',
    desc: '2~5편의 논문을 선택(체크박스)하면 하단에 분석 버튼이 활성화됩니다. Compare로 비교표를, Analyze로 종합분석을 실행합니다.',
    tips: ['초록이 없는 논문은 비교/분석 불가 (버튼 회색 표시)', '분석 결과는 Saved 탭에 저장 후 재열람 가능'],
  },
  {
    icon: '🕸️',
    title: '네트워크 탐색',
    desc: '논문 카드의 "Citation" 버튼으로 해당 논문의 참고문헌과 피인용 논문을 인터랙티브 그래프로 탐색합니다. 연구 흐름을 따라 숨겨진 핵심 논문을 발굴합니다.',
    tips: ['그래프 노드 클릭 → 논문 상세정보 확인', 'Semantic Scholar API 연동'],
  },
]

const sources = [
  {
    icon: '🔬', name: 'PubMed', type: 'NCBI / NLM',
    desc: '미국 국립의학도서관이 운영하는 세계 최대 생명과학 논문 DB. MEDLINE을 포함한 3,700만 편 이상의 논문을 무료로 검색할 수 있습니다.',
    color: '#3b82f6',
    tags: ['3,700만+ 논문', '매일 업데이트', 'E-utilities API'],
  },
  {
    icon: '📊', name: 'NIH iCite', type: 'NIH / NCI',
    desc: '미국 국립보건원이 제공하는 논문 영향력 측정 도구. 분야별 인용 수준을 정규화한 RCR(Relative Citation Ratio) 지표로 논문의 실제 영향력을 측정합니다.',
    color: '#06b6d4',
    tags: ['RCR 영향력 지표', '인용 수 집계', 'NIH 공식 API'],
  },
  {
    icon: '🤖', name: 'OpenAI', type: 'GPT-4o-mini',
    desc: 'GPT-4o-mini 모델을 활용해 논문 요약, 한국어 번역, 검색어 추천, 비교 분석, 종합 분석을 수행합니다. 생의학 맥락에 최적화된 프롬프트로 정확도를 높였습니다.',
    color: '#8b5cf6',
    tags: ['AI 3줄 요약', '한국어 번역', '비교·종합 분석'],
  },
  {
    icon: '🕸️', name: 'Semantic Scholar', type: 'Allen AI',
    desc: 'AI 연구소 Allen AI가 구축한 학술 논문 검색 엔진. 논문 간 인용 관계 데이터를 기반으로 인터랙티브 인용 네트워크 그래프를 제공합니다.',
    color: '#ec4899',
    tags: ['인용 네트워크', '참고문헌 그래프', 'Graph API'],
  },
  {
    icon: '📡', name: 'OpenAlex', type: 'Our Research',
    desc: '학술 논문의 메타데이터를 오픈하게 제공하는 플랫폼. 최근 30일간 생명과학 분야에서 가장 많이 게재된 연구 토픽을 실시간으로 집계해 트렌딩 주제를 표시합니다.',
    color: '#10b981',
    tags: ['트렌딩 토픽', '실시간 30일 집계', '무료 오픈 API'],
  },
]

const faqs = [
  {
    q: '무료로 사용할 수 있나요?',
    a: 'BioLens는 별도의 설치·회원가입 없이 브라우저에서 바로 사용할 수 있습니다. AI 요약·번역·분석 기능은 OpenAI API를 사용하므로 해당 비용이 발생할 수 있습니다.',
  },
  {
    q: '한국어로 검색이 되나요?',
    a: 'PubMed 자체는 영어 검색어를 사용합니다. 한국어로 입력하면 AI가 최적화된 영어 검색어를 자동 추천하므로, 추천된 검색어를 클릭하면 정확한 결과를 얻을 수 있습니다.',
  },
  {
    q: '저장된 논문과 분석 결과는 어디에 보관되나요?',
    a: '모든 저장 데이터는 사용자의 브라우저 localStorage에 보관됩니다. 서버로 전송되지 않으며, 브라우저 데이터를 초기화하면 삭제됩니다. Settings에서 직접 초기화할 수도 있습니다.',
  },
  {
    q: '비교 분석은 몇 편까지 가능한가요?',
    a: '최소 2편에서 최대 5편까지 선택해 비교·종합분석을 실행할 수 있습니다. 초록(Abstract) 데이터가 없는 논문은 AI 분석이 불가능하며 버튼이 비활성화됩니다.',
  },
  {
    q: 'AI 요약이 부정확할 수도 있나요?',
    a: 'GPT-4o-mini 기반 요약은 논문의 원문 초록을 기반으로 생성되므로 일반적으로 정확합니다. 다만 AI 특성상 미묘한 뉘앙스 차이가 있을 수 있으므로, 중요한 내용은 원문 초록을 직접 확인하시기 바랍니다.',
  },
  {
    q: '인용 네트워크 그래프는 모든 논문에서 사용 가능한가요?',
    a: 'Semantic Scholar에 등록된 논문이라면 인용 네트워크 그래프를 볼 수 있습니다. 일부 매우 최신 논문이나 소규모 저널 논문의 경우 데이터가 없을 수 있습니다.',
  },
]

let observer = null
onMounted(() => {
  rootEl.value?.focus()
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const delay = parseInt(e.target.dataset.delay ?? 0)
          setTimeout(() => e.target.classList.add('in-view'), delay)
        }
      })
    },
    { threshold: 0.06, rootMargin: '0px 0px -20px 0px' }
  )
  rootEl.value?.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
/* ══════════════════════════════════════
   ROOT
══════════════════════════════════════ */
.about-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #060b18;
  color: #e2e8f0;
  font-family: 'Inter', system-ui, sans-serif;
  outline: none;
  scroll-behavior: smooth;
}
.about-root::-webkit-scrollbar { width: 4px; }
.about-root::-webkit-scrollbar-track { background: transparent; }
.about-root::-webkit-scrollbar-thumb { background: #2d4060; border-radius: 999px; }

/* ══════════════════════════════════════
   BACKGROUND
══════════════════════════════════════ */
.about-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.about-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(148,163,184,0.06) 1px, transparent 1px);
  background-size: 28px 28px;
}
.ab {
  position: absolute;
  border-radius: 50%;
  mix-blend-mode: screen;
}
.ab-1 { width:600px;height:600px;background:radial-gradient(circle,#6366f1 0%,transparent 70%);opacity:.12;top:5%;left:2%;filter:blur(90px);animation:ab1 22s ease-in-out infinite alternate; }
.ab-2 { width:500px;height:500px;background:radial-gradient(circle,#06b6d4 0%,transparent 70%);opacity:.10;top:30%;right:0%;filter:blur(100px);animation:ab2 26s ease-in-out infinite alternate; }
.ab-3 { width:450px;height:450px;background:radial-gradient(circle,#8b5cf6 0%,transparent 70%);opacity:.11;bottom:15%;left:25%;filter:blur(80px);animation:ab3 24s ease-in-out infinite alternate; }
.ab-4 { width:350px;height:350px;background:radial-gradient(circle,#ec4899 0%,transparent 70%);opacity:.09;bottom:5%;right:10%;filter:blur(85px);animation:ab4 18s ease-in-out infinite alternate; }
@keyframes ab1 { to { transform:translate(60px,50px) scale(1.1); } }
@keyframes ab2 { to { transform:translate(-50px,60px) scale(1.08); } }
@keyframes ab3 { to { transform:translate(45px,-50px) scale(1.12); } }
@keyframes ab4 { to { transform:translate(-45px,-35px) scale(0.92); } }
.about-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(6,11,24,0.7) 100%);
}

/* ══════════════════════════════════════
   NAV BAR
══════════════════════════════════════ */
.about-nav {
  position: sticky;
  top: 0;
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 3.5rem;
  background: rgba(6,11,24,0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.nav-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.2s ease;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}
.nav-back:hover { color: #e2e8f0; background: rgba(255,255,255,0.04); }

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}
.nav-logo-icon {
  width: 1.75rem; height: 1.75rem;
  border-radius: 0.5rem;
  background: rgba(99,102,241,0.2);
  border: 1px solid rgba(99,102,241,0.3);
  display: flex; align-items: center; justify-content: center;
  color: #818cf8;
}

.nav-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem; height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.04);
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-close:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #e2e8f0; }

/* ══════════════════════════════════════
   SHARED SECTION
══════════════════════════════════════ */
.ab-section {
  position: relative;
  z-index: 1;
  padding: 4.5rem 1.5rem;
}
.ab-inner { max-width: 1100px; margin: 0 auto; }

.ab-eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #6366f1, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.6rem;
}
.ab-title {
  font-size: clamp(1.625rem, 3.5vw, 2.5rem);
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.025em;
  margin-bottom: 0.75rem;
  line-height: 1.2;
  text-shadow: 0 2px 20px rgba(0,0,0,0.4);
}
.ab-subtitle {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 2.5rem;
  max-width: 640px;
}

.grad-text {
  background: linear-gradient(90deg, #818cf8, #06b6d4, #a78bfa, #818cf8);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradShift 5s ease-in-out infinite;
}
@keyframes gradShift {
  0%,100% { background-position: 0% 50%; }
  50%     { background-position: 100% 50%; }
}

/* ══════════════════════════════════════
   OVERVIEW
══════════════════════════════════════ */
.overview-section { padding-top: 3.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}
.overview-title {
  font-size: clamp(1.875rem, 4vw, 3rem);
  font-weight: 900;
  color: #f1f5f9;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 1.25rem;
  text-shadow: 0 2px 30px rgba(0,0,0,0.5);
}
.overview-desc {
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.85;
  margin-bottom: 1.75rem;
}
.overview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  font-size: 0.72rem;
  font-weight: 500;
  color: #a5b4fc;
}

.overview-stats {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: rgba(8,13,26,0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 1.5rem;
  overflow: hidden;
}
.stat-block { padding: 1.75rem 2rem; }
.stat-num {
  display: block;
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #f1f5f9, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 0.3rem;
}
.stat-num sup { font-size: 0.875rem; }
.stat-label {
  display: block;
  font-size: 0.7rem;
  color: #6366f1;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 0.625rem;
}
.stat-detail { font-size: 0.8125rem; color: #475569; line-height: 1.7; }
.stat-divider { height: 1px; background: rgba(99,102,241,0.1); }

/* ══════════════════════════════════════
   FEATURES
══════════════════════════════════════ */
.feat-section { background: rgba(8,13,26,0.3); border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); }
.feat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.feat-card {
  padding: 1.625rem;
  background: rgba(8,13,26,0.75);
  backdrop-filter: blur(24px);
  border-radius: 1.25rem;
  border: 1px solid rgba(255,255,255,0.04);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.feat-card-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--fc), transparent 55%);
  opacity: 0.07;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.feat-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--fc) 35%, transparent);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 40px var(--fg);
}
.feat-card:hover .feat-card-bg { opacity: 0.14; }
.feat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}
.feat-icon-wrap {
  width: 2.75rem; height: 2.75rem;
  border-radius: 0.875rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.feat-icon { width: 1.25rem; height: 1.25rem; color: #e2e8f0; }
.feat-title { font-size: 0.9375rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.25rem; }
.feat-badge {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}
.feat-desc { font-size: 0.8125rem; color: #475569; line-height: 1.75; margin-bottom: 1rem; position: relative; z-index: 1; }
.feat-points {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  position: relative;
  z-index: 1;
  list-style: none;
  padding: 0; margin: 0;
}
.feat-points li {
  font-size: 0.75rem;
  color: #475569;
  padding-left: 1rem;
  position: relative;
  line-height: 1.5;
}
.feat-points li::before {
  content: '›';
  position: absolute;
  left: 0;
  color: #6366f1;
  font-weight: 700;
}

/* ══════════════════════════════════════
   HOW IT WORKS — 수직 타임라인
══════════════════════════════════════ */
.how-section { border-bottom: 1px solid rgba(255,255,255,0.04); }
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.step-row {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.step-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2.5rem;
}
.step-badge {
  width: 2.5rem; height: 2.5rem;
  border-radius: 50%;
  background: rgba(99,102,241,0.15);
  border: 1px solid rgba(99,102,241,0.35);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-num-inner {
  font-size: 0.7rem;
  font-weight: 800;
  color: #818cf8;
  letter-spacing: 0.04em;
}
.step-line {
  width: 1px;
  flex: 1;
  min-height: 1.5rem;
  background: linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05));
  margin: 0.25rem 0;
}
.step-content {
  padding-bottom: 2rem;
  flex: 1;
}
.step-meta {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
  padding-top: 0.4rem;
}
.step-icon { font-size: 1.1rem; }
.step-title { font-size: 1rem; font-weight: 700; color: #e2e8f0; }
.step-desc { font-size: 0.8375rem; color: #475569; line-height: 1.78; margin-bottom: 0.75rem; }
.step-tips { display: flex; flex-direction: column; gap: 0.3rem; }
.step-tip {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.76rem;
  color: #334155;
  line-height: 1.5;
}
.tip-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
  margin-top: 0.35rem;
}

/* ══════════════════════════════════════
   DATA SOURCES
══════════════════════════════════════ */
.sources-section { background: rgba(8,13,26,0.3); border-bottom: 1px solid rgba(255,255,255,0.04); }
.sources-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.source-card {
  padding: 1.5rem;
  background: rgba(8,13,26,0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 1.25rem;
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}
.source-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--sc);
  opacity: 0;
  transition: opacity 0.3s;
}
.source-card:hover {
  border-color: color-mix(in srgb, var(--sc) 30%, transparent);
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.35);
}
.source-card:hover::after { opacity: 0.7; }
.source-top {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 0.875rem;
}
.source-icon-wrap {
  width: 2.5rem; height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.source-icon { font-size: 1.1rem; }
.source-name { font-size: 0.875rem; font-weight: 700; color: #e2e8f0; }
.source-type { font-size: 0.65rem; color: #475569; margin-top: 0.1rem; }
.source-desc { font-size: 0.78rem; color: #475569; line-height: 1.75; margin-bottom: 1rem; }
.source-tag-row { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.source-tag {
  font-size: 0.62rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  color: #475569;
}

/* ══════════════════════════════════════
   FAQ
══════════════════════════════════════ */
.faq-section { border-bottom: 1px solid rgba(255,255,255,0.04); }
.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.faq-card {
  padding: 1.5rem;
  background: rgba(8,13,26,0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 1.25rem;
  transition: border-color 0.25s, transform 0.25s;
}
.faq-card:hover { border-color: rgba(99,102,241,0.2); transform: translateY(-3px); }
.faq-q {
  font-size: 0.875rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 0.625rem;
  line-height: 1.4;
}
.faq-q::before { content: 'Q. '; color: #6366f1; }
.faq-a {
  font-size: 0.8125rem;
  color: #475569;
  line-height: 1.78;
}

/* ══════════════════════════════════════
   FOOTER / TECH STACK
══════════════════════════════════════ */
.footer-section { padding-bottom: 3rem; }
.tech-row {
  display: flex;
  gap: 0;
  background: rgba(8,13,26,0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.25rem;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.tech-block { padding: 1.5rem 2rem; flex: 1; }
.tech-divider { width: 1px; background: rgba(255,255,255,0.04); flex-shrink: 0; }
.tech-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6366f1;
  margin-bottom: 0.75rem;
}
.tech-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.tech-chip {
  font-size: 0.72rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  color: #94a3b8;
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: rgba(8,13,26,0.5);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 1.25rem;
}
.footer-brand { display: flex; align-items: center; gap: 1rem; }
.footer-logo-icon {
  width: 2.25rem; height: 2.25rem;
  border-radius: 0.75rem;
  background: rgba(99,102,241,0.15);
  border: 1px solid rgba(99,102,241,0.25);
  display: flex; align-items: center; justify-content: center;
  color: #818cf8;
}
.footer-name { font-size: 0.875rem; font-weight: 700; color: #e2e8f0; }
.footer-sub { font-size: 0.72rem; color: #334155; margin-top: 0.15rem; }

.footer-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border-radius: 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.25s ease;
  box-shadow: 0 6px 24px rgba(99,102,241,0.4);
}
.footer-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(99,102,241,0.5); }

/* ══════════════════════════════════════
   SCROLL ANIMATIONS
══════════════════════════════════════ */
[data-animate] {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
[data-animate].in-view {
  opacity: 1;
  transform: translateY(0);
}
</style>
