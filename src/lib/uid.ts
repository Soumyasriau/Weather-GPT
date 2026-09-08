/**
 * Anonymous id, spec section 11. No account, no signup. Sent with every query so a
 * join key exists if accounts ever arrive.
 */

const KEY = 'wgpt.uid'

export function uid(): string {
  const existing = localStorage.getItem(KEY)
  if (existing) return existing

  // randomUUID needs a secure context. Plain http on a LAN IP is not one, and the
  // demo may well run that way, so keep a fallback.
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  localStorage.setItem(KEY, id)
  return id
}