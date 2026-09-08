# WeatherGPT — Frontend Build Plan (step by step)

Frontend only. Backend (FastAPI + LLM + Open-Meteo + alert engine) is someone else's job.
Spec: `TEAM_MESSAGE.md`.

Current state: Svelte 5.56 + Vite 8.2.2 + TypeScript scaffold, default `App.svelte`, nothing built.

---

## 0. Ground rules

- One screen: the chat. Two overlays: settings sheet, alert detail sheet. No routing (spec §12).
- Zero UI dependencies. No Tailwind, no `@vite-pwa`, no chart/map/TTS library.
- Design at 390 px. Light theme, high contrast — users stand in sunlight.
- Every answer renders source + observation time (spec §5).
- Never render a number the backend did not send.
- Chat never shows an endless spinner.

---

## 1. The contract (proposal — needs backend sign-off)

### Request `POST /api/query`

```json
{
  "query": "kal Pune mein baarish hogi kya?",
  "lang": "hi",
  "script": "roman",
  "persona": "farmer",
  "place": { "name": "Pune", "lat": 18.52, "lon": 73.85 },
  "user_id": "anon-uuid-from-localstorage",
  "units": "metric"
}
```

`lang` is sent by the UI, never detected (spec §7). `script` is `roman` or `native`.
`user_id` is the anonymous id from spec §11.

### Response

```json
{
  "answer": {
    "text": "No rain till Thursday. Spray today before 11 am...",
    "lang": "hi",
    "script": "roman",
    "tts": { "text": "...", "lang_tag": "hi-IN" },
    "parts": {
      "action": "Spray today before 11 am.",
      "why": "Wind 8 km/h, no rain till Thursday.",
      "window": "Do not spray after Thursday evening.",
      "risk": "68 mm rain Friday will wash off the spray."
    }
  },
  "intent": "forecast",
  "vars": ["precipitation"],
  "time": { "from": "2026-09-09", "to": "2026-09-12", "tz": "Asia/Kolkata" },
  "place": { "name": "Pune", "lat": 18.52, "lon": 73.85, "tz": "Asia/Kolkata" },
  "alerts": [
    {
      "id": "pune-wind-2026-09-11",
      "severity": "orange",
      "hazard": "wind",
      "headline": "Gusts 60 km/h, Friday",
      "instruction": "Secure loose structures. Do not spray.",
      "area": "Pune",
      "valid_from": "2026-09-11T00:00+05:30",
      "valid_to": "2026-09-11T23:59+05:30"
    }
  ],
  "advisory": {
    "text": "Advisory only — confirm with your local Krishi Vigyan Kendra.",
    "rules_hit": ["rain_24h_ge_10mm"]
  },
  "data": {
    "kind": "table",
    "columns": ["Date", "Rain (mm)", "Tmax (C)"],
    "rows": [["2026-09-09", 0.0, 31.2]],
    "csv": "Date,Rain (mm),Tmax (C)\n...",
    "json": [{ "date": "2026-09-09", "rain_mm": 0.0, "tmax_c": 31.2 }]
  },
  "method": {
    "model": "GFS 0.25",
    "resolution": "0.25",
    "run": "2026-09-08T14:00 IST",
    "source": "Open-Meteo",
    "range": { "from": "2026-09-09", "to": "2026-09-12" }
  },
  "sources": [{ "name": "Open-Meteo GFS", "observed_at": "2026-09-08T14:00 IST" }],
  "meta": { "request_id": "...", "engine": "llm", "latency_ms": 820 }
}
```

Frontend assumptions:
- `answer.parts` present when `persona` is `farmer` → render Action / Why / Window / Risk, never a bare paragraph.
- `data` present for `researcher` → table + CSV/JSON export. If `csv`/`json` missing, build from `columns` + `rows`.
- `method` always rendered as the method note.
- `meta.engine === "fallback"` → show a "quick answer" badge.
- `sources` empty → render "source: unknown". Never invent one.

Failure: 8 s timeout → abort → fixture answer + "demo data" badge. Same for non-2xx and network error.

---

## 2. Steps

### Step 1 — Clean the scaffold

- Delete `src/lib/Counter.svelte`, `src/assets/`.
- Strip `src/app.css` to tokens only.
- Strip `src/App.svelte` to an empty shell.
- Keep `svelte.config.js`, `tsconfig*.json` as generated.

