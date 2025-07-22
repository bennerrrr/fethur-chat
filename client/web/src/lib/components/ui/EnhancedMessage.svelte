<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Message, User } from '$lib/types';
	import { chatActions } from '$lib/stores/chat';
	import UserAvatar from './UserAvatar.svelte';
	import ReactionPicker from './ReactionPicker.svelte';
	import { formatDistanceToNow } from 'date-fns';

	export let message: Message;
	export let currentUser: User | null = null;
	export let isReply = false;
	export let showActions = true;

	const dispatch = createEventDispatcher();

	let showReactionPicker = false;
	let isEditing = false;
	let editContent = message.content;

	$: isOwnMessage = currentUser?.id === message.authorId;
	$: formattedTime = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

	function handleReply() {
		chatActions.setReplyTo(message);
		dispatch('reply', { message });
	}

	function handleEdit() {
		isEditing = true;
		editContent = message.content;
	}

	async function saveEdit() {
		try {
			await chatActions.editMessage(message.id, editContent);
			isEditing = false;
		} catch (error) {
			console.error('Failed to edit message:', error);
		}
	}

	function cancelEdit() {
		isEditing = false;
		editContent = message.content;
	}

	async function handleDelete() {
		if (confirm('Are you sure you want to delete this message?')) {
			try {
				await chatActions.deleteMessageAsync(message.id);
			} catch (error) {
				console.error('Failed to delete message:', error);
			}
		}
	}

	function handleReaction(emoji: string) {
		if (!currentUser) return;
		
		const existingReaction = message.reactions?.find(r => r.emoji === emoji);
		const userReacted = existingReaction?.users.some(u => u.id === currentUser.id);

		if (userReacted) {
			chatActions.removeReaction(message.id, emoji, currentUser.id);
		} else {
			chatActions.addReaction(message.id, emoji, currentUser.id);
		}
		
		showReactionPicker = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			cancelEdit();
		}
	}
</script>

