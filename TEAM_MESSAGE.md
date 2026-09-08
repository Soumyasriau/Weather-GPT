# WeatherGPT — what we are building, why, and how

Team, read this before you write any code. Ten minutes now saves five hours later.

---

## 1. What the project is

We are building **WeatherGPT**: a conversational weather intelligence platform. A user asks a
question in natural language, in their own language, by typing or speaking. The system answers
with current conditions, forecast, warnings, and — the important part — a concrete action to take.

It is not a weather app. It is a **translation layer** between meteorological data and a human
decision.

Example:

> User (voice, Hinglish): "kal Pune mein baarish hogi kya? dawaai chhidakun?"
> WeatherGPT: "Spray today before 11 am. Wind is 8 km/h and there is no rain till Thursday.
> Heavy rain Friday (68 mm) — do not spray Thursday night, it will wash off."
> *(sticky banner above the chat)* Orange alert: gusts 60 km/h, Friday.

The brief asks for real-time weather, forecasts, NWP models, alerts, location advisories,
multilingual support, climate analysis, and voice. We cover all eight.

---

## 2. The problem we are solving

Weather data is not scarce. **Comprehension** is scarce.

India Meteorological Department publishes warnings. They are PDFs, in English, at district
granularity. The person who needs one is a farmer with a Marathi question and thirty seconds of
attention. That gap is the product.

Four specific gaps:

| Gap | Reality today | What we do |
|---|---|---|
| Language | Bulletins in English | 10 Indian languages, voice in and out |
| Granularity | District-level warning | Your field, your pincode |
| Actionability | "20 mm rainfall expected" | "Do not spray today" |
| Access | Reading and typing required | Speak, listen, no literacy barrier |

---

## 3. Why this matters (the part to say out loud in the presentation)

Every year, India loses crops, flights, and lives to warnings that were **published but not
understood**. The forecast was right. The message never reached the decision.

Same data, right words, right language, right time — that is a measurable difference, not a
feature. A farmer who does not spray before 60 mm of rain saves a season of input cost. A pilot
who gets crosswind in plain English briefs faster. A district collector who sees an orange alert
in one glance acts hours earlier.

That is the pitch. Lead with it.

---

## 4. What we actually ship (24-hour scope)

**Core — required, everyone works on this:**

1. FastAPI backend with Open-Meteo adapters (no API key, no signup).
2. Query engine: LLM tool calling producing JSON `{intent, place, time, vars, lang}`.
3. **Deterministic alert engine** — Python rules on thresholds. See section 6.
4. **Deterministic advisory engine** — forecast becomes an action. See section 8.
5. Mobile-first single-screen chat UI, installable to home screen as a PWA.
6. Voice in and out via Web Speech API (free, built into Chrome, supports Indian languages).
7. Multilingual layer (hi, mr, ta, te, bn, gu, kn, ml, pa, or).
8. Persona modes: farmer, pilot, disaster manager, researcher.

**Architecture:** Input (chat / voice / GPS) → Query engine (FastAPI + LLM) → Data adapters
(NWP models, alerts, radar, history archive) → Advisory engine → Answer + voice, with source and
timestamp on every reply.

---

## 5. Non-negotiable rules — do not break these

- **Alerts are computed, never inferred by the LLM.** A rule engine reads thresholds and decides.
  The LLM only rewords and translates the alert. If the LLM "notices" a cyclone from raw
  temperature, it will hallucinate, and we cannot defend it in Q&A. Accuracy is evaluation
  parameter #1.
- **Every answer carries source and observation time.** "Open-Meteo GFS, 14:00 IST run".
- **Rule-based fallback always exists.** If the LLM times out or returns garbage, a regex plus
  template answers anyway. The demo must never show an endless spinner.
- **Mobile-first.** Design at 390 px width. Desktop is the afterthought.
- **Never state a number an API did not return.**
- **Alert placement:** sticky header banner for orange and red only; inline card under the reply
  for yellow too. Voice reads the alert *before* the answer.
- **Answer in the user's language, generated directly.** No English-then-translate pipeline unless
  the model is weak in that language. See section 7.
- **No authentication.** See section 11.

---