Done when: `npm run dev` shows a blank page with no console errors.

### Step 2 — Vite config

`vite.config.ts`:
- `server.proxy` and `preview.proxy`: `/api` → `http://localhost:8000`.
- Path alias `@` → `./src`, mirrored by `paths` in `tsconfig.app.json`.

No env file. The API base is always `/api` — in dev the proxy handles it, in production
FastAPI serves the SPA from the same origin. One constant, nothing to configure.

Done when: a request to `/api/anything` in dev returns a proxy error, not Vite's index.html.

### Step 3 — Design tokens + shell

`src/app.css`:
- CSS variables: colours, spacing, radius, font sizes, safe-area insets.
- IMD alert colours: red `#D7191C`, orange `#FF9900`, yellow `#FFD400` (dark text), green `#00A65A`.
- `html, body` full height, no scroll on body. Only the message list scrolls.

`src/App.svelte`:
- Column flex: header, alert banner slot, message list, composer.
- Max width 430 px, centred. Height `100dvh`.

Done when: at 390 px viewport the three regions are visible with a coloured placeholder each.

### Step 4 — Types

`src/lib/types.ts` — the contract above, request and response, as TypeScript types.
One file. Everything else imports from here.

Done when: `npm run check` passes.

### Step 5 — Fixtures

`src/lib/fixtures.ts` — hand-written responses for the 5 demo questions (spec §16):

| # | Question | Persona | Notes |
|---|---|---|---|
| 1 | kal Pune mein baarish hogi kya? (voice, Hinglish) | farmer | roman script, orange wind alert |
| 2 | Mumbai departure 0600 UTC tomorrow | pilot | UTC + local, crosswind, visibility, gust |
| 3 | उद्या नाशिकमध्ये पाऊस? (Marathi) | farmer | native script, `mr-IN` |
| 4 | Any alerts for coastal Odisha next 48 hours? | disaster | severity, area, window, checklist, escalation |
| 5 | Compare this week's rainfall in Nagpur with last 5 years | researcher | `data` table + method note |

Plus 3 locations: Pune, Nashik, Nagpur. Add Mumbai and coastal Odisha.

Done when: every fixture renders without a missing field.

### Step 6 — API client

`src/lib/api.ts`:
- `sendQuery(req)` → `QueryResponse`.
- Base from `import.meta.env.VITE_API_BASE ?? '/api'`.
- `AbortController`, 8 s timeout.
- On timeout / non-2xx / network error → return matching fixture, set `derived.demo = true`.
- Attach `user_id` from `lib/uid.ts`.

`src/lib/uid.ts` — anonymous id, spec §11:

```ts
const id = localStorage.getItem('uid') ?? crypto.randomUUID()
localStorage.setItem('uid', id)
```

Done when: chat answers all 5 demo questions with the backend off.

### Step 7 — State

`src/lib/state.svelte.ts` — Svelte 5 runes:
- `messages`, `lang`, `script`, `persona`, `place`, `alerts`, `loading`, `error`.
- `messages` capped at 50, persisted to `localStorage` (spec §10).
- `lang`, `persona`, `savedPlaces` persisted too.
- `uid` created once.

Done when: refresh keeps the last 50 messages and the chosen language.

### Step 8 — Chat loop

- `src/lib/components/MessageList.svelte` — scroll container, autoscroll to newest.
- `src/lib/components/MessageBubble.svelte` — user vs assistant chrome.
- `src/lib/components/Composer.svelte` — textarea + send, Enter sends.

Done when: type a question, it appears, an answer comes back from fixtures.

### Step 9 — Answer rendering

- `src/lib/components/AnswerBody.svelte` — text; renders `parts` as four labelled blocks when farmer.
- `src/lib/components/SourceFooter.svelte` — sources + observed time + latency + fallback badge.
- `src/lib/components/ResearcherPanel.svelte` — table + method note + CSV/JSON download.
- `src/lib/export.ts` — Blob download.

Done when: farmer answer shows Action / Why / Window / Risk. Researcher answer exports a CSV.

### Step 10 — Alert logic + sticky banner

