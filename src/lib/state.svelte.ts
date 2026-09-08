/**
 * All app state. One file, Svelte 5 runes, no store library.
 *
 * Persisted to localStorage per spec section 10: language, persona, place, and the
 * last 50 messages. Everything else is per-session.
 */

import type { ChatMessage, Lang, Persona, Place, Script } from './types'
import { sendQuery } from './api.ts'
import { PLACES, placeByName } from './fixtures.ts'

const K = {
  lang: 'wgpt.lang',
  script: 'wgpt.script',
  persona: 'wgpt.persona',
  place: 'wgpt.place',
  messages: 'wgpt.messages',
} as const

const MAX_MESSAGES = 50

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // Corrupt entry or storage disabled. Falling back beats crashing on load.
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or quota. Losing persistence is not worth breaking the chat.
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

class ChatState {
  messages = $state<ChatMessage[]>(read<ChatMessage[]>(K.messages, []))
  lang = $state<Lang>(read<Lang>(K.lang, 'en'))
  script = $state<Script>(read<Script>(K.script, 'native'))
  persona = $state<Persona>(read<Persona>(K.persona, 'farmer'))
  place = $state<Place>(read<Place>(K.place, placeByName('Pune') ?? PLACES[0]))
  busy = $state(false)

  setLang(lang: Lang): void {
    this.lang = lang
    write(K.lang, lang)
  }

  setScript(script: Script): void {
    this.script = script
    write(K.script, script)
  }

  setPersona(persona: Persona): void {
    this.persona = persona
    write(K.persona, persona)
  }

  setPlace(place: Place): void {
    this.place = place
    write(K.place, place)
  }

  clear(): void {
    this.messages = []
    write(K.messages, this.messages)
  }

  async send(text: string): Promise<void> {
    const query = text.trim()
    if (query === '' || this.busy) return

    const user: ChatMessage = { id: newId(), role: 'user', text: query, ts: Date.now() }
    const pending: ChatMessage = { id: newId(), role: 'assistant', text: '', ts: Date.now() }

    this.messages = [...this.messages, user, pending]
    this.busy = true
    const index = this.messages.length - 1

    try {
      const { response, demo } = await sendQuery({
        query,
        lang: this.lang,
        script: this.script,
        persona: this.persona,
        place: this.place,
      })

      // Replace, do not mutate: the array is a $state proxy and replacement is
      // the shape Svelte 5 reliably tracks.
      this.messages[index] = {
        ...pending,
        text: response.answer.text,
        response,
        demo,
      }
    } catch (err) {
      this.messages[index] = {
        ...pending,
        text: 'Could not reach the weather service.',
        error: err instanceof Error ? err.message : 'unknown error',
      }
    } finally {
      this.busy = false
      this.persist()
    }
  }

  private persist(): void {
    // Cap before writing, not after: a long session must not grow the key forever.
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES)
    }
    write(K.messages, this.messages)
  }
}

export const chat = new ChatState()
