<script lang="ts">
  let {
    onsend,
    busy = false,
  }: { onsend: (text: string) => void; busy?: boolean } = $props()

  let value = $state('')
  let field: HTMLTextAreaElement | undefined = $state()

  function submit(): void {
    const text = value.trim()
    if (text === '' || busy) return
    onsend(text)
    value = ''
    // Textarea autosize: reset to one row after sending.
    if (field) field.style.height = 'auto'
  }

  function onkeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter is a newline. Mobile keyboards have no Ctrl.
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
</script>

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
    placeholder="Ask about the weather..."
    aria-label="Your question"
  ></textarea>

  <button type="submit" disabled={busy || value.trim() === ''} aria-label="Send">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M3 20l18-8L3 4l4 8-4 8z" fill="currentColor" />
    </svg>
  </button>
</form>

<style>
  .composer {
    display: flex;
    align-items: flex-end;
    gap: var(--s2);
    padding: var(--s2) 0;
  }

  textarea {
    flex: 1 1 auto;
    resize: none;
    overflow-y: auto;
    max-height: 120px;
    padding: var(--s3) var(--s4);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--surface);
    line-height: 1.4;
  }

  textarea::placeholder {
    color: var(--text-faint);
  }

  textarea:focus-visible {
    outline: none;
    border-color: var(--primary);
  }

  button {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: var(--r-pill);
    background: var(--primary);
    color: var(--text-inverse);
  }

  button:disabled {
    background: var(--surface-sunken);
    color: var(--text-faint);
    cursor: default;
  }
</style>
