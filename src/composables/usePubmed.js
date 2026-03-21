import { ref } from 'vue'
import axios from 'axios'
import { ncbiLimiter } from '../utils/rateLimiter.js'
import { parseEFetchXML } from '../utils/xmlParser.js'
import { parseYear, formatAuthors, stripHtml, extractId } from '../utils/formatters.js'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const API_KEY = import.meta.env.VITE_NCBI_API_KEY || undefined

function apiParams(extra = {}) {
  return API_KEY ? { ...extra, api_key: API_KEY } : extra
}

async function ncbiGet(endpoint, params) {
  return ncbiLimiter.enqueue(async () => {
    const res = await axios.get(`${BASE}/${endpoint}`, { params: apiParams(params) })
    if (res.data?.error) throw new Error(`NCBI: ${res.data.error}`)
    if (res.data?.esearchresult?.ERROR) throw new Error(res.data.esearchresult.ERROR)
    return res.data
  })
}

function buildTerm(query, filters = {}) {
  let term = `${query}[tiab]`
  if (filters.yearFrom && filters.yearTo) term += ` AND ${filters.yearFrom}:${filters.yearTo}[dp]`
  if (filters.pubtype) term += ` AND ${filters.pubtype}[pt]`
  if (filters.freeFullText) term += ` AND free full text[filter]`
  return term
}

function mapSummaryItem(uid, item) {
  return {
    pmid:           uid,
    title:          stripHtml(item.title ?? ''),
    authors:        formatAuthors(item.authors),
    journal:        item.source ?? '',
    year:           parseYear(item.pubdate),
    doi:            item.doi || extractId(item.articleids, 'doi'),
    pmcId:          extractId(item.articleids, 'pmc'),
    hasAbstract:    item.attributes?.includes('Has Abstract') ?? false,
    pubtype:        item.pubtype ?? [],
    abstract:       null,
    abstractFailed: false,
    meshTerms:      [],
    chemicals:      [],
    citationCount:  null,
    rcr:            null,
  }
}

export function usePubmed() {
  const results       = ref([])
  const totalCount    = ref(0)
  const isLoading     = ref(false)
  const isLoadingMore = ref(false)
  const error         = ref(null)

  // 더보기용 상태 저장
  let lastQuery   = ''
  let lastFilters = {}
  let offset      = 0

  const canLoadMore = ref(false)  // 더 가져올 결과가 있는지

  async function search(query, filters = {}) {
    if (!query.trim()) return
    isLoading.value = true
    error.value = null
    results.value = []
    totalCount.value = 0
    canLoadMore.value = false
    lastQuery = query
    lastFilters = filters
    offset = 0

    try {
      const newCards = await fetchPage(query, filters, 0)
      results.value = newCards
      offset = newCards.length

      const pmidsWithAbstract = newCards.filter((p) => p.hasAbstract).map((p) => p.pmid)
      if (pmidsWithAbstract.length > 0) fetchAbstractsBatch(pmidsWithAbstract)

      canLoadMore.value = offset < Math.min(totalCount.value, 10000)
    } catch (err) {
      console.error(err)
      error.value = '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!lastQuery || isLoadingMore.value || !canLoadMore.value) return
    isLoadingMore.value = true

    try {
      const newCards = await fetchPage(lastQuery, lastFilters, offset)
      results.value.push(...newCards)
      offset += newCards.length

      const pmidsWithAbstract = newCards.filter((p) => p.hasAbstract).map((p) => p.pmid)
      if (pmidsWithAbstract.length > 0) fetchAbstractsBatch(pmidsWithAbstract)

      canLoadMore.value = offset < Math.min(totalCount.value, 10000)
    } catch (err) {
      console.error(err)
    } finally {
      isLoadingMore.value = false
    }
  }

  // ESearch + ESummary 공통 로직 (retstart만 다름)
  async function fetchPage(query, filters, retstart) {
    const searchData = await ncbiGet('esearch.fcgi', {
      db: 'pubmed',
      term: buildTerm(query, filters),
      retmax: 20,
      retstart,
      retmode: 'json',
      sort: 'relevance',
    })

    const idlist = searchData.esearchresult?.idlist ?? []
    if (retstart === 0) totalCount.value = parseInt(searchData.esearchresult?.count ?? '0')
    if (idlist.length === 0) return []

    const summaryData = await ncbiGet('esummary.fcgi', {
      db: 'pubmed',
      id: idlist.join(','),
      retmode: 'json',
    })

    const uids = summaryData.result?.uids ?? []
    return uids.map((uid) => mapSummaryItem(uid, summaryData.result[uid]))
  }

  // 배치 EFetch
  async function fetchAbstractsBatch(pmids) {
    try {
      const res = await ncbiLimiter.enqueue(() =>
        axios.get(`${BASE}/efetch.fcgi`, {
          params: apiParams({ db: 'pubmed', id: pmids.join(','), retmode: 'xml' }),
        })
      )
      const parsed = parseEFetchXML(res.data)
      parsed.forEach(({ pmid, abstract, meshTerms, chemicals }) => {
        const card = results.value.find((p) => p.pmid === pmid)
        if (card) {
          card.abstract  = abstract
          card.meshTerms = meshTerms
          card.chemicals = chemicals
        }
      })
    } catch (err) {
      console.warn('배치 EFetch 실패:', err.message)
      pmids.forEach((pmid) => {
        const card = results.value.find((p) => p.pmid === pmid)
        if (card && card.abstract === null) card.abstractFailed = true
      })
    }
  }

  // 단건 EFetch fallback
  async function fetchAbstractSingle(pmid) {
    const card = results.value.find((p) => p.pmid === pmid)
    if (!card || card.abstract !== null) return
    try {
      const res = await ncbiLimiter.enqueue(() =>
        axios.get(`${BASE}/efetch.fcgi`, {
          params: apiParams({ db: 'pubmed', id: pmid, retmode: 'xml' }),
        })
      )
      const [parsed] = parseEFetchXML(res.data)
      if (parsed && card) {
        card.abstract  = parsed.abstract
        card.meshTerms = parsed.meshTerms
        card.chemicals = parsed.chemicals
      }
    } catch (err) {
      console.warn('단건 EFetch 실패:', err.message)
      if (card) card.abstractFailed = true
    }
  }

  // 연도별 전체 카운트
  const yearCounts    = ref({})
  const isChartLoading = ref(false)

  async function fetchYearCounts(query, filters = {}) {
    isChartLoading.value = true
    yearCounts.value = {}

    const currentYear = new Date().getFullYear()
    const years = []
    for (let y = 2000; y <= currentYear; y++) years.push(y)

    await Promise.all(
      years.map(async (year) => {
        try {
          const data = await ncbiGet('esearch.fcgi', {
            db: 'pubmed',
            term: `${buildTerm(query, filters)} AND ${year}[dp]`,
            retmax: 0,
            retmode: 'json',
          })
          const count = parseInt(data.esearchresult?.count ?? '0')
          if (count > 0) yearCounts.value[year] = count
        } catch { /* 연도별 실패 무시 */ }
      })
    )

    isChartLoading.value = false
  }

  return {
    results, totalCount, isLoading, isLoadingMore, canLoadMore, error,
    search, loadMore, fetchAbstractSingle,
    yearCounts, isChartLoading, fetchYearCounts,
  }
}
