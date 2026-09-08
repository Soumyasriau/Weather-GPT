<script lang="ts">
  import type { QueryResponse } from '@/lib/types'

  let { response }: { response: QueryResponse } = $props()

  const sources = $derived(
    response.sources.length > 0
      ? response.sources.map((s) => s.name).join(' + ')
      : 'source: unknown',
  )

  const observed = $derived(response.sources[0]?.observed_at ?? '')

  const engine = $derived(response.meta.engine)
</script>

<footer class="src">
  <span class="src-name">{sources}</span>
  {#if observed}
    <span class="sep" aria-hidden="true">·</span>
    <time>{observed}</time>
  {/if}
  <span class="sep" aria-hidden="true">·</span>
  <span class="latency">{response.meta.latency_ms} ms</span>
  {#if engine === 'fallback'}
    <span class="badge">quick answer</span>
  {/if}
</footer>

<style>
  .src {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s2);
    margin-top: var(--s3);
    padding-top: var(--s2);
    border-top: 1px dashed var(--border);
    font-size: var(--fs-xs);
    color: var(--text-faint);
  }

  .sep {
    color: var(--text-faint);
  }

  .src-name {
    color: var(--text-muted);
  }

  .badge {
    padding: 1px var(--s2);
    border-radius: var(--r-pill);
    background: var(--tertiary-soft);
    color: var(--tertiary);
    border: 1px solid var(--tertiary);
  }
</style>
