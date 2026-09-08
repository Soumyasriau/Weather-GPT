<script lang="ts">
  import { onMount } from 'svelte'
  import { chat } from '@/lib/state.svelte.ts'
  import Sidebar from '@/lib/components/Sidebar.svelte'
  import MessageList from '@/lib/components/MessageList.svelte'
  import Composer from '@/lib/components/Composer.svelte'

  onMount(() => {
    chat.init()
  })
</script>

<div class="app-shell">
  <Sidebar />

  <div class="chat-panel">
    <header class="topbar">
      <button
        type="button"
        class="menu-btn"
        aria-label="Toggle chat list"
        onclick={() => chat.toggleSidebar()}
      >
        ☰
      </button>

      <div class="brand-wrap">
        <div>
          <div class="brand">WeatherGPT</div>
          <div class="subtitle">ask it like a person</div>
        </div>
      </div>

      <div class="chips">
        {#if chat.ready}
          <span class="chip">{chat.place.name}</span>
          <span class="chip">{chat.lang.toUpperCase()}</span>
          <span class="chip persona">{chat.persona}</span>
        {/if}
      </div>
    </header>

    <div class="banner-slot">
      <!-- Step 10 mounts AlertBanner here. Red and orange only. -->
    </div>

    {#if chat.ready}
      <MessageList messages={chat.messages} />
    {:else}
      <div class="loading">Loading chats…</div>
    {/if}

    <footer class="composer-wrap">
      <Composer onsend={(text) => chat.send(text)} busy={chat.busy} />
    </footer>
  </div>
</div>

<style>
  .app-shell {
    width: 100%;
    height: 100dvh;
    display: flex;
    align-items: stretch;
    background:
      radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 32%),
      linear-gradient(180deg, #edf6ff 0%, #f4f7fb 100%);
  }

  .chat-panel {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: transparent;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 22px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: transparent;
    position: relative;
  }

  .menu-btn {
    position: absolute;
    left: 20px;
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text);
  }

  .brand-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--text);
    text-align: center;
  }

  .subtitle {
    font-size: 11px;
    color: var(--text-faint);
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    text-align: center;
  }

  .chips {
    position: absolute;
    right: 20px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .chip {
    flex: 0 0 auto;
    padding: 6px 10px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .chip.persona {
    background: rgba(167, 214, 154, 0.12);
    color: var(--farmer);
  }

  .banner-slot {
    flex: 0 0 auto;
  }

  .loading {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-faint);
  }

  .composer-wrap {
    flex: 0 0 auto;
    background: transparent;
    border-top: 1px solid var(--border);
    padding: 16px 20px 18px;
  }

  @media (max-width: 640px) {
    .topbar {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 16px;
    }

    .menu-btn {
      position: static;
      align-self: flex-start;
      margin-bottom: 6px;
    }

    .chips {
      position: static;
      justify-content: flex-start;
    }

    .composer-wrap {
      padding: 12px 14px 14px;
    }
  }
</style>