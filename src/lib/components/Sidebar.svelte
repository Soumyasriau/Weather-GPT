<script lang="ts">
  import { chat } from '@/lib/state.svelte.ts'

  function fmtDate(ts: number): string {
    const d = new Date(ts)
    const today = new Date()
    const sameDay = d.toDateString() === today.toDateString()
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
</script>

<aside class="sidebar" class:collapsed={!chat.sidebarOpen}>
  <div class="head">
    <button type="button" class="new-chat" onclick={() => chat.newChat()}>
      + New chat
    </button>
  </div>

  <div class="list">
    {#each chat.chats as c (c.id)}
      <div
        class="item"
        class:active={c.id === chat.activeChatId}
        role="button"
        tabindex="0"
        onclick={() => chat.selectChat(c.id)}
        onkeydown={(e) => e.key === 'Enter' && chat.selectChat(c.id)}
      >
        <div class="main">
          <div class="title">{c.title || 'New chat'}</div>
          <div class="sub">{fmtDate(c.updatedAt)} · {c.persona}</div>
        </div>
        <button
          type="button"
          class="delete"
          aria-label="Delete chat"
          onclick={(e) => {
            e.stopPropagation()
            chat.deleteChat(c.id)
          }}
        >
          ✕
        </button>
      </div>
    {/each}
  </div>
</aside>

<style>
  .sidebar {
    width: 260px;
    flex: 0 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow: hidden;
    transition: width 0.2s ease, opacity 0.2s ease;
  }

  .sidebar.collapsed {
    width: 0;
    border-right: none;
    opacity: 0;
  }

  .head {
    padding: var(--s3);
    border-bottom: 1px solid var(--border);
  }

  .new-chat {
    width: 100%;
    padding: var(--s3) var(--s3);
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--primary-soft);
    color: var(--primary-text);
    font-weight: 600;
    font-size: var(--fs-sm);
  }

  .list {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: var(--s2);
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
    padding: var(--s3);
    border-radius: var(--r-md);
    cursor: pointer;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .item.active {
    background: var(--primary-soft);
    color: var(--text);
  }

  .main {
    min-width: 0;
  }

  .title {
    font-size: var(--fs-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 175px;
  }

  .sub {
    font-size: var(--fs-xs);
    color: var(--text-faint);
    margin-top: 2px;
  }

  .delete {
    flex: 0 0 auto;
    background: none;
    border: none;
    color: var(--text-faint);
    opacity: 0;
    font-size: 12px;
  }

  .item:hover .delete {
    opacity: 1;
  }

  .delete:hover {
    color: var(--text);
  }
</style>