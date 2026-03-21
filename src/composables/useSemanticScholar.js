import axios from 'axios'
import { createRateLimiter } from '../utils/rateLimiter.js'

const KEY  = import.meta.env.VITE_SEMANTIC_SCHOLAR_KEY
const BASE = 'https://api.semanticscholar.org/graph/v1'

// 키 있음: 1 r/s / 키 없음: 100 req/5min ≈ 0.3 r/s (안전 마진)
const s2Limiter = createRateLimiter(KEY ? 1 : 0.28)

export const hasS2Key = !!KEY

// ── localStorage 24h 캐시 ──────────────────────────────────────
const CACHE_KEY = 'biolens_network_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}
function saveToCache(pmid, data) {
  const cache = loadCache()
  cache[pmid] = { data, fetchedAt: Date.now() }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* 용량 초과 시 무시 */ }
}
function getFromCache(pmid) {
  const cache = loadCache()
  const entry = cache[pmid]
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL) return null
  return entry.data
}

/**
 * Semantic Scholar에서 논문의 references & citations 조회 (by PMID)
 * @returns S2 paper object { paperId, title, year, citationCount, references[], citations[] }
 */
export async function fetchS2Paper(pmid) {
  const cached = getFromCache(pmid)
  if (cached) return cached

  return s2Limiter.enqueue(async () => {
    const fields = [
      'paperId', 'externalIds', 'title', 'year', 'citationCount',
      'references.paperId', 'references.externalIds', 'references.title',
      'references.year', 'references.citationCount',
      'citations.paperId', 'citations.externalIds', 'citations.title',
      'citations.year', 'citations.citationCount',
    ].join(',')

    const headers = KEY ? { 'x-api-key': KEY } : {}
    const res = await axios.get(`${BASE}/paper/PMID:${pmid}`, {
      params: { fields, limit: 25 },
      headers,
    })
    const data = res.data
    saveToCache(pmid, data)
    return data
  })
}

/**
 * iCite API에서 cited_by[] 배열 배치 조회 (API 키 불필요, 제한 없음)
 * @returns { [pmid]: citedByPmids[] }
 */
export async function fetchICitedBy(pmids) {
  if (!pmids.length) return {}
  try {
    const res = await axios.get('https://icite.od.nih.gov/api/pubs', {
      params: { pmids: pmids.join(',') },
    })
    const result = {}
    for (const pub of res.data?.data ?? []) {
      result[String(pub.pmid)] = pub.cited_by ?? []
    }
    return result
  } catch { return {} }
}

/**
 * PubMed esummary로 PMID 배열의 제목·연도·저자 배치 조회
 * iCite cited_by[] 노드 enrichment에 사용
 * @returns { [pmid]: { title, year, author } }
 */
export async function fetchPubmedSummaries(pmids) {
  if (!pmids.length) return {}
  const API_KEY = import.meta.env.VITE_NCBI_API_KEY
  const params = { db: 'pubmed', id: pmids.slice(0, 150).join(','), retmode: 'json' }
  if (API_KEY) params.api_key = API_KEY
  try {
    const res = await axios.get(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
      { params },
    )
    const result = res.data?.result ?? {}
    const out = {}
    for (const pmid of pmids) {
      const item = result[String(pmid)]
      if (!item || item.error) continue
      out[String(pmid)] = {
        title:  item.title?.replace(/<[^>]+>/g, '').trim() || '',
        year:   item.pubdate?.slice(0, 4) || '',
        author: item.authors?.[0]?.name || '',
        journal: item.source || '',
      }
    }
    return out
  } catch { return {} }
}

/** 캐시 전체 삭제 */
export function clearNetworkCache() {
  localStorage.removeItem(CACHE_KEY)
}
