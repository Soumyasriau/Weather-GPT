# WeatherGPT — UI handoff

Two people are picking up the **UI layer**. Everything below is what you need to start
without reading the whole repo.

Read these two files first, in this order:

1. `TEAM_MESSAGE.md` — the product spec. Sections 5, 6, 7, 8 are the ones you must not break.
2. `PLAN.md` — the 15-step build plan. Steps 1–9 are done. You are on 10–14.

---

## 1. What the product is

A farmer asks, in Marathi, by voice: *"will it rain tomorrow?"* The system answers with an
action, not a forecast: *"Spray today before 11 am. Heavy rain Friday — do not spray Thursday
night."*

If a weather warning exists for their area, **we show it even though they did not ask.** That
is the headline feature.

Four personas see four different renderings of the same forecast: farmer, pilot, disaster
manager, researcher.

---

## 2. Stack and hard rules

| Rule | Detail |
|---|---|
| Framework | Svelte 5 **runes** + Vite. No SvelteKit. One screen, two overlays |
| Dependencies | **Zero UI dependencies.** No Tailwind, no `@vite-pwa`, no chart/map/TTS library. If you want a library, ask first |
| Styling | `src/app.css` has all design tokens. Use them. Add component styles in each `.svelte` file's `<style>` block (Svelte scopes them automatically) |
| Width | Design at **390 px**, but the app fills any viewport. `--measure: 720px` caps the reading column, not the app. See section 5 |
| Theme | Light only. High contrast — users stand in sunlight |
| TypeScript | On. Run `npm run check` before you commit |

Commands:

```bash
npm run dev              # dev server, /api proxies to localhost:8000
npm run check            # svelte-check + tsc. Must show 0 errors
npm run build            # must pass
npm run check:fixtures   # fixture self-check
npm run check:api        # fallback self-check
```

---

## 3. What already exists — do not rewrite

| File | What it does |
|---|---|
| `src/lib/types.ts` | The backend contract as TypeScript types. **Single source of truth** |
| `src/lib/api.ts` | `sendQuery()`. 8 s timeout, never throws, always returns something |
| `src/lib/fixtures.ts` | 5 demo answers + `pickFixture()`. Offline safety net |
| `src/lib/state.svelte.ts` | All app state. Runes. Import as `import { chat } from '@/lib/state.svelte.ts'` |
| `src/lib/uid.ts` | Anonymous id in `localStorage` |
| `src/lib/export.ts` | CSV/JSON download helper |
| `src/App.svelte` | Shell: header, banner slot, message list, composer |
| `src/lib/components/MessageList.svelte` | Scroll list + empty state with suggestion chips |
| `src/lib/components/MessageBubble.svelte` | User/assistant chrome, typing dots |
| `src/lib/components/AnswerBody.svelte` | Persona-shaped answer rendering |
| `src/lib/components/SourceFooter.svelte` | Source + observation time + latency |
| `src/lib/components/ResearcherPanel.svelte` | Researcher table + export buttons |
| `src/lib/components/Composer.svelte` | Text input, Enter sends |

State you can read and write from anywhere:

```ts
chat.messages   // ChatMessage[]
chat.lang       // 'en' | 'hi' | 'mr' | ...
chat.script     // 'roman' | 'native'
chat.persona    // 'farmer' | 'pilot' | 'disaster' | 'researcher'
chat.place      // { name, lat, lon, tz }
chat.busy       // boolean

chat.setLang(l)      chat.setScript(s)
chat.setPersona(p)   chat.setPlace(place)
chat.send(text)      chat.clear()
```

---

## 4. Non-negotiables — these will be checked in Q&A

Straight from `TEAM_MESSAGE.md` §5. Breaking any of these costs accuracy points.

1. **Every answer carries source and observation time.** Already implemented in
   `SourceFooter.svelte`. Do not remove it.
2. **Never render a number the backend did not send.** If a field is missing, render nothing
   for it. Do not substitute a plausible value.
