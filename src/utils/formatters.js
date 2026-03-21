/**
 * pubdate 문자열에서 연도 추출
 * "2024 Mar 15" / "2024" / "2024 Spring" 등 형식 불규칙
 */
export function parseYear(pubdate) {
  if (!pubdate) return null
  const match = pubdate.match(/\d{4}/)
  return match ? parseInt(match[0]) : null
}

/**
 * 저자 배열에서 최대 3명 추출, 초과 시 "et al." 추가
 */
export function formatAuthors(authors = []) {
  if (!authors || authors.length === 0) return '저자 미상'
  const names = authors.slice(0, 3).map((a) => a.name)
  return authors.length > 3 ? `${names.join(', ')} et al.` : names.join(', ')
}

/**
 * 논문 제목에서 HTML 태그 제거 (<b>, <i>, <sub> 등)
 */
export function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * ESummary articleids 배열에서 특정 idtype의 value 추출
 */
export function extractId(articleids = [], idtype) {
  return articleids?.find((a) => a.idtype === idtype)?.value ?? null
}
