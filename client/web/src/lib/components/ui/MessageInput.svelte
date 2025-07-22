<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Send, Paperclip, Smile } from 'lucide-svelte';

	export let placeholder = 'Message...';
	export let disabled = false;

	const dispatch = createEventDispatcher<{
		send: string;
	}>();

	let messageText = '';
	let textarea: HTMLTextAreaElement;

	function handleSubmit() {
		const trimmedText = messageText.trim();
		if (trimmedText && !disabled) {
			dispatch('send', trimmedText);
			messageText = '';
			if (textarea) {
				textarea.style.height = 'auto';
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	function handleInput() {
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
		}
	}
</script>

<div class="message-input">
	<div class="input-container">
		<button class="action-btn" title="Attach file">
			<Paperclip size={16} />
		</button>
		
		<textarea
			bind:this={textarea}
			bind:value={messageText}
			{placeholder}
			{disabled}
			on:keydown={handleKeydown}
			on:input={handleInput}
			class="text-input"
			rows="1"
		></textarea>
		
		<button class="action-btn" title="Emoji">
			<Smile size={16} />
		</button>
		
		<button 
			class="send-btn" 
			class:disabled={!messageText.trim() || disabled}
			on:click={handleSubmit}
			title="Send message"
		>
			<Send size={16} />
		</button>
	</div>
</div>

<style>
	.message-input {
		width: 100%;
	}

	.input-container {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		border-radius: 12px;
		padding: 12px;
		transition: border-color 0.2s ease;
	}

	.input-container:focus-within {
		border-color: var(--color-accent);
	}

	.action-btn {
		background: transparent;
		border: none;
		color: var(--color-text);
		opacity: 0.7;
		cursor: pointer;
		padding: 8px;
		border-radius: 6px;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.action-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	.text-input {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--color-text);
		font-size: 14px;
		line-height: 1.4;
		resize: none;
		outline: none;
		min-height: 20px;
		max-height: 120px;
		font-family: inherit;
	}

	.text-input::placeholder {
		color: var(--color-text);
		opacity: 0.5;
	}

	.send-btn {
		background: var(--color-accent);
		color: white;
		border: none;
		cursor: pointer;
		padding: 8px;
		border-radius: 6px;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.send-btn:hover:not(.disabled) {
		background: var(--color-accent-hover);
		transform: scale(1.05);
	}

	.send-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-glass);
		color: var(--color-text);
	}
</style> 