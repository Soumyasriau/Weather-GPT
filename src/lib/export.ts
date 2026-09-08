/**
 * Tiny client-side download helper. Researcher exports land here (spec section 8:
 * "Give me the raw data" -> CSV and JSON download).
 */

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Free the blob after the click has been processed. 1s is a safe margin.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Build a CSV from columns + rows. Backend usually supplies it; this is the fallback. */
export function buildCsv(columns: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number): string => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n') + '\n'
}
