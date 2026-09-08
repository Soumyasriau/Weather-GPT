<script lang="ts">
  let {
    onsend,
    busy = false,
  }: { onsend: (text: string) => void; busy?: boolean } = $props()

  let value = $state('')
  let field: HTMLTextAreaElement | undefined = $state()
  let listening = $state(false)

  function submit(): void {
    const text = value.trim()
    if (text === '' || busy) return
    onsend(text)
    value = ''
    if (field) field.style.height = 'auto'
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  function autosize(): void {
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 120)}px`
  }

  function speakText(text: string): void {
    const clean = text.trim()
    if (!clean || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'en-IN'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function startVoiceInput(): void {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      alert('Voice input is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
      value = transcript.trim()
      autosize()
    }

    recognition.onerror = () => {
      listening = false
    }

    recognition.onend = () => {
      listening = false
    }

    listening = true
    recognition.start()
  }
</script>

<div class="composer-shell">
  <div class="action-row">
    <button type="button" class="pill secondary" onclick={() => speakText(value)} disabled={busy || value.trim() === ''}>
      Speak
    </button>
    <button type="button" class="pill" class:active={listening} onclick={startVoiceInput} disabled={busy}>
      {listening ? 'Listening...' : 'Voice'}
    </button>
  </div>

  <form
    class="composer"
    onsubmit={(event) => {
      event.preventDefault()
      submit()
    }}
  >
    <textarea
      bind:this={field}
      bind:value
      {onkeydown}
      oninput={autosize}
      rows="1"
      placeholder="Ask about weather, rain, crops, flights, or alerts..."
      aria-label="Your weather question"
    ></textarea>

    <button type="submit" class="send" disabled={busy || value.trim() === ''} aria-label="Send message">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M3 20l18-8L3 4l4 8-4 8z" fill="currentColor" />
      </svg>
    </button>
  </form>
</div>

<style>
  .composer-shell {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .action-row {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .pill {
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    border-radius: var(--r-pill);
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .pill.secondary {
    background: rgba(14, 116, 144, 0.06);
    color: var(--primary-text);
  }

  .pill.active {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.2);
    color: var(--primary-text);
  }

  .composer {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 8px 8px 18px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: var(--surface);
  }

  textarea {
    flex: 1 1 auto;
    resize: none;
    overflow-y: auto;
    max-height: 120px;
    padding: 8px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    line-height: 1.5;
    box-shadow: none;
  }

  textarea::placeholder {
    color: var(--text-faint);
  }

  textarea:focus-visible {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .send {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 50%;
    background: var(--primary);
    color: #0c1730;
    box-shadow: none;
  }

  .send:disabled {
    opacity: 0.5;
    cursor: default;
    box-shadow: none;
  }
</style>