`src/lib/alerts.ts`:
- Severity → placement. Dedupe by `id`. Dismiss → suppress 6 h via `localStorage`.
- Highest severity wins the banner.

`src/lib/components/AlertBanner.svelte` — sticky, red and orange only.

| Severity | Sticky banner | Inline card | Voice |
|---|---|---|---|
| Red | yes | yes | yes, first |
| Orange | yes | yes | yes, first |
| Yellow | no | yes | yes, first |
| Green / none | no | no | no |

Done when: orange shows the banner, yellow does not.

### Step 11 — Inline card + detail sheet

- `src/lib/components/AlertCard.svelte` — under the reply, yellow + orange + red. Opens with "Not asked, but important."
- `src/lib/components/Sheet.svelte` — generic bottom sheet.
- `src/lib/components/AlertDetailSheet.svelte` — full alert text, window, area, source.

Severity word stays in English next to the colour code. Terminology: cyclone, never hurricane.

Done when: tapping a yellow card opens the detail sheet.

### Step 12 — Voice

`src/lib/voice.ts`:
- Feature-detect `SpeechRecognition`. Missing → hide mic, no crash.
- STT language = selected chip.
- TTS `lang_tag` taken from `answer.tts.lang_tag`. Never derived in the frontend.
- Queue alert utterance **before** answer utterance.
- Cancel pending speech when a new answer arrives.

`src/lib/components/VoiceButton.svelte` — mic with listening state.

Done when: speak a question, hear the alert first then the answer.

### Step 13 — Settings sheet + i18n

- `src/lib/i18n.ts` — ~25 chrome strings, `en` / `hi` / `mr` only.
- `src/lib/components/SettingsSheet.svelte` — language chips, persona switch, saved locations.
- `src/lib/components/AppHeader.svelte` — title + place / language / persona chips, opens sheet.

Languages: `en, hi, mr, ta, te, bn, gu, kn, ml, pa, or`. TTS tags are the `-IN` variants.
Only the three listed get translated chrome; answers are multilingual regardless.

Done when: switching to हिंदी or मराठी changes every button and label.

### Step 14 — PWA

- `public/manifest.webmanifest` — name, standalone, theme, icons.
- `public/sw.js` — ~30 lines, cache-first for assets, network-first with timeout for `/api`.
- Register in `src/main.ts`.
- Icons 192 / 512 PNG, generated from one SVG with a stdlib-only PNG writer (no image dependency).

Done when: install to home screen works, and the app answers with devtools offline.

### Step 15 — Hand off to backend

- `npm run build` → `dist/`.
- Backend mounts it: `app.mount("/", StaticFiles(directory="static", html=True), name="app")` (spec §12).
- One port, no CORS, no second deploy.

Done when: `localhost:8000` serves the app and `/api/query` on the same origin.

---

## 3. File map

```
src/
  main.ts  app.css  App.svelte
  lib/
    types.ts  api.ts  fixtures.ts  state.svelte.ts  uid.ts
    alerts.ts  voice.ts  i18n.ts  export.ts
    components/
      AppHeader.svelte  AlertBanner.svelte  AlertCard.svelte
      AlertDetailSheet.svelte  Sheet.svelte  SettingsSheet.svelte
      MessageList.svelte  MessageBubble.svelte  AnswerBody.svelte
      ResearcherPanel.svelte  SourceFooter.svelte
      Composer.svelte  VoiceButton.svelte
public/
  manifest.webmanifest  sw.js  icon-192.png  icon-512.png  favicon.svg
```

---

## 4. Open items

1. **Contract in §1 is a proposal.** Backend must confirm before step 6 is final. Steps 1–5 do not depend on it.
2. **Geocoding owner.** Recommend frontend calls Open-Meteo geocoding directly (no key, returns Hindi names) and sends lat/lon plus name. Confirm backend does not also want to resolve a raw string.
3. **Icons.** PNG generation with no image dependency is the plan. If it fights us, ship SVG and move on.

---

## 5. Demo safety

- Fixtures cover all 5 scripted questions.
- 8 s timeout, never a spinner.
- Mic hidden when unsupported.
- Missing `sources` → "source: unknown", never fabricated.
- Cache-warm the 3 demo locations on load (spec §14 rule 12).
- Record a backup video of the flow in case Wi-Fi dies.