<div class="message-container" class:is-reply={isReply} class:is-own={isOwnMessage}>
	{#if message.replyTo}
		<div class="reply-reference">
			<div class="reply-line"></div>
			<div class="reply-content">
				<UserAvatar user={message.replyTo.author} size="sm" />
				<span class="reply-username">{message.replyTo.author.username}</span>
				<span class="reply-text">{message.replyTo.content.slice(0, 50)}{message.replyTo.content.length > 50 ? '...' : ''}</span>
			</div>
		</div>
	{/if}

	<div class="message-main">
		<div class="message-avatar">
			<UserAvatar user={message.author} size="md" />
		</div>

		<div class="message-content">
			<div class="message-header">
				<span class="username" class:own-username={isOwnMessage}>
					{message.author.username}
				</span>
				<time class="timestamp" title={new Date(message.createdAt).toLocaleString()}>
					{formattedTime}
				</time>
				{#if message.isEdited}
					<span class="edited-indicator">(edited)</span>
				{/if}
			</div>

			<div class="message-body">
				{#if isEditing}
					<div class="edit-container">
						<textarea
							bind:value={editContent}
							on:keydown={handleKeydown}
							class="edit-input"
							rows="1"
							placeholder="Edit message..."
						></textarea>
						<div class="edit-actions">
							<button on:click={saveEdit} class="save-btn">Save</button>
							<button on:click={cancelEdit} class="cancel-btn">Cancel</button>
						</div>
					</div>
				{:else}
					<div class="message-text">
						{message.content}
					</div>
				{/if}

				{#if message.attachments?.length}
					<div class="attachments">
						{#each message.attachments as attachment}
							<div class="attachment">
								{#if attachment.mimeType.startsWith('image/')}
									<img src={attachment.url} alt={attachment.filename} class="attachment-image" />
								{:else}
									<div class="attachment-file">
										<span class="file-icon">📎</span>
										<span class="file-name">{attachment.filename}</span>
										<span class="file-size">{(attachment.size / 1024).toFixed(1)}KB</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if message.reactions?.length}
					<div class="reactions">
						{#each message.reactions as reaction}
							<button
								class="reaction"
								class:user-reacted={reaction.users.some(u => u.id === currentUser?.id)}
								on:click={() => handleReaction(reaction.emoji)}
							>
								<span class="reaction-emoji">{reaction.emoji}</span>
								<span class="reaction-count">{reaction.count}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if showActions && !isEditing}
				<div class="message-actions">
					<button on:click={handleReply} class="action-btn" title="Reply">
						💬
					</button>
					<button 
						on:click={() => showReactionPicker = !showReactionPicker} 
						class="action-btn" 
						title="Add reaction"
					>
						😊
					</button>
					{#if isOwnMessage}
						<button on:click={handleEdit} class="action-btn" title="Edit">
							✏️
						</button>
						<button on:click={handleDelete} class="action-btn delete" title="Delete">
							🗑️
						</button>
					{/if}
				</div>
			{/if}

			{#if showReactionPicker}
				<ReactionPicker on:reaction={(e) => handleReaction(e.detail)} />
			{/if}
		</div>
	</div>
</div>

<style>
	.message-container {
		display: flex;
		flex-direction: column;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		transition: background-color 0.2s;
	}

	.message-container:hover {
		background-color: rgba(255, 255, 255, 0.05);
	}

	.message-container:hover .message-actions {
		opacity: 1;
	}

	.is-reply {
		margin-left: 2rem;
		border-left: 3px solid var(--accent-color, #3b82f6);
		padding-left: 1rem;
	}

	.is-own {
		background-color: rgba(59, 130, 246, 0.1);
	}

	.reply-reference {
		display: flex;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280);
	}

	.reply-line {
		width: 2px;
		height: 1rem;
		background-color: var(--accent-color, #3b82f6);
		margin-right: 0.5rem;
	}

	.reply-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.reply-username {
		font-weight: 600;
		color: var(--accent-color, #3b82f6);
	}

	.reply-text {
		opacity: 0.8;
	}

	.message-main {
		display: flex;
		gap: 0.75rem;
	}

	.message-avatar {
		flex-shrink: 0;
	}

	.message-content {
		flex: 1;
		min-width: 0;
		position: relative;
	}

	.message-header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.username {
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.own-username {
		color: var(--accent-color, #3b82f6);
	}

	.timestamp {
		font-size: 0.75rem;
		color: var(--text-muted, #6b7280);
	}

	.edited-indicator {
		font-size: 0.75rem;
		color: var(--text-muted, #6b7280);
		font-style: italic;
	}

	.message-body {
		margin-bottom: 0.5rem;
	}

	.message-text {
		white-space: pre-wrap;
		word-wrap: break-word;
		line-height: 1.5;
		color: var(--text-secondary, #e5e5e5);
	}

	.edit-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.edit-input {
		background: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.375rem;
		padding: 0.5rem;
		color: var(--text-primary, #ffffff);
		resize: vertical;
		min-height: 2.5rem;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.save-btn, .cancel-btn {
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		border: none;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-btn {
		background-color: var(--accent-color, #3b82f6);
		color: white;
	}

	.save-btn:hover {
		background-color: var(--accent-hover, #2563eb);
	}

	.cancel-btn {
		background-color: transparent;
		color: var(--text-muted, #6b7280);
		border: 1px solid var(--border-color, #404040);
	}

	.cancel-btn:hover {
		background-color: var(--surface-color, #2d2d2d);
	}

	.attachments {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.attachment-image {
		max-width: 400px;
		max-height: 300px;
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.attachment-file {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background-color: var(--surface-color, #2d2d2d);
		border-radius: 0.375rem;
		border: 1px solid var(--border-color, #404040);
	}

	.file-icon {
		font-size: 1.25rem;
	}

	.file-name {
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.file-size {
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280);
	}

	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	.reaction {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.reaction:hover {
		border-color: var(--accent-color, #3b82f6);
	}

	.reaction.user-reacted {
		background-color: var(--accent-color, #3b82f6);
		border-color: var(--accent-color, #3b82f6);
		color: white;
	}

	.reaction-emoji {
		font-size: 1rem;
	}

	.reaction-count {
		font-weight: 500;
		min-width: 1rem;
		text-align: center;
	}

	.message-actions {
		position: absolute;
		top: -0.5rem;
		right: 0;
		display: flex;
		gap: 0.25rem;
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		padding: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.action-btn {
		padding: 0.25rem;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
		color: var(--text-secondary, #e5e5e5);
	}

	.action-btn:hover {
		background-color: var(--accent-color, #3b82f6);
	}

	.action-btn.delete:hover {
		background-color: #ef4444;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.message-container {
			color: #e5e5e5;
		}
	}
</style>
