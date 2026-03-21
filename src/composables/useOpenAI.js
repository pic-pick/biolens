import axios from 'axios'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const URL = 'https://api.openai.com/v1/chat/completions'

function openaiPost(body) {
  return axios.post(URL, body, { headers: { Authorization: `Bearer ${API_KEY}` } })
}

/**
 * 초록 + MeSH + 화학물질 → GPT-4o-mini 한국어 3줄 요약
 * @returns {{ summary: string[], keywords: string[] }}
 */
export async function summarizeAbstract({ abstract, meshTerms = [], chemicals = [] }) {
  if (!abstract) throw new Error('초록이 없습니다.')

  const contextLines = []
  if (meshTerms.length > 0) contextLines.push(`MeSH 용어: ${meshTerms.slice(0, 10).join(', ')}`)
  if (chemicals.length > 0) contextLines.push(`주요 약물/화합물: ${chemicals.slice(0, 5).join(', ')}`)

  const systemPrompt = `당신은 신약개발 분야의 전문 연구원입니다.
논문 초록을 읽고 신약개발 연구자에게 유용한 핵심 내용을 한국어로 요약합니다.
반드시 아래 JSON 형식으로만 응답하세요:
{"summary": ["첫번째 문장", "두번째 문장", "세번째 문장"], "keywords": ["키워드1", "키워드2", "키워드3"]}`

  const userContent = [
    contextLines.length > 0 ? contextLines.join('\n') + '\n' : '',
    `논문 초록:\n${abstract}`,
  ].join('')

  const res = await openaiPost({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(res.data.choices[0].message.content)
}

/**
 * 영어 초록 → 한국어 번역
 */
export async function translateAbstract(abstract) {
  if (!abstract) throw new Error('초록이 없습니다.')
  const res = await openaiPost({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '다음 영어 논문 초록을 자연스러운 한국어로 번역하세요. 의학·생물학 전문 용어는 한국어 번역 후 괄호 안에 영어 원어를 병기하세요. 번역문만 출력하세요.',
      },
      { role: 'user', content: abstract },
    ],
    max_tokens: 800,
    temperature: 0.2,
  })
  return res.data.choices[0].message.content.trim()
}

/**
 * 검색어 → 관련 PubMed 검색 키워드 추천
 * @returns {{ query: string, reason: string }[]}
 */
export async function suggestQueries(userQuery) {
  if (!userQuery?.trim()) throw new Error('검색어가 없습니다.')

  const systemPrompt = `You are a biomedical literature search expert.
Given a search keyword, suggest 5 related PubMed search queries that help researchers find more relevant papers.
Include MeSH terms, synonyms, and more specific subtopics.
Respond ONLY in JSON:
{"suggestions": [{"query": "...", "reason": "한국어로 한 줄 설명"}]}`

  const res = await openaiPost({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userQuery },
    ],
    max_tokens: 400,
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(res.data.choices[0].message.content).suggestions ?? []
}

/**
 * 선택된 논문 배열 → 종합 분석
 * @returns {{ commonFindings, conflictingResults, researchGaps, conclusion, keyThemes }}
 */
export async function synthesizePapers(papers) {
  if (!papers?.length) throw new Error('논문이 선택되지 않았습니다.')

  const abstracts = papers
    .map((p, i) => `[${i + 1}] ${p.title}\nAbstract: ${p.abstract}`)
    .join('\n\n')

  const systemPrompt = `당신은 신약개발 분야 전문 연구 분석가입니다.
아래 논문들을 읽고 종합적인 연구 분석을 한국어로 작성하세요.
반드시 아래 JSON 형식으로만 응답하세요:
{
  "commonFindings": "공통된 연구 결과 (2-3문장)",
  "conflictingResults": "상충되는 결과 또는 논쟁점 (없으면 null)",
  "researchGaps": "아직 해결되지 않은 연구 갭 (1-2문장)",
  "conclusion": "종합 결론 및 임상적 의의 (2-3문장)",
  "keyThemes": ["핵심 주제1", "핵심 주제2", "핵심 주제3"]
}`

  const res = await openaiPost({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: abstracts },
    ],
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(res.data.choices[0].message.content)
}
