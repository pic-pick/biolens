import { ref } from 'vue'
import { fetchS2Paper, fetchICitedBy, fetchPubmedSummaries } from './useSemanticScholar.js'

function resolveNodeId(s2item) {
  if (!s2item?.paperId) return null
  const pmid = s2item.externalIds?.PubMed
  return pmid ? String(pmid) : `s2:${s2item.paperId}`
}

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

const MAX_S2  = 15   // S2에서 가져올 선행/후속 최대 수
const MAX_ICITE = 10  // iCite에서 추가할 후속 최대 수

export function useNetwork() {
  const nodes       = ref([])
  const edges       = ref([])
  const isLoading   = ref(false)
  const loadedCount = ref(0)
  const totalCount  = ref(0)
  const statusMsg   = ref('')

  let _onNodeChange = null
  let _onEdgeChange = null
  let nodeMap = new Map()
  let edgeSet = new Set()

  function setLiveCallbacks(onNode, onEdge) {
    _onNodeChange = onNode
    _onEdgeChange = onEdge
  }

  function _addNode(node) {
    if (nodeMap.has(node.id)) return
    nodeMap.set(node.id, node)
    nodes.value.push(node)
    _onNodeChange?.('add', [node])
  }

  function _addEdge(from, to, group) {
    const key = `${from}→${to}`
    if (edgeSet.has(key) || from === to) return
    edgeSet.add(key)
    const color = group === 'citation'
      ? { color: '#f59e0b60', highlight: '#fbbf24', hover: '#fcd34d' }
      : { color: '#3b82f660', highlight: '#60a5fa', hover: '#93c5fd' }
    const edge = { id: key, from, to, group, color }
    edges.value.push(edge)
    _onEdgeChange?.('add', [edge])
  }

  /**
   * 단일 논문 모드: 선택된 스크랩 논문 하나의 선행/후속 네트워크 로드
   */
  async function buildSinglePaperGraph(paper) {
    nodeMap.clear()
    edgeSet.clear()
    nodes.value = []
    edges.value = []
    isLoading.value   = true
    loadedCount.value = 0
    totalCount.value  = 2   // S2 + iCite 두 단계

    // 스크랩 논문 노드
    _addNode({
      id:    paper.pmid,
      label: truncate(paper.title, 42),
      title: `📌 [${paper.year}] ${paper.title}`,
      group: 'scrapped',
      data:  paper,
    })

    // ── S2: 선행 연구(references) + 후속 연구(citations) ──
    statusMsg.value = 'Semantic Scholar 조회 중...'
    try {
      const s2 = await fetchS2Paper(paper.pmid)

      for (const ref of (s2?.references ?? []).slice(0, MAX_S2)) {
        const refId = resolveNodeId(ref)
        if (!refId) continue
        _addNode({
          id:    refId,
          label: truncate(ref.title || refId, 40),
          title: `📎 [${ref.year ?? '?'}] ${ref.title || refId}`,
          group: 'reference',
          data:  { pmid: ref.externalIds?.PubMed, s2id: ref.paperId, title: ref.title, year: ref.year, citationCount: ref.citationCount },
        })
        _addEdge(refId, paper.pmid, 'reference')   // 선행 → 스크랩
      }

      for (const cit of (s2?.citations ?? []).slice(0, MAX_S2)) {
        const citId = resolveNodeId(cit)
        if (!citId) continue
        _addNode({
          id:    citId,
          label: truncate(cit.title || citId, 40),
          title: `🔗 [${cit.year ?? '?'}] ${cit.title || citId}`,
          group: 'citation',
          data:  { pmid: cit.externalIds?.PubMed, s2id: cit.paperId, title: cit.title, year: cit.year, citationCount: cit.citationCount },
        })
        _addEdge(paper.pmid, citId, 'citation')    // 스크랩 → 후속
      }
    } catch (err) {
      console.warn('[Network] S2 실패:', err.message)
    }
    loadedCount.value = 1

    // ── iCite: 추가 후속 연구 (S2에 없는 논문 보충) ──
    statusMsg.value = 'iCite 추가 인용 조회 중...'
    try {
      const citedByMap = await fetchICitedBy([paper.pmid])
      const newIds = (citedByMap[paper.pmid] ?? [])
        .map(String)
        .filter(id => !nodeMap.has(id))
        .slice(0, MAX_ICITE)

      if (newIds.length > 0) {
        const summaries = await fetchPubmedSummaries(newIds)
        for (const citId of newIds) {
          const info = summaries[citId] ?? {}
          _addNode({
            id:    citId,
            label: truncate(info.title || `PMID ${citId}`, 40),
            title: info.title ? `🔗 [${info.year}] ${info.title}` : `PMID ${citId}`,
            group: 'citation',
            data:  { pmid: citId, title: info.title, year: info.year, author: info.author, journal: info.journal },
          })
          _addEdge(paper.pmid, citId, 'citation')
        }
      }
    } catch { /* 무시 */ }
    loadedCount.value = 2

    isLoading.value = false
    statusMsg.value = ''
  }

  return {
    nodes, edges, isLoading, loadedCount, totalCount, statusMsg,
    buildSinglePaperGraph, setLiveCallbacks,
  }
}
