/**
 * Offline answers for the demo.
 *
 * IMPORTANT: every number below is a PLACEHOLDER. Spec section 5 says "never state a
 * number an API did not return". These exist so the demo survives dead Wi-Fi, so replace
 * them with recorded real responses before you present (spec section 14, rule 3).
 *
 * Until then the UI badges them as demo data so nothing looks like a real observation.
 */

import type { Lang, Persona, Place, QueryRequest, QueryResponse } from './types'

export const PLACES: Place[] = [
  { name: 'Pune', lat: 18.5204, lon: 73.8567, tz: 'Asia/Kolkata' },
  { name: 'Nashik', lat: 19.9975, lon: 73.7898, tz: 'Asia/Kolkata' },
  { name: 'Nagpur', lat: 21.1458, lon: 79.0882, tz: 'Asia/Kolkata' },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
  { name: 'Puri, Odisha', lat: 19.8135, lon: 85.8312, tz: 'Asia/Kolkata' },
]

export function placeByName(name: string): Place | undefined {
  const q = name.trim().toLowerCase()
  return PLACES.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()))
}

const run = '2026-09-08T14:00 IST'

function base(over: Partial<QueryResponse> & Pick<QueryResponse, 'answer' | 'place'>): QueryResponse {
  return {
    persona: 'farmer',
    intent: 'forecast',
    vars: ['precipitation'],
    alerts: [],
    method: {
      model: 'GFS 0.25',
      resolution: '0.25',
      run,
      source: 'Open-Meteo',
      range: { from: '2026-09-08', to: '2026-09-12' },
    },
    sources: [{ name: 'Open-Meteo GFS', observed_at: run }],
    meta: { request_id: 'fixture', engine: 'fallback', latency_ms: 0 },
    ...over,
  }
}

interface Fixture {
  id: string
  persona: Persona
  lang: Lang
  /** Matched against the lowercased query. */
  hints: string[]
  response: QueryResponse
}

// By name, not by index: reordering PLACES must not silently rebind these.
const pune = placeByName('Pune')!
const nashik = placeByName('Nashik')!
const nagpur = placeByName('Nagpur')!
const mumbai = placeByName('Mumbai')!
const puri = placeByName('Puri, Odisha')!

