<script lang="ts">
  import type { ChatMessage } from '@/lib/types'
  import MessageBubble from './MessageBubble.svelte'
  import { chat } from '@/lib/state.svelte.ts'

  let { messages }: { messages: ChatMessage[] } = $props()

  let scroller: HTMLDivElement | undefined = $state()

  // Quick-tap suggestions when the chat is empty. The five scripted demo
  // questions, written in the language the user has currently picked.
  type Suggestion = { query: string; persona: string; lang: string; label: string }
  const SUGGESTIONS: Record<string, Suggestion[]> = {
    farmer: [
      { query: 'kal Pune mein baarish hogi kya?', persona: 'farmer', lang: 'hi', label: 'Pune, Hinglish' },
      { query: 'उद्या नाशिकमध्ये पाऊस?', persona: 'farmer', lang: 'mr', label: 'Nashik, Marathi' },
    ],
    pilot: [
      {
        query: 'Mumbai departure 0600 UTC tomorrow - crosswind and visibility?',
        persona: 'pilot',
        lang: 'en',
        label: 'Mumbai departure, TAF',
      },
    ],
    disaster: [
      {
        query: 'Any alerts for coastal Odisha next 48 hours?',
        persona: 'disaster',
        lang: 'en',
        label: 'Coastal Odisha alerts',
      },
    ],
    researcher: [
      {
        query: "Compare this week's rainfall in Nagpur with the last five years.",
        persona: 'researcher',
        lang: 'en',
        label: 'Nagpur, 5-year compare',
      },
    ],
  }

  const visible = $derived(SUGGESTIONS[chat.persona] ?? [])

  $effect(() => {
    const n = messages.length
    if (scroller && n >= 0) scroller.scrollTop = scroller.scrollHeight
  })

  function send(s: Suggestion): void {
    if (s.lang !== chat.lang) chat.setLang(s.lang as never)
    if (s.persona !== chat.persona) chat.setPersona(s.persona as never)
    chat.send(s.query)
  }
</script>

<div class="list" bind:this={scroller}>
  <div class="inner">
    {#if messages.length === 0}
    <div class="empty">
      <p class="title">Ask about the weather.</p>
      <p class="hint">
        In your own language, typed or spoken. You get an action, not just a forecast.
      </p>
        {#if visible.length > 0}
        <div class="suggest">
          <p class="suggest-title">Try a question</p>
          <div class="chips">
            {#each visible as s (s.query)}
              <button type="button" class="chip" onclick={() => send(s)} disabled={chat.busy}>
                {s.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
      {#each messages as message (message.id)}
        <MessageBubble {message} />
      {/each}
    {/if}
  </div>
</div>

<style>
  .list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: var(--s4);
    background: var(--bg);
  }

  /* Scrolls full-bleed, content capped so a wide screen stays readable. */
  .inner {
    width: 100%;
    max-width: var(--measure);
    margin: 0 auto;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  .empty {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    padding: var(--s6) var(--s5);
    color: var(--text-muted);
  }

  .title {
    margin: 0 0 var(--s2);
    font-size: var(--fs-xl);
    color: var(--text);
  }

  .hint {
    margin: 0;
    font-size: var(--fs-sm);
    line-height: 1.6;
  }

  .suggest {
    margin-top: var(--s6);
  }

  .suggest-title {
    margin: 0 0 var(--s3);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-faint);
  }

  .chips {
    display: flex;
    flex-direction: column;
    gap: var(--s2);
  }

  .chip {
    padding: var(--s3) var(--s4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    text-align: left;
    font-size: var(--fs-sm);
  }

  .chip:disabled {
    opacity: 0.5;
  }
</style>
