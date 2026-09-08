/**
 * The only place that talks to the backend.
 *
 * Rule from spec section 5: the demo must never show an endless spinner. So every
 * failure path — timeout, bad status, malformed body, dead network — returns a
 * fixture answer instead of throwing. The caller always has something to render.
 */

// Value imports carry an explicit .ts extension so Node can run these files
// directly in scripts/ with no bundler and no test framework.
import type { Persona, Place, QueryResponse, Lang, Script } from './types'
import { pickFixture } from './fixtures.ts'
import { uid } from './uid.ts'

const BASE = '/api'
export const TIMEOUT_MS = 8000

export interface QueryResult {
  response: QueryResponse
  /** True when served from fixtures. The UI badges these as demo data. */
  demo: boolean
}

export interface QueryInput {
  query: string
  lang: Lang
  script: Script
  persona: Persona
  place: Place
}

/** Minimal shape guard. This is a trust boundary: never trust the wire. */
function looksLikeResponse(v: unknown): v is QueryResponse {
  const r = v as QueryResponse | null
  return !!r && typeof r.answer?.text === 'string' && r.answer.text.length > 0
}

export async function sendQuery(input: QueryInput): Promise<QueryResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, user_id: uid(), units: 'metric' }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data: unknown = await res.json()
    if (!looksLikeResponse(data)) throw new Error('malformed response')

    return { response: data, demo: false }
  } catch {
    // Timeout, offline, 500, garbage JSON. All the same to the user.
    return { response: pickFixture(input), demo: true }
  } finally {
    clearTimeout(timer)
  }
}