export const FIXTURES: Fixture[] = [
  {
    // Demo script 1: voice, Hinglish.
    id: 'pune-farmer-hinglish',
    persona: 'farmer',
    lang: 'hi',
    hints: ['pune', 'पुणे', 'baarish', 'barish', 'dawaai'],
    response: base({
      answer: {
        text: 'Thursday tak barish nahi. Aaj 11 baje se pehle chhidakav kar do. Friday ko 68 mm barish hai — Thursday raat chhidakav mat karna.',
        lang: 'hi',
        script: 'roman',
        tts: {
          text: 'गुरुवार तक बारिश नहीं। आज 11 बजे से पहले छिड़काव कर दें। शुक्रवार को 68 मिमी बारिश है — गुरुवार रात छिड़काव न करें।',
          lang_tag: 'hi-IN',
        },
        parts: {
          action: 'Aaj subah 11 baje se pehle chhidakav kar do.',
          why: 'Hawa 8 km/h hai aur Thursday tak barish nahi.',
          window: 'Thursday shaam ke baad chhidakav band.',
          risk: 'Friday ko 68 mm barish — spray dhul jayega.',
        },
      },
      place: pune,
      intent: 'forecast',
      vars: ['precipitation', 'wind_gusts_10m'],
      alerts: [
        {
          id: 'pune-wind-2026-09-11',
          severity: 'orange',
          hazard: 'wind',
          headline: 'Gusts 60 km/h, Friday',
          instruction: 'Secure loose structures. Do not spray.',
          area: 'Pune',
          valid_from: '2026-09-11T00:00+05:30',
          valid_to: '2026-09-11T23:59+05:30',
        },
      ],
      advisory: {
        text: 'Advisory only — confirm with your local Krishi Vigyan Kendra.',
        rules_hit: ['rain_24h_ge_10mm'],
      },
    }),
  },
  {
    // Demo script 2: aviation.
    id: 'mumbai-pilot',
    persona: 'pilot',
    lang: 'en',
    hints: ['mumbai', 'departure', 'crosswind', 'visibility', 'utc'],
    response: base({
      answer: {
        text: 'VABB 090600 UTC. Wind 250/12G20. Crosswind component 9 kt on RWY 27. Visibility 6000 m. Ceiling 1500 ft SCT. Temp 28/25. No significant weather.',
        lang: 'en',
        script: 'native',
        tts: { text: 'Mumbai zero nine zero six zero zero UTC...', lang_tag: 'en-IN' },
      },
      place: mumbai,
      persona: 'pilot',
      intent: 'forecast',
      vars: ['wind_speed_10m', 'wind_gusts_10m', 'visibility', 'cloud_cover'],
      alerts: [],
    }),
  },
  {
    // Demo script 3: Marathi text.
    id: 'nashik-farmer-marathi',
    persona: 'farmer',
    lang: 'mr',
    hints: ['nashik', 'नाशिक', 'पाऊस'],
    response: base({
      answer: {
        text: 'गुरुवारपर्यंत पाऊस नाही. आज सकाळी ११ च्या आत फवारणी करा. शुक्रवारी ६८ मिमी पाऊस आहे — गुरुवारी रात्री फवारणी करू नका.',
        lang: 'mr',
        script: 'native',
        tts: {
          text: 'गुरुवारपर्यंत पाऊस नाही. आज सकाळी ११ च्या आत फवारणी करा.',
          lang_tag: 'mr-IN',
        },
        parts: {
          action: 'आज सकाळी ११ च्या आत फवारणी करा.',
          why: 'वारा ८ किमी/तास आहे आणि गुरुवारपर्यंत पाऊस नाही.',
          window: 'गुरुवार संध्याकाळनंतर फवारणी थांबवा.',
          risk: 'शुक्रवारी ६८ मिमी पाऊस — फवारणी वाहून जाईल.',
        },
      },
      place: nashik,
      intent: 'forecast',
      vars: ['precipitation', 'wind_gusts_10m'],
      alerts: [
        {
          id: 'nashik-rain-2026-09-11',
          severity: 'yellow',
          hazard: 'heavy_rain',
          headline: 'Heavy rain Friday, 68 mm',
          instruction: 'Open field drains. Delay harvest.',
          area: 'Nashik',
          valid_from: '2026-09-11T00:00+05:30',
          valid_to: '2026-09-11T23:59+05:30',
        },
      ],
      advisory: {
        text: 'Advisory only — confirm with your local Krishi Vigyan Kendra.',
        rules_hit: ['rain_24h_ge_10mm'],
      },
    }),
  },
  {
    // Demo script 4: disaster manager.
    id: 'odisha-disaster',
    persona: 'disaster',
    lang: 'en',
    hints: ['odisha', 'odisa', 'coastal', 'alert', 'puri', '48'],
    response: base({
      answer: {
        text: 'ORANGE — damaging wind, coastal Odisha. Valid 11 Sep 00:00 to 11 Sep 23:59 IST.',
        lang: 'en',
        script: 'native',
        tts: { text: 'Orange alert, damaging wind, coastal Odisha.', lang_tag: 'en-IN' },
      },
      place: puri,
      persona: 'disaster',
      intent: 'alerts',
      vars: ['wind_gusts_10m', 'pressure_msl'],
      alerts: [
        {
          id: 'odisha-wind-2026-09-11',
          severity: 'orange',
          hazard: 'wind',
          headline: 'Gusts 65 km/h, coastal Odisha',
          instruction:
            'Checklist: 1. Suspend marine activity. 2. Move evacuees to pucca shelters. 3. Pre-position NDRF. 4. Open helpline. Escalation: district-level.',
          area: 'Coastal Odisha',
          valid_from: '2026-09-11T00:00+05:30',
          valid_to: '2026-09-11T23:59+05:30',
        },
      ],
      time: { from: '2026-09-09', to: '2026-09-11', tz: 'Asia/Kolkata' },
    }),
  },
  {
    // Demo script 5: researcher.
    id: 'nagpur-researcher',
    persona: 'researcher',
    lang: 'en',
    hints: ['nagpur', 'compare', 'five years', '5 years', 'rainfall', 'trend', 'percentile'],
    response: base({
      answer: {
        text: 'This week: 42.1 mm. Five-year same-window mean: 28.6 mm. Departure +13.5 mm (+47%). Percentile rank 88th against 1991-2020.',
        lang: 'en',
        script: 'native',
        tts: { text: 'This week 42.1 millimetres...', lang_tag: 'en-IN' },
      },
      place: nagpur,
      persona: 'researcher',
      intent: 'climate',
      vars: ['precipitation'],
      data: {
        kind: 'table',
        columns: ['Period', 'Rainfall (mm)', 'Departure (mm)'],
        rows: [
          ['This week', 42.1, 13.5],
          ['2025 same week', 24.3, -4.3],
          ['2024 same week', 31.8, 3.2],
          ['2023 same week', 27.5, -1.1],
          ['2022 same week', 33.0, 4.4],
          ['2021 same week', 26.4, -2.2],
        ],
        csv: 'Period,Rainfall (mm),Departure (mm)\nThis week,42.1,13.5\n2025 same week,24.3,-4.3\n2024 same week,31.8,3.2\n2023 same week,27.5,-1.1\n2022 same week,33.0,4.4\n2021 same week,26.4,-2.2\n',
        json: [
          { period: 'This week', rainfall_mm: 42.1, departure_mm: 13.5 },
          { period: '2025 same week', rainfall_mm: 24.3, departure_mm: -4.3 },
        ],
      },
      method: {
        model: 'ERA5 / Open-Meteo archive',
        resolution: '0.25',
        run,
        source: 'Open-Meteo archive API',
        range: { from: '2021-09-08', to: '2026-09-08' },
      },
    }),
  },
  {
    id: 'generic',
    persona: 'farmer',
    lang: 'en',
    hints: [],
    response: base({
      answer: {
        text: 'Demo data — no live backend. Current conditions for your location are placeholder values, not observations.',
        lang: 'en',
        script: 'native',
        tts: { text: 'Demo data. No live backend.', lang_tag: 'en-IN' },
      },
      place: pune,
    }),
  },
]

/**
 * Best fixture for a request. Scores persona, then place/language hints.
 * Always returns something: the demo must never show an endless spinner.
 *
 * ponytail: naive substring scoring, O(fixtures x hints). Fine for 6 fixtures.
 * Ceiling: it cannot tell "rain in Pune" from "no rain in Pune". If that matters,
 * replace with the real backend or a keyword table per intent — do not grow the scorer.
 */
export function pickFixture(req: Pick<QueryRequest, 'query' | 'persona' | 'lang'>): QueryResponse {
  const q = req.query.toLowerCase()
  let best = FIXTURES[FIXTURES.length - 1]
  let bestScore = -1

  for (const f of FIXTURES) {
    let score = 0
    if (f.persona === req.persona) score += 2
    if (f.lang === req.lang) score += 1
    if (f.hints.some((h) => q.includes(h))) score += 3
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }

  // Re-point the answer at the place the user actually asked about.
  const hit = PLACES.find((p) => q.includes(p.name.toLowerCase()))
  const place = hit ?? best.response.place

  return { ...best.response, place, answer: { ...best.response.answer } }
}
