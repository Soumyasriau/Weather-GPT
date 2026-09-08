<script lang="ts">
  import type { DataTable, MethodNote } from '@/lib/types'
  import { buildCsv, downloadFile } from '@/lib/export.ts'

  let {
    data,
    method,
    placeName,
  }: { data: DataTable; method: MethodNote; placeName: string } = $props()

  const columns = $derived(data.columns ?? [])
  const rows = $derived(data.rows ?? [])

  function safe(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function exportCsv(): void {
    const csv = data.csv ?? (columns.length > 0 ? buildCsv(columns, rows) : '')
    if (csv) downloadFile(`${safe(placeName)}-research.csv`, csv, 'text/csv')
  }

  function exportJson(): void {
    const json = data.json ?? (columns.length > 0 ? { columns, rows } : null)
    if (json) downloadFile(`${safe(placeName)}-research.json`, JSON.stringify(json, null, 2), 'application/json')
  }
</script>

<div class="panel">
  <div class="head">
    <span class="dot" aria-hidden="true"></span>
    <span class="title">Research data</span>
    <span class="model">{method.model}</span>
  </div>

  <p class="method">
    {method.model} at {method.resolution}, run {method.run}.
    Source: {method.source}. Range {method.range.from} to {method.range.to}.
  </p>

  {#if columns.length > 0}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            {#each columns as c (c)}
              <th>{c}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as r, i (i)}
            <tr>
              {#each r as cell (cell)}
                <td>{cell}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="actions">
    <button type="button" onclick={exportCsv} disabled={columns.length === 0}>
      Export CSV
    </button>
    <button type="button" onclick={exportJson} disabled={columns.length === 0}>
      Export JSON
    </button>
  </div>
</div>

<style>
  .panel {
    margin-top: var(--s3);
    padding: var(--s3) var(--s4);
    background: var(--researcher-soft);
    border: 1px solid var(--researcher);
    border-radius: var(--r-md);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--s2);
    color: var(--researcher);
    font-weight: 600;
    font-size: var(--fs-sm);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--researcher);
  }

  .title {
    flex: 1 1 auto;
  }

  .model {
    font-weight: 400;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .method {
    margin: var(--s2) 0 var(--s3);
    font-size: var(--fs-xs);
    line-height: 1.5;
    color: var(--text-muted);
  }

  .scroll {
    overflow-x: auto;
    border-radius: var(--r-sm);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-sm);
  }

  th,
  td {
    padding: var(--s2) var(--s3);
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    font-weight: 500;
    color: var(--text-muted);
    background: var(--surface-sunken);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .actions {
    display: flex;
    gap: var(--s2);
    margin-top: var(--s3);
  }

  button {
    flex: 1 1 auto;
    padding: var(--s2) var(--s3);
    border: 1px solid var(--researcher);
    border-radius: var(--r-sm);
    background: var(--surface);
    color: var(--researcher);
    font-size: var(--fs-sm);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
