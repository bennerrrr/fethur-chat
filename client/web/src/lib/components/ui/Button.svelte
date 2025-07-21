<script lang="ts">
	import { cn } from '$lib/utils';

	export let variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let disabled = false;
	export let loading = false;
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let href: string | undefined = undefined;

	const baseClasses = 'btn';
	
	const variants = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		ghost: 'btn-ghost',
		danger: 'btn-danger'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	$: classes = cn(
		baseClasses,
		variants[variant],
		sizes[size],
		(disabled || loading) && 'opacity-50 cursor-not-allowed'
	);
</script>

{#if href && !disabled}
	<a {href} class={classes} role="button" tabindex="0">
		{#if loading}
			<span class="spinner mr-2" aria-hidden="true"></span>
		{/if}
		<slot />
	</a>
{:else}
	<button 
		{type} 
		{disabled}
		class={classes}
		on:click
		on:focus
		on:blur
		on:keydown
	>
		{#if loading}
			<span class="spinner mr-2" aria-hidden="true"></span>
		{/if}
		<slot />
	</button>
{/if}