/**
 * Self-check for fixtures and the picker. No framework, no deps.
 * Run: npm run check:fixtures
 */

import assert from 'node:assert/strict'
import { FIXTURES, PLACES, pickFixture, placeByName } from '../src/lib/fixtures.ts'
import { LANG_TAGS, PERSONAS, SEVERITIES } from '../src/lib/types.ts'

const base = {
  user_id: 'check',
  script: 'native' as const,
  units: 'metric' as const,
}

// 1. Every fixture is complete enough to render.
for (const f of FIXTURES) {
  const r = f.response
  assert.ok(r.answer.text.length > 0, `${f.id}: empty answer text`)
  assert.ok(r.place.name && Number.isFinite(r.place.lat), `${f.id}: bad place`)
  assert.ok(r.method.source.length > 0, `${f.id}: missing method source`)
  assert.ok(Array.isArray(r.sources), `${f.id}: sources must be an array`)
  assert.ok(r.meta.engine === 'llm' || r.meta.engine === 'fallback', `${f.id}: bad engine`)
  assert.ok(PERSONAS.includes(f.persona), `${f.id}: bad persona`)
  assert.ok(LANG_TAGS[f.lang], `${f.id}: no TTS tag for ${f.lang}`)

  for (const a of r.alerts) {
    assert.ok(a.id, `${f.id}: alert without id — dedupe keys off it`)
    assert.ok(SEVERITIES.includes(a.severity), `${f.id}: bad severity ${a.severity}`)
    assert.ok(a.headline && a.instruction, `${f.id}: alert missing text`)
  }

  if (r.answer.tts) {
    assert.match(r.answer.tts.lang_tag, /^[a-z]{2}-[A-Z]{2}$/, `${f.id}: bad lang_tag`)
  }

  // Farmer answers must carry all four parts or the UI cannot render them.
  if (f.persona === 'farmer' && f.id !== 'generic') {
    const p = r.answer.parts
    assert.ok(p?.action && p.why && p.window && p.risk, `${f.id}: farmer parts incomplete`)
  }
}

// 2. TTS text goes out in native script. hi-IN reading romanized text mangles it.
for (const f of FIXTURES) {
  if (f.response.answer.script === 'roman' && f.response.answer.tts) {
    assert.notEqual(f.response.answer.tts.text, f.response.answer.text, `${f.id}: romanized text sent to TTS`)
  }
}

// 3. Every location in the picker resolves.
for (const p of PLACES) {
  assert.ok(placeByName(p.name), `placeByName failed for ${p.name}`)
}

// 4. The five scripted demo questions route to the right fixture.
const scripted: [string, string, string][] = [
  ['kal Pune mein baarish hogi kya?', 'farmer', 'pune-farmer-hinglish'],
  ['Mumbai departure 0600 UTC tomorrow - crosswind and visibility?', 'pilot', 'mumbai-pilot'],
  ['उद्या नाशिकमध्ये पाऊस?', 'farmer', 'nashik-farmer-marathi'],
  ['Any alerts for coastal Odisha next 48 hours?', 'disaster', 'odisha-disaster'],
  ["Compare this week's rainfall in Nagpur with the last five years.", 'researcher', 'nagpur-researcher'],
]

for (const [query, persona, expectedId] of scripted) {
  const got = pickFixture({ query, persona: persona as never, lang: 'en' })
  const hit = FIXTURES.find((f) => f.response.answer.text === got.answer.text)
  assert.equal(hit?.id, expectedId, `routing wrong for: ${query}`)
}

// 5. Unknown question still returns something. No endless spinner.
const unknown = pickFixture({ query: 'asdfghjkl', persona: 'farmer', lang: 'en' })
assert.ok(unknown.answer.text.length > 0, 'unknown query returned nothing')

console.log(`check:fixtures ok — ${FIXTURES.length} fixtures, ${PLACES.length} places`)
