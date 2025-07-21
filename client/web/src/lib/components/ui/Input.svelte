<script lang="ts">
	import { cn } from '$lib/utils';

	export let value = '';
	export let type: 'text' | 'email' | 'password' | 'number' | 'search' = 'text';
	export let placeholder = '';
	export let disabled = false;
	export let readonly = false;
	export let required = false;
	export let error = '';
	export let label = '';
	export let id = '';
	export let name = '';
	export let autocomplete = '';
	export let maxlength: number | undefined = undefined;
	export let minlength: number | undefined = undefined;

	// Generate ID if not provided
	$: if (!id && label) {
		id = label.toLowerCase().replace(/\s+/g, '-');
	}

	$: inputClasses = cn(
		'input',
		error && 'input-error'
	);
</script>

<div class="space-y-1">
	{#if label}
		<label for={id} class="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
			{label}
			{#if required}
				<span class="text-red-500 ml-1">*</span>
			{/if}
		</label>
	{/if}
	
	<div class="relative">
		<input
			{id}
			{name}
			{type}
			{placeholder}
			{disabled}
			{readonly}
			{required}
			{autocomplete}
			{maxlength}
			{minlength}
			bind:value
			class={inputClasses}
			on:input
			on:change
			on:focus
			on:blur
			on:keydown
			on:keyup
			on:keypress
		/>
		
		{#if $$slots.icon}
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<slot name="icon" />
			</div>
		{/if}
		
		{#if $$slots.suffix}
			<div class="absolute inset-y-0 right-0 pr-3 flex items-center">
				<slot name="suffix" />
			</div>
		{/if}
	</div>
	
	{#if error}
		<p class="text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
			{error}
		</p>
	{/if}
	
	{#if $$slots.help}
		<p class="text-sm text-secondary-500 dark:text-secondary-400">
			<slot name="help" />
		</p>
	{/if}
</div>