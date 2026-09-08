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

interface OpenMeteoResponse {
  current_weather?: {
    temperature: number
    windspeed: number
    weathercode: number
    time: string
  }
}

const WEATHER_LABELS: Record<number, string> = {
  0: 'clear skies',
  1: 'mainly clear skies',
  2: 'partly cloudy skies',
  3: 'overcast skies',
  45: 'fog',
  48: 'fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'dense drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'rain showers',
  81: 'moderate rain showers',
  82: 'heavy rain showers',
  95: 'a thunderstorm',
  96: 'a thunderstorm with hail',
  99: 'a thunderstorm with hail',
}

async function fetchLiveWeather(input: QueryInput): Promise<QueryResponse> {
  const params = new URLSearchParams({
    latitude: String(input.place.lat),
    longitude: String(input.place.lon),
    current_weather: 'true',
    timezone: 'auto',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error(`weather HTTP ${response.status}`)

  const data = (await response.json()) as OpenMeteoResponse
  const current = data.current_weather
  if (!current) throw new Error('weather response missing current conditions')

  const condition = WEATHER_LABELS[current.weathercode] ?? 'variable conditions'
  return {
    persona: input.persona,
    answer: {
      text: `${input.place.name} has ${condition} at ${Math.round(current.temperature)}°C, with winds around ${Math.round(current.windspeed)} km/h. Check the hourly forecast before making weather-sensitive plans.`,
      lang: input.lang,
      script: input.script,
    },
    intent: 'current_weather',
    vars: ['temperature_2m', 'windspeed_10m', 'weathercode'],
    alerts: [],
    place: input.place,
    method: {
      model: 'Open-Meteo forecast',
      resolution: 'current',
      run: current.time,
      source: 'Open-Meteo',
      range: { from: current.time, to: current.time },
    },
    sources: [{ name: 'Open-Meteo', observed_at: current.time }],
    meta: { request_id: 'open-meteo-fallback', engine: 'fallback', latency_ms: 0 },
  }
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
    // Keep the chat useful when the planned backend is unavailable. Open-Meteo
    // gives us real current conditions before the fully offline fixture path.
    try {
      return { response: await fetchLiveWeather(input), demo: true }
    } catch {
      // Timeout, offline, 500, garbage JSON, or a weather provider outage.
      return { response: pickFixture(input), demo: true }
    }
  } finally {
    clearTimeout(timer)
  }
}
