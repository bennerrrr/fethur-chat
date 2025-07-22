<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { X } from 'lucide-svelte';

	export let show = true;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let modalElement: HTMLElement;

	onMount(() => {
		// Close modal on escape key
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				handleClose();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleClose() {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<div class="modal-backdrop" on:click={handleBackdropClick}>
	<div class="modal-container" bind:this={modalElement}>
		<button class="close-btn" on:click={handleClose}>
			<X size={20} />
		</button>
		<slot />
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	.modal-container {
		background: var(--color-bg-alt);
		border: 1px solid var(--color-glass-border);
		border-radius: 12px;
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		overflow: auto;
		animation: slideIn 0.2s ease;
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		background: transparent;
		border: none;
		color: var(--color-text);
		opacity: 0.7;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s ease;
		z-index: 1;
	}

	.close-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: scale(0.95) translateY(-10px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	/* Scrollbar styling */
	.modal-container::-webkit-scrollbar {
		width: 6px;
	}

	.modal-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.modal-container::-webkit-scrollbar-thumb {
		background: var(--color-glass-border);
		border-radius: 3px;
	}

	.modal-container::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
	}
</style> 