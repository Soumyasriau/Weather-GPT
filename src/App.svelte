<script lang="ts">
  import { chat } from '@/lib/state.svelte.ts'
  import MessageList from '@/lib/components/MessageList.svelte'
  import Composer from '@/lib/components/Composer.svelte'
</script>

<div class="app">
  <header>
    <div class="inner bar">
      <span class="brand">WeatherGPT</span>
      <span class="chips">
        <span class="chip">{chat.place.name}</span>
        <span class="chip">{chat.lang.toUpperCase()}</span>
        <span class="chip persona">{chat.persona}</span>
      </span>
    </div>
  </header>

  <div class="banner-slot">
    <!-- Step 10 mounts AlertBanner here. Red and orange only. -->
  </div>

  <MessageList messages={chat.messages} />

  <footer>
    <div class="inner">
      <Composer onsend={(text) => chat.send(text)} busy={chat.busy} />
    </div>
  </footer>
</div>

<style>
  .app {
    width: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    overflow: hidden;
  }

  /* Chrome runs full-bleed; only the content is capped. */
  .inner {
    width: 100%;
    max-width: var(--measure);
    margin: 0 auto;
  }

  header {
    flex: 0 0 auto;
    min-height: var(--header-h);
    padding: var(--s2) var(--s4);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
  }

  .brand {
    font-weight: 600;
    color: var(--primary-text);
  }

  .chips {
    display: flex;
    gap: var(--s1);
    overflow: hidden;
  }

  .chip {
    flex: 0 0 auto;
    padding: 2px var(--s2);
    border-radius: var(--r-pill);
    background: var(--secondary-soft);
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  .chip.persona {
    background: var(--farmer-soft);
    color: var(--farmer);
  }

  .banner-slot {
    flex: 0 0 auto;
  }

  footer {
    flex: 0 0 auto;
    padding: var(--s2) var(--s4);
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding-bottom: calc(var(--s2) + env(safe-area-inset-bottom));
  }
</style>
