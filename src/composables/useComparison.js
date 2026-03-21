import axios from 'axios'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const URL     = 'https://api.openai.com/v1/chat/completions'

const SYSTEM_PROMPT = `당신은 신약개발 분야의 전문 연구 분석가입니다.
제공된 논문들을 읽고 각 논문의 핵심 요소를 한국어로 추출하여 비교 분석하세요.

반드시 아래 JSON 형식으로만 응답하세요. 정보가 없는 필드는 "정보 없음"으로 표기하세요:
{
  "papers": [
    {
      "pmid": "논문 PMID",
      "studyDesign": "연구 설계 (예: 무작위 대조 시험, 코호트 연구, 체계적 문헌고찰 등)",
      "population": "대상군 및 표본 크기 (예: 성인 제2형 당뇨 환자 n=342)",
      "intervention": "중재 또는 노출 요인",
      "primaryOutcome": "주요 결과 지표 및 수치",
      "limitations": "주요 한계점",
      "evidenceLevel": "근거 수준 코드만 (1a, 1b, 2a, 2b, 3, 4 중 하나)"
    }
  ],
  "consensus": "논문들 간 공통적으로 일치하는 연구 결과 (2-3문장)",
  "conflicts": "논문들 간 상충되거나 이견이 있는 부분. 없으면 null",
  "researchGap": "아직 해결되지 않은 연구 갭 또는 향후 과제 (1-2문장)"
}

근거 수준 판단 기준:
1a = 메타분석 / 체계적 문헌고찰 (RCT)
1b = 단일 RCT
2a = 코호트 연구 / 환자-대조군 연구 (잘 설계됨)
2b = 코호트 / 환자-대조군 (일반)
3 = 증례 보고 / 전문가 의견 기반
4 = 기초 연구 / 동물 실험 / 전문가 의견`

export async function comparePapers(papers) {
  if (!papers?.length) throw new Error('논문이 선택되지 않았습니다.')

  const input = papers.map((p, i) => {
    const pubtypes = p.pubtype?.length ? `논문 유형: ${p.pubtype.join(', ')}` : ''
    const abstract = p.abstract?.slice(0, 800) || '초록 없음'
    return `[${i + 1}] PMID: ${p.pmid} | ${p.year}년\n제목: ${p.title}\n${pubtypes}\n초록: ${abstract}`
  }).join('\n\n---\n\n')

  const res = await axios.post(URL, {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: input },
    ],
    max_tokens: 1400,
    temperature: 0.1,
    response_format: { type: 'json_object' },
  }, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })

  const raw = res.data.choices[0].message.content
  try {
    return JSON.parse(raw)
  } catch {
    // JSON 앞뒤 불필요한 텍스트 제거 후 재시도
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('AI 응답 파싱에 실패했습니다.')
  }
}
