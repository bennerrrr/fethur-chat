<script lang="ts">
	// Simple time formatting without date-fns dependency
	import { MoreHorizontal, Edit, Trash2 } from 'lucide-svelte';
	import type { Message, User } from '$lib/types';
	import UserAvatar from './UserAvatar.svelte';

	export let message: Message;
	export let currentUser: User | null = null;
	export let isFirstInGroup = false;

	let showActions = false;

	function toggleActions() {
		showActions = !showActions;
	}

	function formatTime(date: Date) {
		const now = new Date();
		const messageDate = new Date(date);
		const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
		
		if (diffInMinutes < 1) return 'just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
		return `${Math.floor(diffInMinutes / 1440)}d ago`;
	}

	$: isOwnMessage = currentUser?.id === message.authorId;
</script>

<div class="message" class:own-message={isOwnMessage}>
	{#if isFirstInGroup}
		<div class="message-avatar">
			<UserAvatar user={message.author} size="sm" />
		</div>
	{/if}
	
	<div class="message-content">
		{#if isFirstInGroup}
			<div class="message-header">
				<span class="message-author">{message.author.username}</span>
				<span class="message-time">{formatTime(message.createdAt)}</span>
			</div>
		{/if}
		
		<div class="message-text">
			{message.content}
		</div>
		
		{#if message.isEdited}
			<div class="message-edited">(edited)</div>
		{/if}
	</div>

	{#if isOwnMessage}
		<div class="message-actions">
			<button class="action-btn" on:click={toggleActions}>
				<MoreHorizontal size={16} />
			</button>
			
			{#if showActions}
				<div class="actions-menu">
					<button class="action-item">
						<Edit size={14} />
						Edit
					</button>
					<button class="action-item delete">
						<Trash2 size={14} />
						Delete
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.message {
		display: flex;
		gap: 12px;
		padding: 4px 0;
		position: relative;
	}

	.message:hover {
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		margin: 0 -8px;
		padding: 4px 8px;
	}

	.message-avatar {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.message:hover .message-avatar {
		opacity: 1;
	}

	.message-content {
		flex: 1;
		min-width: 0;
	}

	.message-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.message-author {
		font-weight: 600;
		color: var(--color-text);
		font-size: 14px;
	}

	.message-time {
		font-size: 12px;
		color: var(--color-text);
		opacity: 0.5;
	}

	.message-text {
		color: var(--color-text);
		font-size: 14px;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.message-edited {
		font-size: 12px;
		color: var(--color-text);
		opacity: 0.5;
		margin-top: 2px;
	}

	.message-actions {
		position: relative;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.message:hover .message-actions {
		opacity: 1;
	}

	.action-btn {
		background: transparent;
		border: none;
		color: var(--color-text);
		opacity: 0.7;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	.actions-menu {
		position: absolute;
		top: 100%;
		right: 0;
		background: var(--color-bg-alt);
		border: 1px solid var(--color-glass-border);
		border-radius: 8px;
		padding: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1000;
		min-width: 120px;
	}

	.action-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		border-radius: 4px;
		font-size: 14px;
		transition: background 0.2s ease;
	}

	.action-item:hover {
		background: var(--color-glass);
	}

	.action-item.delete {
		color: #ef4444;
	}

	.action-item.delete:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.own-message {
		flex-direction: row-reverse;
	}

	.own-message .message-content {
		text-align: right;
	}

	.own-message .message-header {
		justify-content: flex-end;
	}

	.own-message .message-actions {
		order: -1;
	}
</style> 