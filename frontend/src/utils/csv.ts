/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes ("") and commas/newlines inside quotes. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field.trim())
    field = ''
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') inQuotes = true
    else if (char === ',') pushField()
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      pushField()
      rows.push(row)
      row = []
    } else field += char
  }

  if (field !== '' || row.length > 0) {
    pushField()
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell !== ''))
}

export const downloadTextFile = (filename: string, content: string, mimeType = 'text/csv') => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
