<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { Send, Paperclip, Smile } from 'lucide-svelte';
	import type { Message, Channel, User } from '$lib/types';
	import MessageComponent from './Message.svelte';
	import MessageInput from './MessageInput.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';

	export let channel: Channel | null = null;
	export let messages: Message[] = [];
	export let typingUsers: any[] = [];
	export let isLoadingMessages = false;
	export let hasMoreMessages = true;
	export let currentUser: User | null = null;

	const dispatch = createEventDispatcher<{
		sendMessage: string;
		loadMoreMessages: void;
	}>();

	let messagesContainer: HTMLElement;
	let isScrolledToBottom = true;

	onMount(() => {
		if (messagesContainer) {
			scrollToBottom();
		}
	});

	$: if (messages.length > 0 && messagesContainer) {
		tick().then(() => {
			if (isScrolledToBottom) {
				scrollToBottom();
			}
		});
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function handleScroll() {
		if (messagesContainer) {
			const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
			isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100;
			
			// Load more messages when scrolling to top
			if (scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
				dispatch('loadMoreMessages');
			}
		}
	}

	function handleSendMessage(content: string) {
		dispatch('sendMessage', content);
	}
</script>

<div class="chat-area">
	<!-- Channel Header -->
	{#if channel}
		<div class="channel-header">
			<div class="channel-info">
				<h2 class="channel-name">#{channel.name}</h2>
				{#if channel.description}
					<p class="channel-description">{channel.description}</p>
				{/if}
			</div>
			<div class="channel-actions">
				<button class="action-btn" title="Attach file">
					<Paperclip size={16} />
				</button>
				<button class="action-btn" title="Emoji">
					<Smile size={16} />
				</button>
			</div>
		</div>
	{/if}

	<!-- Messages Container -->
	<div 
		class="messages-container" 
		bind:this={messagesContainer}
		on:scroll={handleScroll}
	>
		<!-- Loading indicator for older messages -->
		{#if isLoadingMessages}
			<div class="loading-messages">
				<LoadingSpinner size="sm" />
				<span>Loading messages...</span>
			</div>
		{/if}

		<!-- Messages -->
		{#if messages.length > 0}
			{#each messages as message, index (message.id)}
				<MessageComponent 
					{message} 
					{currentUser}
					isFirstInGroup={index === 0 || messages[index - 1].authorId !== message.authorId}
				/>
			{/each}
		{:else if !isLoadingMessages}
			<div class="empty-messages">
				<div class="empty-icon">💬</div>
				<h3>No messages yet</h3>
				<p>Be the first to send a message in #{channel?.name}!</p>
			</div>
		{/if}

		<!-- Typing indicator -->
		{#if typingUsers.length > 0}
			<div class="typing-indicator">
				<div class="typing-dots">
					<span></span>
					<span></span>
					<span></span>
				</div>
				<span class="typing-text">
					{typingUsers.length === 1 
						? `${typingUsers[0].username} is typing...`
						: `${typingUsers.length} people are typing...`
					}
				</span>
			</div>
		{/if}
	</div>

	<!-- Message Input -->
	{#if channel}
		<div class="message-input-container">
					<MessageInput 
			placeholder="Message #{channel.name}"
			on:send={(event) => handleSendMessage(event.detail)}
		/>
		</div>
	{/if}
</div>

<style>
	.chat-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-bg);
	}

	.channel-header {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-glass-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--color-bg-alt);
	}

	.channel-info {
		flex: 1;
	}

	.channel-name {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 4px 0;
	}

	.channel-description {
		font-size: 14px;
		color: var(--color-text);
		opacity: 0.7;
		margin: 0;
	}

	.channel-actions {
		display: flex;
		gap: 8px;
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
	}

	.action-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 16px 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.loading-messages {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		color: var(--color-text);
		opacity: 0.7;
		font-size: 14px;
	}

	.empty-messages {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
		color: var(--color-text);
		opacity: 0.7;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.empty-messages h3 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 8px 0;
	}

	.empty-messages p {
		font-size: 14px;
		margin: 0;
	}

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		color: var(--color-text);
		opacity: 0.7;
		font-size: 14px;
	}

	.typing-dots {
		display: flex;
		gap: 2px;
	}

	.typing-dots span {
		width: 4px;
		height: 4px;
		background: var(--color-text);
		border-radius: 50%;
		animation: typing 1.4s infinite ease-in-out;
	}

	.typing-dots span:nth-child(1) {
		animation-delay: -0.32s;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes typing {
		0%, 80%, 100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.message-input-container {
		padding: 16px 24px;
		border-top: 1px solid var(--color-glass-border);
		background: var(--color-bg-alt);
	}

	/* Scrollbar styling */
	.messages-container::-webkit-scrollbar {
		width: 6px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: var(--color-glass-border);
		border-radius: 3px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
	}
</style> 