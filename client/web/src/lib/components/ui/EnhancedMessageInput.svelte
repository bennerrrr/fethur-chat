<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Message } from '$lib/types';
	import { chatActions, replyingTo } from '$lib/stores/chat';

	export let channelId: number;
	export let placeholder = 'Type a message...';
	export let disabled = false;

	const dispatch = createEventDispatcher();

	let content = '';
	let textArea: HTMLTextAreaElement;
	let fileInput: HTMLInputElement;
	let isDragging = false;
	let isUploading = false;
	let uploadProgress = 0;

	$: canSend = content.trim().length > 0 && !disabled && !isUploading;

	function adjustTextAreaHeight() {
		if (textArea) {
			textArea.style.height = 'auto';
			textArea.style.height = Math.min(textArea.scrollHeight, 200) + 'px';
		}
	}

	async function sendMessage() {
		if (!canSend) return;

		const messageContent = content.trim();
		const replyToId = $replyingTo?.id;

		// Clear input immediately for better UX
		content = '';
		adjustTextAreaHeight();

		try {
			await chatActions.sendMessage(channelId, messageContent, replyToId);
			dispatch('messageSent', { content: messageContent });
		} catch (error) {
			// Restore content on error
			content = messageContent;
			console.error('Failed to send message:', error);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	function handleFileSelect() {
		fileInput.click();
	}

	async function handleFileChange(event: Event) {
		const files = (event.target as HTMLInputElement).files;
		if (!files || files.length === 0) return;

		for (const file of Array.from(files)) {
			await uploadFile(file);
		}
	}

	async function uploadFile(file: File) {
		try {
			isUploading = true;
			uploadProgress = 0;

			// Create FormData for file upload
			const formData = new FormData();
			formData.append('file', file);
			formData.append('channelId', channelId.toString());

			// Simulate upload progress (replace with actual upload logic)
			const uploadPromise = new Promise((resolve) => {
				let progress = 0;
				const interval = setInterval(() => {
					progress += 10;
					uploadProgress = progress;
					if (progress >= 100) {
						clearInterval(interval);
						resolve(null);
					}
				}, 100);
			});

			await uploadPromise;

			// TODO: Replace with actual API call
			console.log('File uploaded:', file.name);
			
			// Send message with file attachment
			await chatActions.sendMessage(channelId, `📎 ${file.name}`, $replyingTo?.id);

		} catch (error) {
			console.error('Failed to upload file:', error);
		} finally {
			isUploading = false;
			uploadProgress = 0;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		if (!event.relatedTarget || !event.currentTarget?.contains(event.relatedTarget as Node)) {
			isDragging = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			for (const file of Array.from(files)) {
				uploadFile(file);
			}
		}
	}

	function clearReply() {
		chatActions.clearReply();
	}

	// Auto-resize textarea on content change
	$: if (content !== undefined) {
		requestAnimationFrame(adjustTextAreaHeight);
	}
</script>

<div class="message-input-container">
	{#if $replyingTo}
		<div class="reply-preview">
			<div class="reply-content">
				<span class="reply-label">Replying to</span>
				<span class="reply-username">{$replyingTo.author.username}</span>
				<span class="reply-text">{$replyingTo.content.slice(0, 100)}</span>
			</div>
			<button on:click={clearReply} class="reply-close">✕</button>
		</div>
	{/if}

	<div 
		class="input-wrapper" 
		class:dragging={isDragging}
		class:uploading={isUploading}
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
	>
		{#if isDragging}
			<div class="drag-overlay">
				<div class="drag-content">
					<span class="drag-icon">📁</span>
					<span class="drag-text">Drop files to upload</span>
				</div>
			</div>
		{/if}

		{#if isUploading}
			<div class="upload-overlay">
				<div class="upload-progress">
					<div class="progress-bar" style="width: {uploadProgress}%"></div>
				</div>
				<span class="upload-text">Uploading... {uploadProgress}%</span>
			</div>
		{/if}

		<div class="input-controls">
			<button
				class="control-btn file-btn"
				on:click={handleFileSelect}
				disabled={isUploading}
				title="Attach file"
			>
				📎
			</button>

			<textarea
				bind:this={textArea}
				bind:value={content}
				on:keydown={handleKeyDown}
				on:input={adjustTextAreaHeight}
				{placeholder}
				{disabled}
				class="message-textarea"
				rows="1"
			></textarea>

			<button
				class="control-btn send-btn"
				class:can-send={canSend}
				on:click={sendMessage}
				disabled={!canSend}
				title="Send message"
			>
				{#if isUploading}
					⏳
				{:else}
					➤
				{/if}
			</button>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			multiple
			on:change={handleFileChange}
			style="display: none"
			accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
		/>
	</div>

	<div class="input-hints">
		<span class="hint">Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line</span>
	</div>
</div>

<style>
	.message-input-container {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		background-color: var(--surface-color, #2d2d2d);
		border-top: 1px solid var(--border-color, #404040);
	}

	.reply-preview {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--accent-color, #3b82f6);
		background-color: rgba(59, 130, 246, 0.1);
		border: 1px solid var(--accent-color, #3b82f6);
		border-radius: 0.5rem 0.5rem 0 0;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.reply-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.reply-label {
		font-size: 0.75rem;
		color: var(--accent-color, #3b82f6);
		font-weight: 600;
	}

	.reply-username {
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.reply-text {
		color: var(--text-muted, #6b7280);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reply-close {
		background: none;
		border: none;
		color: var(--text-muted, #6b7280);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.reply-close:hover {
		background-color: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #ffffff);
	}

	.input-wrapper {
		position: relative;
		background-color: var(--input-bg, #1a1a1a);
		border: 2px solid var(--border-color, #404040);
		border-radius: 0.75rem;
		transition: all 0.2s;
	}

	.input-wrapper:focus-within {
		border-color: var(--accent-color, #3b82f6);
	}

	.input-wrapper.dragging {
		border-color: var(--accent-color, #3b82f6);
		background-color: rgba(59, 130, 246, 0.1);
	}

	.input-wrapper.uploading {
		border-color: #f59e0b;
	}

	.drag-overlay, .upload-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.8);
		border-radius: 0.75rem;
		z-index: 10;
	}

	.drag-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.drag-icon {
		font-size: 2rem;
	}

	.drag-text {
		font-weight: 600;
		color: var(--accent-color, #3b82f6);
	}

	.upload-progress {
		width: 200px;
		height: 4px;
		background-color: var(--border-color, #404040);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-bar {
		height: 100%;
		background-color: #f59e0b;
		transition: width 0.3s ease;
	}

	.upload-text {
		color: #f59e0b;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.input-controls {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.control-btn {
		background: none;
		border: none;
		padding: 0.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1.25rem;
		color: var(--text-muted, #6b7280);
		flex-shrink: 0;
	}

	.control-btn:hover {
		background-color: var(--surface-color, #2d2d2d);
		color: var(--text-primary, #ffffff);
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.send-btn.can-send {
		color: var(--accent-color, #3b82f6);
	}

	.send-btn.can-send:hover {
		background-color: var(--accent-color, #3b82f6);
		color: white;
	}

	.message-textarea {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: var(--text-primary, #ffffff);
		font-size: 1rem;
		line-height: 1.5;
		resize: none;
		min-height: 1.5rem;
		max-height: 200px;
		font-family: inherit;
	}

	.message-textarea::placeholder {
		color: var(--text-muted, #6b7280);
	}

	.input-hints {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted, #6b7280);
	}

	.hint {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	kbd {
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		font-size: 0.625rem;
		font-family: monospace;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.message-input-container {
			padding: 0.75rem;
		}

		.input-hints {
			display: none;
		}

		.control-btn {
			padding: 0.375rem;
			font-size: 1rem;
		}
	}
</style>
