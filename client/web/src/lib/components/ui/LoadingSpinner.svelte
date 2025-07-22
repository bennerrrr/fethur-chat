<script lang="ts">
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let color = 'var(--color-accent)';

	$: sizeClass = `spinner-${size}`;
</script>

<div class="spinner {sizeClass}" style="--spinner-color: {color}">
	<div class="spinner-ring"></div>
</div>

<style>
	.spinner {
		display: inline-block;
		position: relative;
	}

	.spinner-ring {
		width: 100%;
		height: 100%;
		border: 2px solid transparent;
		border-top: 2px solid var(--spinner-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner-sm {
		width: 16px;
		height: 16px;
	}

	.spinner-md {
		width: 24px;
		height: 24px;
	}

	.spinner-lg {
		width: 32px;
		height: 32px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style> 