3. **The demo must never show an endless spinner.** `api.ts` already guarantees this. Do not
   add a loading state that has no exit.
4. **Alert placement is fixed:**

   | Severity | Sticky banner | Inline card | Voice |
   |---|---|---|---|
   | Red | yes | yes | yes, read first |
   | Orange | yes | yes | yes, read first |
   | Yellow | no | yes | yes, read first |
   | Green / none | no | no | no |

5. **Language is chosen in the UI, never detected.** Read `chat.lang`, send it to the backend.
   Do not add language auto-detection.
6. **Keep the severity word in English** next to the colour code, in every language. "ORANGE"
   stays "ORANGE" in Marathi.
7. **Terminology: cyclones, not hurricanes.** Use IMD wording.
8. **Alert cards always open with the line "Not asked, but important."**

---

## 5. Design tokens you have

From `src/app.css`. Use the variables, not raw hex.

| Group | Tokens |
|---|---|
| Brand | `--primary`, `--primary-soft`, `--primary-text` |
| Neutral | `--secondary`, `--secondary-soft` |
| Accent | `--tertiary`, `--tertiary-soft` (warm sand) |
| Surfaces | `--bg`, `--surface`, `--surface-sunken`, `--border`, `--border-strong` |
| Text | `--text`, `--text-muted`, `--text-faint`, `--text-inverse` |
| Personas | `--farmer`, `--pilot`, `--disaster`, `--researcher` (+ `-soft` for each) |
| Alerts | `--alert-red`, `--alert-orange`, `--alert-yellow`, `--alert-green` (+ `-bg`) |
| Spacing | `--s1` (4px) → `--s8` (32px) |
| Radius | `--r-sm`, `--r-md`, `--r-lg`, `--r-pill` |
| Type | `--fs-xs` (12) → `--fs-xl` (20) |
| Layout | `--measure` (720px, reading column), `--header-h` (52px) |

**Layout rule:** the app is full-bleed — no width cap on the frame. Header and composer
chrome span the full viewport; only the content inside is capped at `--measure` and centred,
so text never stretches across a wide monitor. If you add a region, wrap its content in
`<div class="inner">`.

**Gotcha:** `--alert-yellow` is `#FFD400`. Pure yellow on white is unreadable outdoors. Use
`--alert-yellow-text` (`#4A3C00`) for text on a yellow background.

---

## 6. Your two workstreams

Split by file ownership. Neither of you should edit the other's files.

### Person A — Alerts and overlays

Owns: `src/lib/alerts.ts`, `AlertBanner.svelte`, `AlertCard.svelte`, `AlertDetailSheet.svelte`,
`Sheet.svelte`, and the `.banner-slot` region of `App.svelte`.

**Task A1 — `src/lib/alerts.ts`** (logic, no markup)

- `severityRank(s)`: red 3, orange 2, yellow 1, green 0.
- `dedupe(alerts)`: one entry per `alert.id`, keep the highest severity.
- `dismiss(alertId)` / `isDismissed(alertId)`: store the id with a timestamp in
  `localStorage`. Suppress for **6 hours**, then show again.
- `bannerAlert(alerts)`: the single alert that earns the sticky banner — highest severity,
  red or orange only, not dismissed. Returns `undefined` if none qualifies.

Add `scripts/check-alerts.ts` in the same style as the existing two checks
(`node scripts/check-alerts.ts`, no framework). Add it to `package.json` as `check:alerts`.
It must prove: dedupe collapses duplicate ids, dismissal expires after 6 h, and yellow never
reaches the banner.

**Task A2 — `AlertBanner.svelte`**

- Mounted in the `.banner-slot` div in `App.svelte`.
- Sticky at the top, full width. Red and **orange only** — never yellow.
- Shows: severity word in English, hazard headline, area.
- Dismiss button calls `dismiss()`.
- Tap opens the detail sheet.

**Task A3 — `AlertCard.svelte`**

- Inline, under the assistant's reply, inside the message flow. Yellow + orange + red.
- Opens with **"Not asked, but important."**
- Severity word in English. Tap opens the detail sheet.

