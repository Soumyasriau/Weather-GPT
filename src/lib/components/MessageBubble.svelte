<script lang="ts">
  import type { ChatMessage } from '@/lib/types'
  import AnswerBody from './AnswerBody.svelte'
  import SourceFooter from './SourceFooter.svelte'

  let { message }: { message: ChatMessage } = $props()

  const time = $derived.by(() =>
    new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  )
</script>

<div class="row" class:mine={message.role === 'user'}>
  <div class="bubble" class:mine={message.role === 'user'}>
    {#if message.text === '' && !message.error && message.role === 'assistant'}
      <span class="typing" aria-label="Thinking">
        <i></i><i></i><i></i>
      </span>
    {:else if message.error}
      <p class="text error">{message.text}</p>
    {:else if message.role === 'assistant' && message.response}
      <AnswerBody response={message.response} />
      <SourceFooter response={message.response} />
    {:else}
      <p class="text">{message.text}</p>
    {/if}

    {#if message.text !== '' || message.error}
      <div class="meta">
        <span>{time}</span>
        {#if message.demo}
          <span class="badge">demo data</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .row {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 12px;
  }

  .row.mine {
    justify-content: flex-end;
  }

  .bubble {
    max-width: 88%;
    padding: 16px 18px;
    border-radius: 22px 22px 22px 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: none;
  }

  .bubble.mine {
    background: linear-gradient(135deg, #2a3560, #22294a);
    border-color: transparent;
    color: var(--text-inverse);
    border-radius: 20px 20px 4px 20px;
  }

  .text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text.error {
    color: var(--disaster);
  }

  .meta {
    display: flex;
    gap: var(--s2);
    align-items: center;
    margin-top: var(--s2);
    font-size: var(--fs-xs);
    color: var(--text-faint);
  }

  .bubble.mine .meta {
    color: rgba(255, 255, 255, 0.8);
  }

  .badge {
    padding: 1px var(--s2);
    border-radius: var(--r-pill);
    background: var(--tertiary-soft);
    color: var(--tertiary);
    border: 1px solid var(--tertiary);
    font-size: var(--fs-xs);
  }

  .bubble.mine .badge {
    background: rgba(255, 255, 255, 0.12);
    color: var(--text-inverse);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .typing {
    display: inline-flex;
    gap: var(--s1);
  }

  .typing i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border-strong);
    animation: blink 1.2s infinite ease-in-out;
  }

  .typing i:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing i:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes blink {
    0%,
    80%,
    100% {
      opacity: 0.25;
    }
    40% {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .typing i {
      animation: none;
      opacity: 0.5;
    }
  }
</style>