## 6. Alert engine — how the sticky header works

The user did not ask for an alert. We show it anyway. That is the feature.

Placement by severity:

| IMD colour | Where it appears |
|---|---|
| Red | Sticky top banner + voice + push |
| Orange | Sticky top banner + inline card |
| Yellow | Inline card only |
| Green / none | Nothing |

Triggers (all Open-Meteo variables verified working: `cape`, `lifted_index`, `wind_gusts_10m`,
`pressure_msl`):

| Hazard | Trigger |
|---|---|
| Heavy rain | ≥ 64.5 mm / 24 h (heavy), ≥ 115.6 (very heavy), ≥ 204.5 (extremely heavy) |
| Thunderstorm | CAPE ≥ 1000 J/kg and lifted index < −2 |
| Damaging wind | gusts ≥ 60 km/h |
| Cyclone watch | pressure drop ≥ 6 hPa in 6 h and gusts ≥ 60 km/h |
| Heat wave | Tmax ≥ 40 °C plains / 37 coastal / 30 hills, or ≥ 4.5 °C above normal |
| Flood | GloFAS river discharge above 2-year return period |

Dedupe by alert id. One banner at a time. Dismissed → suppress for 6 hours. Card always opens
with the line "Not asked, but important." Alerts also push into the thread over SSE when no
question was asked — that covers the early-warning criterion.

Terminology: India has **cyclones**, not hurricanes. Use IMD wording.

---

## 7. Language policy — reply in the user's language

Always. One generation, directly in the target language.

- **Send the language code from the UI, do not detect it.** The user picks a language chip, or
  Web Speech already knows it from the speech-to-text result. Detection is a guess we do not need.
- **Generate direct: one call.** Use for English and Hindi.
- **English then translate out: two calls.** Only where the model is weak — Marathi, Tamil,
  Telugu, Kannada, Malayalam, Odia, Punjabi. Test one query in each before the demo.
- **Translate in, generate, translate out: never.** Too slow, and latency is scored.
- **Never translate numbers, units, dates, place names, or agency names** (IMD, GFS). Keep them
  verbatim so every answer stays verifiable.
- **The TTS language tag must match the generated text language,** or the voice output is noise.
- **Hinglish in, Hinglish out.** A romanized Hindi question gets a romanized Hindi answer. Big win
  for rural users. But send native script to the TTS engine — `hi-IN` reading romanized text
  mangles it.
- **Alert text translates too:** hazard name, instruction, source line. Keep the severity word in
  English next to the colour code.

Contract:

```json
{"lang": "mr", "query": "उद्या नाशिकमध्ये पाऊस?", "intent": "forecast", "vars": ["precipitation"]}
```

System prompt line, once:

> Answer in {lang}. Keep numbers, units, dates, and proper nouns unchanged.

---

## 8. Persona engines — what each user actually receives

The point of personas: the same forecast produces four different answers.

### Farmer: recommendation, never description

**Never answer with a description alone.** "No rain today, full sunny" is useless. Lead with the
action. Format every farmer answer as four parts:

1. **Action** — a verb. "Spray today before 11 am."
2. **Why** — the data behind it. "Wind 8 km/h, no rain till Thursday."
3. **Window** — how long it holds. "Do not spray after Thursday evening."
4. **Risk** — what breaks if ignored. "68 mm rain Friday will wash off the spray."

Advisory rules (deterministic, in `advisory.py`, no LLM judgement):

| Condition | Advice |
|---|---|
| Rain ≥ 10 mm in next 24 h | Postpone spraying and fertiliser |
| Rain 5–10 mm in 24 h | Spray only if wind under 10 km/h |
| Rain under 5 mm, 3 dry days ahead | Good window — harvest or spray |
| No rain for 5+ days and none forecast | Irrigate within 48 h |
| Wind gusts ≥ 25 km/h | Do not spray, drift risk |
| Tmax ≥ 40 °C | Irrigate in the evening, mulch the soil |
| Humidity above 80% and 20–30 °C | Fungal disease risk, avoid overhead irrigation |
| Rain ≥ 64.5 mm in 24 h | Open field drains, delay harvest |
| Tmin ≤ 10 °C (cold wave) | Light smoke or irrigate at night against frost |

