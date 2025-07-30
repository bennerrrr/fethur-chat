<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let currentUser;
  $: currentUser = $authStore.user;
  let activeTab = 'voice';

  onMount(() => {
    if (!currentUser) {
      goto('/');
    }
  });
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="settings-page" id="main-content">
  <nav class="tab-nav" aria-label="Settings sections">
    <button on:click={() => (activeTab = 'voice')} class:active={activeTab === 'voice'}>Voice</button>
    <button on:click={() => (activeTab = 'plugins')} class:active={activeTab === 'plugins'}>Plugins</button>
  </nav>

  {#if activeTab === 'voice'}
    <section aria-label="Voice settings">
      <h2>Voice Settings</h2>
      <p>Configure input/output devices and push-to-talk.</p>
    </section>
  {:else if activeTab === 'plugins'}
    {#if currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin')}
      <section aria-label="Plugin management">
        <h2>Plugin Management</h2>
        <p>Enable or disable installed plugins.</p>
      </section>
    {:else}
      <p>Plugin management is restricted to admin users.</p>
    {/if}
  {/if}
</div>

<style>
  .settings-page {
    padding: 1rem;
    color: var(--color-text);
  }
  .tab-nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .tab-nav button {
    background: transparent;
    border: 1px solid var(--color-border, #333);
    color: var(--color-text);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm, 4px);
  }
  .tab-nav button.active {
    background: var(--color-accent, #2563eb);
  }
</style>
