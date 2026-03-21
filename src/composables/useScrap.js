import { ref } from 'vue'

// 모듈 레벨 싱글톤 — 모든 컴포넌트가 동일한 상태 공유
function load(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}

const papers      = ref(load('biolens_scraps'))
const syntheses   = ref(load('biolens_syntheses'))
const comparisons = ref(load('biolens_comparisons'))

function persist(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function useScrap() {
  // 논문 스크랩
  function scrapPaper(paper, aiSummary = null, projectId = null) {
    if (papers.value.some((p) => p.pmid === paper.pmid)) return
    papers.value.unshift({
      pmid:      paper.pmid,
      title:     paper.title,
      authors:   paper.authors,
      journal:   paper.journal,
      year:      paper.year,
      doi:       paper.doi,
      pmcId:     paper.pmcId,
      abstract:  paper.abstract,
      meshTerms: paper.meshTerms ?? [],
      aiSummary,
      projectId: projectId ?? null,
      scrapedAt: new Date().toISOString(),
    })
    persist('biolens_scraps', papers.value)
  }

  function assignToProject(pmid, projectId) {
    const paper = papers.value.find((p) => p.pmid === pmid)
    if (paper) { paper.projectId = projectId ?? null }
    persist('biolens_scraps', papers.value)
  }

  function releaseProjectPapers(projectId) {
    papers.value.forEach((p) => { if (p.projectId === projectId) p.projectId = null })
    persist('biolens_scraps', papers.value)
  }

  function unscrapPaper(pmid) {
    papers.value = papers.value.filter((p) => p.pmid !== pmid)
    persist('biolens_scraps', papers.value)
  }

  function isPaperScraped(pmid) {
    return papers.value.some((p) => p.pmid === pmid)
  }

  // 종합분석 스크랩 (논문 상세 정보 포함 저장)
  function scrapSynthesis(paperList, result) {
    const id = Date.now().toString()
    syntheses.value.unshift({
      id,
      papers: paperList.map((p) => ({
        pmid:      p.pmid,
        title:     p.title,
        authors:   p.authors,
        journal:   p.journal,
        year:      p.year,
        doi:       p.doi,
        pmcId:     p.pmcId,
        abstract:  p.abstract,
        meshTerms: p.meshTerms ?? [],
        aiSummary: p.aiSummary ?? null,
      })),
      result,
      scrapedAt: new Date().toISOString(),
    })
    persist('biolens_syntheses', syntheses.value)
    return id
  }

  function unscrapSynthesis(id) {
    syntheses.value = syntheses.value.filter((s) => s.id !== id)
    persist('biolens_syntheses', syntheses.value)
  }

  // 비교표 저장
  function scrapComparison(paperList, result) {
    const id = Date.now().toString()
    comparisons.value.unshift({
      id,
      papers: paperList.map((p) => ({
        pmid:      p.pmid,
        title:     p.title,
        authors:   p.authors,
        journal:   p.journal,
        year:      p.year,
        doi:       p.doi,
        pmcId:     p.pmcId,
        abstract:  p.abstract,
        meshTerms: p.meshTerms ?? [],
      })),
      result,
      scrapedAt: new Date().toISOString(),
    })
    persist('biolens_comparisons', comparisons.value)
    return id
  }

  function unscrapComparison(id) {
    comparisons.value = comparisons.value.filter((c) => c.id !== id)
    persist('biolens_comparisons', comparisons.value)
  }

  function reorderPapers(newOrder) {
    papers.value = newOrder
    persist('biolens_scraps', papers.value)
  }

  return {
    papers, syntheses, comparisons,
    scrapPaper, unscrapPaper, isPaperScraped,
    assignToProject, releaseProjectPapers,
    scrapSynthesis, unscrapSynthesis,
    scrapComparison, unscrapComparison,
    reorderPapers,
  }
}