End with the source and: "Advisory only — confirm with your local Krishi Vigyan Kendra."

### Researcher: data, method, and export

Researchers do not want prose. They want numbers, provenance, and a file.

| Feature | What it answers | Source |
|---|---|---|
| Historical comparison | How does this week compare with the last 5 years? | Archive API, 1940 onward |
| Departure from normal | How far above the 1991–2020 baseline? | Archive mean over same dates |
| Trend | Warming or drying at what rate? | Regression slope per decade |
| Percentile rank | Is this week in the 92nd percentile? | Rank against 30 years |
| Extreme counts | How many days above 35 °C per year? | Count days over threshold |
| Spell analysis | Longest dry spell, longest wet run | Consecutive-day scan |
| Growing degree days | Is the crop on schedule? | Sum of (Tmean − base temp) |
| Export | Give me the raw data | CSV and JSON download |

Every researcher answer carries a **method note**: model name, grid resolution, units, source, and
exact date range. That line is what makes a researcher trust the tool.

### Pilot and disaster manager

- **Pilot:** TAF-style brevity. Raw values, no hedging. UTC and local time. Computed crosswind
  component, visibility, ceiling, gust. No advice, only numbers.
- **Disaster manager:** severity, affected area, valid window, action checklist, escalation level.
  Bullet list. No weather explanation at all.

---

## 9. Data sources — verified live

| Source | Status | Use |
|---|---|---|
| Open-Meteo forecast | Works, no key | current, hourly, 16-day, `models=gfs025` / `icon_seamless` / `ecmwf_ifs025` |
| Open-Meteo archive | Works, no key | history back to 1940 |
| Open-Meteo flood (GloFAS) | Works, no key | river discharge |
| Open-Meteo geocoding | Works, no key, returns Hindi names | place → lat/lon |
| RainViewer | Works, no key | radar tiles |
| IMD `api.imd.gov.in` | Portal exists, needs registration | optional only |
| IMD `mausam.imd.gov.in/api/cityweather_api.php` | **404** | do not depend on it |

Gotcha: the model parameter is `gfs025`, **not** `gfs_025`. The underscore version throws a 400.

---

## 10. Storage — no database needed for the demo

Persist four things, none in a database:

| Data | Where | Why |
|---|---|---|
| Saved locations, language, persona | `localStorage` | survives refresh, no account |
| Chat history, last 50 messages | `localStorage` | offline read-back |
| Query and response log | JSONL file on server | our accuracy evidence |
| API response cache | in-memory dict, TTL 10 min | latency criterion |

Plus JSON fixtures on disk so the demo survives dead Wi-Fi.

PostgreSQL appears in the *suggested* stack, not the required deliverables. Put it in
`docker-compose.yml` for the architecture story, keep every read behind a repository interface,
and ship the JSONL implementation. If a judge asks "where is your database", the answer is:
weather data lives upstream and is cached, query history is append-only for audit, Postgres is the
scaling path and the interface is ready.

---

## 11. Authentication — deliberately skipped

Reasons:

1. A judge must sign up before seeing anything. Worst possible friction.
2. Nothing in the eight required features or seven evaluation parameters mentions accounts.
3. A public warning system should be open by design. Say that out loud — it reads as a strength.

If a judge raises "disaster managers and government agencies", answer: role handling is a
deployment concern; personas are a UI switch, not a permission boundary.

**Cheap insurance — do this regardless.** Anonymous id in `localStorage`, sent on every request:

```js
const userId = localStorage.getItem("uid") ?? crypto.randomUUID();
localStorage.setItem("uid", userId);
```

Log it with each query. If accounts ever arrive, the join key already exists.

If someone insists at the last hour: name plus device id, no password, no email. Never a real
signup flow during a demo.

---

## 12. Frontend stack — Svelte + Vite, one screen

**One screen:** the chat. Plus two overlays, not screens — a bottom sheet for language, location,
and persona; and an alert detail sheet. No routing, no onboarding, no tabs, no profile.

**Svelte + Vite, not SvelteKit.** Our backend is Python, so we use none of SvelteKit's selling
points: no server endpoints, no SSR, no routing, no sessions. Current versions: Svelte `5.57.0`,
Vite `8.2.2`. Use runes.

