// src/utils.js
export const processTags = (rawPrefs) => {
  if (!rawPrefs) return []
  if (Array.isArray(rawPrefs)) {
    const flat = rawPrefs.flatMap((item) =>
      typeof item === 'string' ? item.split(',') : item
    )
    return [...new Set(flat.map((v) => v.trim()).filter(Boolean))]
  }
  return []
}