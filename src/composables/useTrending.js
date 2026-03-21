/**
 * OpenAlex 트렌딩 토픽
 * - 최근 30일 생명과학(domain 2) 논문을 topic별로 group_by
 * - 캐시: sessionStorage, 1시간
 */
import { ref } from 'vue'
import axios from 'axios'

const CACHE_KEY = 'biolens_trending_topics'
const CACHE_TTL = 60 * 60 * 1000 // 1시간

// 모듈 레벨 싱글턴
const topics    = ref([])   // [{ query, ko }]
const isLoading = ref(false)
const error     = ref(null)
let fetchPromise = null

function getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* ignore */ }
}

function getFromDate() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

async function _fetch() {
  const cached = getCache()
  if (cached) { topics.value = cached; return }

  isLoading.value = true
  error.value     = null
  try {
    const res = await axios.get('https://api.openalex.org/works', {
      params: {
        filter:   `from_publication_date:${getFromDate()},primary_topic.domain.id:https://openalex.org/domains/2`,
        group_by: 'primary_topic.id',
        per_page: 25,
        mailto:   'biolens-app@example.com',
      },
    })

    const groups = res.data?.group_by ?? []

    // 상위 8개 토픽을 PubMed 검색어로 변환
    const result = groups
      .slice(0, 8)
      .map((g) => ({
        query: g.key_display_name,
        ko:    '',          // 한글 번역은 없음 (OpenAlex에서 제공 안 함)
        count: g.count,
      }))
      .filter((t) => t.query && t.query !== 'unknown')

    topics.value = result
    setCache(result)
  } catch (err) {
    error.value = err.message ?? 'fetch failed'
  } finally {
    isLoading.value = false
  }
}

export function useTrending() {
  if (!fetchPromise) {
    fetchPromise = _fetch()
  }
  return { topics, isLoading, error }
}