**Task A4 — `Sheet.svelte` + `AlertDetailSheet.svelte`**

- `Sheet.svelte`: generic bottom sheet. Backdrop, slide up, close on backdrop tap and on
  Escape. No drag-to-dismiss needed.
- `AlertDetailSheet.svelte`: full headline, instruction, valid window, area, source.

Person B will use your `Sheet.svelte` for settings. Build it generic.

**Done when:** with the Pune fixture loaded, the orange wind alert shows the sticky banner;
the Nashik fixture's yellow rain alert shows only an inline card; dismissing hides it and a
fresh load within 6 h keeps it hidden.

---

### Person B — Voice, settings, language

Owns: `src/lib/voice.ts`, `VoiceButton.svelte`, `src/lib/i18n.ts`, `SettingsSheet.svelte`,
`AppHeader.svelte`, and the `<header>` region of `App.svelte`.

**Task B1 — `src/lib/voice.ts`** (logic, no markup)

- Feature-detect `SpeechRecognition`. If missing, export `supported = false` and let the UI
  hide the mic. **Do not crash.**
- `listen(lang)`: returns a promise of the transcript. Language comes from `chat.lang`.
- `speak(text, langTag)`: queue an utterance.
- `speakAnswer(response)`: speak the **alert first, then the answer**. Spec §5.
- `cancelSpeech()` when a new answer arrives.
- **Never derive the TTS language tag yourself.** Use `response.answer.tts.lang_tag` from the
  backend. Romanized text must never go to a native-script voice.

**Task B2 — `VoiceButton.svelte`**

- Mic button in the composer row. Visible only if `supported`.
- Clear listening state while recording.
- Transcript goes into `chat.send()`.

**Task B3 — `src/lib/i18n.ts` + `SettingsSheet.svelte` + `AppHeader.svelte`**

- `i18n.ts`: ~25 chrome strings (buttons, labels, placeholders) in **`en`, `hi`, `mr` only**.
  Other 8 languages are deferred. One file, keyed by language.
- `AppHeader.svelte`: title + place chip + language chip + persona chip. Each opens the sheet.
- `SettingsSheet.svelte`: uses Person A's `Sheet.svelte`. Three sections — language, persona,
  saved place. Persist through `chat.setLang` / `setPersona` / `setPlace`; they already write
  to `localStorage`.

- Languages: `en, hi, mr, ta, te, bn, gu, kn, ml, pa, or`.
- TTS tags are the `-IN` variants and come from the backend, not from you.
- Romanized Hinglish in → romanized out. That is a real feature, not a bug.

**Done when:** switching to हिंदी or मराठी changes every button and label; the mic appears in
Chrome and a spoken question produces an answer; the alert is spoken before the answer.

---

### Later, together — step 14, PWA

`public/manifest.webmanifest`, `public/sw.js` (~30 lines runtime cache), icons. Register the
service worker in `src/main.ts`. Do this together once A and B are both green, so you do not
fight over `main.ts`.

---

## 7. Shared files — agree before you touch them

| File | Rule |
|---|---|
| `src/lib/types.ts` | **Do not edit** without telling the backend person. Backend has not signed off yet |
| `src/lib/state.svelte.ts` | If you need new state, add it and say so in the group chat. Do not restructure |
| `src/App.svelte` | A owns the banner slot, B owns the header. Announce before editing the middle |
| `src/app.css` | Tokens only. New token → add it here, never inline a hex in a component |

Commit per milestone. `git stash` before anything risky (spec §14 rule 7).

---

## 8. Open items — do not guess, ask

1. **The backend contract is a proposal, not signed off.** `types.ts` may still change. Do not
   build deep against it without checking.
2. **Who converts a place name to lat/lon?** Current assumption: frontend calls Open-Meteo
   geocoding directly (no API key). Unconfirmed.
3. **The backend is not running yet.** Everything you see comes from `fixtures.ts`. Numbers in
   fixtures are placeholders — the UI badges them "demo data" on purpose.
