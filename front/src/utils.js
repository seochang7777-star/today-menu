/**
 * utils.js — 공통 유틸리티 함수
 */

/**
 * processTags — DB에 콤마로 꼬여 들어간 텍스트 정제
 * ["오이, 고등어, 낙지", "한식"] → ["오이", "고등어", "낙지", "한식"]
 */
export function processTags(rawPrefs) {
  if (!rawPrefs) return []
  if (Array.isArray(rawPrefs)) {
    const flat = rawPrefs.flatMap((item) =>
      typeof item === 'string' ? item.split(',') : item
    )
    return [...new Set(flat.map((v) => v.trim()).filter(Boolean))]
  }
  return []
}
