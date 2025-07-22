<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let items: Array<{label: string; value: string; icon?: string}> = [];
	export let placeholder = 'Select an option';
	export let value = '';
	export let disabled = false;
	
	const dispatch = createEventDispatcher();
	
	let isOpen = false;
	let selectedItem = items.find(item => item.value === value);
	
	function toggleDropdown() {
		if (!disabled) {
			isOpen = !isOpen;
		}
	}
	
	function selectItem(item: {label: string; value: string; icon?: string}) {
		value = item.value;
		selectedItem = item;
		isOpen = false;
		dispatch('change', { value: item.value, item });
	}
	
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.dropdown')) {
			isOpen = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dropdown">
	<button 
		class="dropdown-trigger {disabled ? 'disabled' : ''}" 
		on:click={toggleDropdown}
		disabled={disabled}
	>
		{#if selectedItem}
			{#if selectedItem.icon}
				<span class="item-icon">{selectedItem.icon}</span>
			{/if}
			<span class="item-label">{selectedItem.label}</span>
		{:else}
			<span class="placeholder">{placeholder}</span>
		{/if}
		<span class="dropdown-arrow {isOpen ? 'open' : ''}">▼</span>
	</button>
	
	{#if isOpen}
		<div class="dropdown-menu">
			{#each items as item}
				<button 
					class="dropdown-item {item.value === value ? 'selected' : ''}"
					on:click={() => selectItem(item)}
				>
					{#if item.icon}
						<span class="item-icon">{item.icon}</span>
					{/if}
					<span class="item-label">{item.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-block;
		width: 100%;
	}

	.dropdown-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.95rem;
	}

	.dropdown-trigger:hover:not(.disabled) {
		border-color: var(--color-accent);
		background: rgba(255, 255, 255, 0.1);
	}

	.dropdown-trigger.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropdown-arrow {
		font-size: 0.8rem;
		transition: transform 0.2s ease;
	}

	.dropdown-arrow.open {
		transform: rotate(180deg);
	}

	.placeholder {
		opacity: 0.6;
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-lg);
		z-index: 1000;
		max-height: 200px;
		overflow-y: auto;
		margin-top: 0.25rem;
	}

	.dropdown-item {
		width: 100%;
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.95rem;
		text-align: left;
	}

	.dropdown-item:hover {
		background: var(--color-accent);
		color: white;
	}

	.dropdown-item.selected {
		background: var(--color-accent);
		color: white;
	}

	.item-icon {
		margin-right: 0.5rem;
		font-size: 1rem;
	}

	.item-label {
		flex: 1;
	}
</style> 