Serve the built SPA from FastAPI with `StaticFiles` on one port. No CORS, no second deploy.

```python
app.mount("/", StaticFiles(directory="static", html=True), name="app")
```

In dev, proxy `/api` to port 8000 in `vite.config.js`.

---

## 13. Optional extras — genuinely optional, skip if behind

- Radar map (RainViewer on Leaflet) — covers satellite and GIS.
- Model comparison toggle GFS vs ICON vs ECMWF — makes the NWP claim visible.
- "This week vs last 5 years" chart from the archive API — covers climate analysis.
- Flood panel from GloFAS — covers the flood use case.
- Share card — one-tap WhatsApp-ready summary.
- Simulated alert push over SSE — covers early-warning dissemination.
- Eval script over 20 golden questions, logging to JSONL — evidence for the accuracy criterion.

Do **not** build: login, Kubernetes, real MQTT/WIS2.0, a real WRF run, Postgres tuning, multi-page
routing. Show those on a "production roadmap" slide.

---

## 14. Vibe coding rules — read before prompting

1. **Contract first.** Agree on one JSON shape `{intent, place, time, vars, lang}`. Everything
   else is plumbing. Do not start coding until this is fixed.
2. **Every data source behind one adapter.** `get_current()`, `get_forecast()`, `get_alerts()`.
   If the network dies, serve a saved JSON fixture.
3. **Record fixtures today.** Save real responses for 3 demo locations. Hackathon Wi-Fi will fail.
4. **All prompts live in one file** (`prompts.py`). Tune there, never inside logic.
5. **Force JSON output, temperature 0**, validate with pydantic, retry once, then fall back.
6. **`asyncio.gather` all API calls**, plus a TTL cache. That is the latency story.
7. **Commit per milestone.** `git stash` before any risky edit.
8. **Keep files small:** `main.py`, `weather.py`, `alerts.py`, `advisory.py`, `brain.py`,
   `prompts.py`, Svelte components. No framework.
9. **Test with 20 fixed questions** after every change.
10. **Log every query and response** to JSONL. Free debugging, free evaluation evidence.
11. **Never generate while tired without running it.** Run after every generation. Small steps.
12. **Pre-warm the cache** for the 3 demo locations before the demo.

---

## 15. Suggested 24-hour plan

| Window | Work |
|---|---|
| 00:00–02:00 | Data spine: Open-Meteo client, geocoding, cache, fixtures |
| 02:00–05:00 | Query engine: LLM tool calling, JSON validation, regex fallback |
| 05:00–09:00 | Chat UI: Svelte single screen, chips, location picker, persona switch |
| 09:00–12:00 | Voice + Indic languages |
| 12:00–15:00 | Alert engine, sticky banner, advisory rules |
| 15:00–18:00 | Researcher analytics, optional extras |
| 18:00–21:00 | Docker, offline fallback, eval script, cache warm-up |
| 21:00–24:00 | Rehearse 5 scripted questions, record backup video, slides |

Split for four people: backend and data · LLM and prompts · UI and voice · demo, slides, eval.

---

## 16. Demo script — rehearse exactly these five

1. Voice, Hinglish: "kal Pune mein baarish hogi kya?"
2. English, aviation persona: "Mumbai departure 0600 UTC tomorrow — crosswind and visibility?"
3. Marathi text: "उद्या नाशिकमध्ये पाऊस?"
4. Disaster persona: "Any alerts for coastal Odisha next 48 hours?"
5. Researcher persona: "Compare this week's rainfall in Nagpur with the last five years."

---

## 17. One open question — someone ask the organisers today

> "Is a responsive mobile web app / PWA acceptable as the 'mobile-based platform', or is a native
> APK mandatory?"

Nothing in the brief mentions APK or Play Store, and the suggested stack is entirely backend and
web. A PWA is almost certainly fine. Ask anyway, today, so we do not discover otherwise late.

---

**Bottom line:** ship the core, keep alerts and advisories deterministic, design for a phone, no
login, and make sure the demo never breaks. Extras are bonus points, not the product.
