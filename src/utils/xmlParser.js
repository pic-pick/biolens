/**
 * EFetch XML 응답에서 각 논문의 초록, MeSH 용어, 화학물질을 파싱해 배열로 반환
 * @param {string} xmlText - EFetch 응답 XML 문자열
 * @returns {Array<{pmid, abstract, meshTerms, chemicals}>}
 */
export function parseEFetchXML(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const articles = doc.querySelectorAll('PubmedArticle')

  return Array.from(articles).map((article) => {
    const pmid = article.querySelector('PMID')?.textContent ?? null

    // 일반 초록 + 구조화 초록(Label 속성) 모두 처리
    const abstractNodes = article.querySelectorAll('AbstractText')
    const abstract = abstractNodes.length > 0
      ? Array.from(abstractNodes).map((node) => {
          const label = node.getAttribute('Label')
          return label ? `${label}: ${node.textContent}` : node.textContent
        }).join('\n\n')
      : null  // Letter, Editorial 등 초록 없는 논문

    const meshTerms = Array.from(
      article.querySelectorAll('MeshHeading DescriptorName')
    ).map((el) => el.textContent)

    const chemicals = Array.from(
      article.querySelectorAll('Chemical NameOfSubstance')
    ).map((el) => el.textContent)

    return { pmid, abstract, meshTerms, chemicals }
  })
}
