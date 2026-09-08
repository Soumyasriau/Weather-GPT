/**
 * All app state. One file, Svelte 5 runes, no store library.
 *
 * Spec section 12 update: chats are now a list, each with its own messages,
 * persisted to IndexedDB (see db.ts) instead of a single flat message array
 * in localStorage. `lang` / `script` / `persona` / `place` read and write
 * through to the active chat, so existing call sites (`chat.lang`,
 * `chat.persona`, `chat.place.name`, `chat.send(...)`) keep working — only
 * the storage underneath changed.
 *
 * localStorage is kept for exactly one thing: which chat id was last open,
 * so a reload doesn't drop the user back on chat #1.
 */

import type { Chat, ChatMessage, Lang, Persona, Place, Script } from './types'
import { sendQuery } from './api.ts'
import { PLACES, placeByName } from './fixtures.ts'
import { dbListChats, dbSaveChat, dbDeleteChat } from './db.ts'

const LAST_OPEN_KEY = 'wgpt.lastChatId'
const LEGACY_MESSAGES_KEY = 'wgpt.messages' // pre-section-12 flat history, migrated once
const MAX_MESSAGES = 50

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultPlace(): Place {
  return placeByName('Pune') ?? PLACES[0]
}

function blankChat(overrides?: Partial<Pick<Chat, 'lang' | 'script' | 'persona' | 'place'>>): Chat {
  const now = Date.now()
  return {
    id: newId('chat'),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    lang: overrides?.lang ?? 'en',
    script: overrides?.script ?? 'native',
    persona: overrides?.persona ?? 'farmer',
    place: overrides?.place ?? defaultPlace(),
    messages: [],
  }
}

/** One-time migration from the pre-multi-chat flat message array, if present. */
function migrateLegacyMessages(): Chat | null {
  try {
    const raw = localStorage.getItem(LEGACY_MESSAGES_KEY)
    if (!raw) return null
    const messages = JSON.parse(raw) as ChatMessage[]
    if (!Array.isArray(messages) || messages.length === 0) return null

    const chat = blankChat()
    chat.messages = messages
    chat.title = messages.find((m) => m.role === 'user')?.text.slice(0, 40) || 'Earlier chat'
    return chat
  } catch {
    return null
  } finally {
    localStorage.removeItem(LEGACY_MESSAGES_KEY)
  }
}

class ChatState {
  chats = $state<Chat[]>([])
  activeChatId = $state<string | null>(null)
  sidebarOpen = $state(true)
  ready = $state(false)
  busy = $state(false)

  get activeChat(): Chat | undefined {
    return this.chats.find((c) => c.id === this.activeChatId)
  }

  get messages(): ChatMessage[] {
    return this.activeChat?.messages ?? []
  }

  get lang(): Lang {
    return this.activeChat?.lang ?? 'en'
  }

  get script(): Script {
    return this.activeChat?.script ?? 'native'
  }

  get persona(): Persona {
    return this.activeChat?.persona ?? 'farmer'
  }

  get place(): Place {
    return this.activeChat?.place ?? defaultPlace()
  }

  /** Loads saved chats from IndexedDB. Call once, from App.svelte's onMount. */
  async init(): Promise<void> {
    let chats = await dbListChats()

    if (chats.length === 0) {
      const migrated = migrateLegacyMessages()
      const first = migrated ?? blankChat()
      chats = [first]
      await dbSaveChat(first)
    }

    this.chats = chats

    const lastOpen = localStorage.getItem(LAST_OPEN_KEY)
    this.activeChatId = chats.some((c) => c.id === lastOpen) ? lastOpen : chats[0].id

    this.ready = true
  }

  async newChat(): Promise<void> {
    // A fresh chat inherits the current context (persona/lang/place) so the
    // user doesn't have to re-pick them every time they start a new thread.
    const seed = this.activeChat
    const chat = blankChat(
      seed ? { lang: seed.lang, script: seed.script, persona: seed.persona, place: seed.place } : undefined,
    )
    this.chats = [chat, ...this.chats]
    this.activeChatId = chat.id
    localStorage.setItem(LAST_OPEN_KEY, chat.id)
    await dbSaveChat(chat)
  }

  selectChat(id: string): void {
    if (!this.chats.some((c) => c.id === id)) return
    this.activeChatId = id
    localStorage.setItem(LAST_OPEN_KEY, id)
  }

  async deleteChat(id: string): Promise<void> {
    this.chats = this.chats.filter((c) => c.id !== id)
    await dbDeleteChat(id)

    if (this.activeChatId !== id) return

    if (this.chats.length === 0) {
      await this.newChat()
    } else {
      this.activeChatId = this.chats[0].id
      localStorage.setItem(LAST_OPEN_KEY, this.chats[0].id)
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen
  }

  setLang(lang: Lang): void {
    const c = this.activeChat
    if (!c) return
    c.lang = lang
    this.touch(c)
  }

  setScript(script: Script): void {
    const c = this.activeChat
    if (!c) return
    c.script = script
    this.touch(c)
  }

  setPersona(persona: Persona): void {
    const c = this.activeChat
    if (!c) return
    c.persona = persona
    this.touch(c)
  }

  setPlace(place: Place): void {
    const c = this.activeChat
    if (!c) return
    c.place = place
    this.touch(c)
  }

  clear(): void {
    const c = this.activeChat
    if (!c) return
    c.messages = []
    this.touch(c)
  }

  async send(text: string): Promise<void> {
    const query = text.trim()
    const c = this.activeChat
    if (query === '' || this.busy || !c) return

    const user: ChatMessage = { id: newId('m'), role: 'user', text: query, ts: Date.now() }
    const pending: ChatMessage = { id: newId('m'), role: 'assistant', text: '', ts: Date.now() }

    c.messages = [...c.messages, user, pending]
    if (c.messages.length === 2 && c.title === 'New chat') {
      c.title = query.slice(0, 40)
    }
    this.busy = true
    const index = c.messages.length - 1

    try {
      const { response, demo } = await sendQuery({
        query,
        lang: c.lang,
        script: c.script,
        persona: c.persona,
        place: c.place,
      })

      // Replace, do not mutate: the array is a $state proxy and replacement is
      // the shape Svelte 5 reliably tracks.
      c.messages[index] = {
        ...pending,
        text: response.answer.text,
        response,
        demo,
      }
    } catch (err) {
      c.messages[index] = {
        ...pending,
        text: 'Could not reach the weather service.',
        error: err instanceof Error ? err.message : 'unknown error',
      }
    } finally {
      this.busy = false
      this.touch(c)
    }
  }

  /** Bumps updatedAt, re-sorts the sidebar, and persists to IndexedDB. */
  private touch(c: Chat): void {
    if (c.messages.length > MAX_MESSAGES) {
      c.messages = c.messages.slice(-MAX_MESSAGES)
    }
    c.updatedAt = Date.now()
    this.chats = [c, ...this.chats.filter((x) => x.id !== c.id)]
    void dbSaveChat(c)
  }
}

export const chat = new ChatState()