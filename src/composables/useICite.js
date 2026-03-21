import axios from 'axios'

const ICITE_URL = 'https://icite.od.nih.gov/api/pubs'

/**
 * PMID 배열로 iCite 일괄 조회
 * Rate Limit 없음 — rateLimiter 불필요
 * @returns {Map<string, {citationCount, rcr}>}
 */
export async function fetchCitations(pmids = []) {
  if (pmids.length === 0) return new Map()

  try {
    const res = await axios.get(ICITE_URL, {
      params: { pmids: pmids.join(',') },
    })
    const map = new Map()
    for (const pub of res.data?.data ?? []) {
      map.set(String(pub.pmid), {
        citationCount: pub.citation_count ?? 0,
        rcr:           pub.relative_citation_ratio ?? null,
      })
    }
    return map
  } catch (err) {
    console.warn('iCite 요청 실패:', err.message)
    return new Map()
  }
}
