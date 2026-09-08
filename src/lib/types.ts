/**
 * The wire contract between this UI and the FastAPI backend.
 *
 * PROPOSAL — not yet signed off by the backend team. Everything here mirrors
 * PLAN.md section 1. Change this file first when the backend counters; the
 * compiler will then point at every place that needs updating.
 */

/** ISO 639-1 codes we support. `en` first because it is the fallback. */
export const LANGS = ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'or'] as const
export type Lang = (typeof LANGS)[number]

/** Web Speech tags. Same order as LANGS. */
export const LANG_TAGS: Record<Lang, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
}

/** How the answer text is written. Romanized Hinglish in -> romanized out. */
export type Script = 'roman' | 'native'

export const PERSONAS = ['farmer', 'pilot', 'disaster', 'researcher'] as const
export type Persona = (typeof PERSONAS)[number]

/** IMD colour codes. `green` means no warning. */
export const SEVERITIES = ['red', 'orange', 'yellow', 'green'] as const
export type Severity = (typeof SEVERITIES)[number]

export interface Place {
  name: string
  lat: number
  lon: number
  tz?: string
}

/** What we send for every query. */
export interface QueryRequest {
  query: string
  lang: Lang
  script: Script
  persona: Persona
  place: Place
  /** Anonymous id from localStorage. Spec section 11. */
  user_id: string
  units?: 'metric' | 'imperial'
}

export interface AnswerParts {
  action: string
  why: string
  window: string
  risk: string
}

export interface Answer {
  text: string
  lang: Lang
  script: Script
  /** lang_tag comes from the backend. Never derived here. */
  tts?: { text: string; lang_tag: string }
  /** Present when persona is farmer. Render as Action / Why / Window / Risk. */
  parts?: AnswerParts
}

export interface Alert {
  /** Stable id. Dedupe and dismiss-suppression both key off this. */
  id: string
  severity: Severity
  hazard: string
  headline: string
  instruction: string
  area: string
  valid_from: string
  valid_to: string
}

/** Researcher payload. `csv` / `json` come from the backend when possible. */
export interface DataTable {
  kind: 'table' | 'none'
  columns?: string[]
  rows?: (string | number)[][]
  csv?: string
  json?: unknown
}

export interface MethodNote {
  model: string
  resolution: string
  run: string
  source: string
  range: { from: string; to: string }
}

export interface Source {
  name: string
  observed_at: string
}

export interface QueryResponse {
  /** Echoed from the request. Lets the frontend render the right persona
   *  shape even after the user has switched personas since asking. */
  persona: Persona
  answer: Answer
  intent: string
  vars: string[]
  time?: { from: string; to: string; tz: string }
  place: Place
  alerts: Alert[]
  advisory?: { text: string; rules_hit: string[] }
  data?: DataTable
  method: MethodNote
  /** Always render. If empty, show "source: unknown" — never invent one. */
  sources: Source[]
  meta: {
    request_id: string
    /** `fallback` means the rule engine answered, not the LLM. */
    engine: 'llm' | 'fallback'
    latency_ms: number
  }
}

/** Frontend-only: what hangs in the scroll list. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
  response?: QueryResponse
  /** True when served from fixtures instead of the backend. */
  demo?: boolean
  error?: string
}
