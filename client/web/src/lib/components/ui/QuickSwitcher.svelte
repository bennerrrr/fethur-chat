<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  export let servers: Array<{id: number; name: string}> = [];
  export let channels: Array<{id: number; name: string; serverId: number}> = [];
  export let open = false;

  const dispatch = createEventDispatcher();
  let query = '';
  let inputEl: HTMLInputElement;

  $: items = [
    ...(Array.isArray(servers) ? servers.map(s => ({type: 'server', id: s.id, name: s.name})) : []),
    ...(Array.isArray(channels) ? channels.map(c => ({type: 'channel', id: c.id, name: c.name, serverId: c.serverId})) : [])
  ];
  $: filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      dispatch('close');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    if (open && inputEl) inputEl.focus();
  });
  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });

  function selectItem(item: any) {
    dispatch('select', item);
  }
</script>

{#if open}
  <div class="qs-backdrop">
    <div class="qs-modal" role="dialog" aria-modal="true" aria-label="Quick switcher">
      <input class="qs-input" placeholder="Search..." bind:this={inputEl} bind:value={query} />
      <ul class="qs-results">
        {#each filtered as item}
          <li><button on:click={() => selectItem(item)}>{item.name}</button></li>
        {/each}
      </ul>
      {#if filtered.length === 0}
        <p class="qs-empty">No results</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .qs-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }
  .qs-modal {
    background: var(--color-surface, #111);
    border: 1px solid var(--color-border, #333);
    border-radius: var(--radius-md, 6px);
    padding: 1rem;
    width: 300px;
  }
  .qs-input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .qs-results {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
  }
  .qs-results li button {
    width: 100%;
    text-align: left;
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: var(--color-text, #fff);
    cursor: pointer;
  }
  .qs-results li button:hover {
    background: var(--color-accent, #2563eb);
  }
  .qs-empty {
    text-align: center;
    color: var(--color-text-muted, #888);
  }
</style>
