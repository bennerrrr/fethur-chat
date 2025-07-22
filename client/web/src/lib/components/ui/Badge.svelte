<script lang="ts">
	export let text = '';
	export let variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let icon = '';
</script>

<div class="badge {variant} {size}">
	{#if icon}
		<span class="badge-icon">{icon}</span>
	{/if}
	<span class="badge-text">{text}</span>
</div>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		color: var(--color-text);
	}

	.badge.sm {
		padding: 0.125rem 0.375rem;
		font-size: 0.7rem;
	}

	.badge.lg {
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
	}

	.badge.default {
		background: var(--color-glass);
		color: var(--color-text);
	}

	.badge.success {
		background: rgba(16, 185, 129, 0.2);
		border-color: rgba(16, 185, 129, 0.3);
		color: var(--color-success);
	}

	.badge.warning {
		background: rgba(245, 158, 11, 0.2);
		border-color: rgba(245, 158, 11, 0.3);
		color: var(--color-warning);
	}

	.badge.error {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.3);
		color: var(--color-error);
	}

	.badge.info {
		background: rgba(99, 102, 241, 0.2);
		border-color: rgba(99, 102, 241, 0.3);
		color: var(--color-accent);
	}

	.badge-icon {
		font-size: 0.8em;
	}

	.badge-text {
		line-height: 1;
	}
</style> 