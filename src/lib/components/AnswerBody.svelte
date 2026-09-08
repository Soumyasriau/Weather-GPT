<script lang="ts">
  import type { QueryResponse } from '@/lib/types'
  import ResearcherPanel from './ResearcherPanel.svelte'

  let { response }: { response: QueryResponse } = $props()

  const isPilot = $derived(response.persona === 'pilot')
  const isFarmer = $derived(response.answer.parts !== undefined)
  const isResearcher = $derived(response.persona === 'researcher' && response.data !== undefined)

  function openWeatherDetails(): void {
    const params = new URLSearchParams({
      city: response.place?.name ?? 'Pune',
      summary: response.answer.text,
      persona: response.persona,
      intent: response.intent,
      weather: response.answer.parts ? 'detailed' : 'overview',
    })

    window.open(`/weather-detail.html?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }
</script>

{#if isFarmer && response.answer.parts}
  <p class="text">{response.answer.text}</p>

  <ol class="parts">
    <li class="part action">
      <span class="label">Action</span>
      <span class="value">{response.answer.parts.action}</span>
    </li>
    <li class="part">
      <span class="label">Why</span>
      <span class="value">{response.answer.parts.why}</span>
    </li>
    <li class="part">
      <span class="label">Window</span>
      <span class="value">{response.answer.parts.window}</span>
    </li>
    <li class="part risk">
      <span class="label">Risk</span>
      <span class="value">{response.answer.parts.risk}</span>
    </li>
  </ol>
{:else if isResearcher && response.data}
  <p class="text">{response.answer.text}</p>
  <ResearcherPanel data={response.data} method={response.method} placeName={response.place.name} />
{:else}
  <p class="text" class:mono={isPilot}>{response.answer.text}</p>
{/if}

<button type="button" class="details-button" onclick={openWeatherDetails}>Open weather details</button>

<style>
  .text {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text.mono {
    font-family: var(--mono);
    font-size: var(--fs-sm);
    line-height: 1.5;
    background: var(--pilot-soft);
    padding: var(--s3);
    border-radius: var(--r-sm);
    border-left: 3px solid var(--pilot);
  }

  .parts {
    list-style: none;
    padding: 0;
    margin: var(--s3) 0 0;
    display: grid;
    gap: var(--s2);
  }

  .part {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: var(--s3);
    padding: var(--s2) var(--s3);
    border-radius: var(--r-sm);
    background: var(--farmer-soft);
    border-left: 3px solid var(--farmer);
  }

  .part.action {
    background: var(--primary-soft);
    border-left-color: var(--primary);
  }

  .part.risk {
    background: var(--alert-orange-bg);
    border-left-color: var(--alert-orange);
  }

  .label {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    align-self: center;
  }

  .part.action .label {
    color: var(--primary);
  }

  .part.risk .label {
    color: var(--alert-orange);
  }

  .value {
    color: var(--text);
    line-height: 1.45;
  }

  .details-button {
    margin-top: 12px;
    border: 1px solid rgba(37, 99, 235, 0.2);
    background: rgba(37, 99, 235, 0.08);
    color: var(--primary-text);
    border-radius: var(--r-pill);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
  }
</style>
