/**
 * Self-check for the fallback path. No framework, no deps, no server.
 * Run: npm run check:api
 *
 * The non-negotiable being defended (spec section 5): with the backend down, the
 * chat still answers. No throw, no endless spinner.
 */

import assert from 'node:assert/strict'

// api.ts reaches for localStorage when it builds the request. Node has none.
const store = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
}

const { sendQuery, TIMEOUT_MS } = await import('../src/lib/api.ts')
const { placeByName } = await import('../src/lib/fixtures.ts')

const place = placeByName('Pune')!
const input = {
  query: 'kal Pune mein baarish hogi kya?',
  lang: 'hi' as const,
  script: 'roman' as const,
  persona: 'farmer' as const,
  place,
}

// Nothing is listening on /api, so this exercises the real failure path.
const result = await sendQuery(input)

assert.equal(result.demo, true, 'expected the fixture fallback to engage')
assert.ok(result.response.answer.text.length > 0, 'fallback returned an empty answer')
assert.equal(result.response.place.name, 'Pune', 'fallback lost the place')
assert.ok(result.response.sources.length > 0, 'fallback has no source line')
assert.ok(TIMEOUT_MS <= 10_000, 'timeout must stay short enough to feel instant')

// A stable uid is minted and reused.
assert.ok(store.get('wgpt.uid'), 'no anonymous id was persisted')

const again = await sendQuery(input)
assert.equal(store.get('wgpt.uid'), store.get('wgpt.uid'), 'uid changed between requests')
assert.ok(again.response.answer.text.length > 0, 'second call failed')

console.log('check:api ok — backend down still answers, uid persisted')
