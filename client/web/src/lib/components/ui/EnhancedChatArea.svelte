<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { chatStore, chatActions, messages } from '$lib/stores/app';
	import { voiceStore } from '$lib/stores/voice';
	import type { Channel, User, Message } from '$lib/types';
	import EnhancedMessage from './EnhancedMessage.svelte';
	import EnhancedMessageInput from './EnhancedMessageInput.svelte';
	import EnhancedVoiceControls from './EnhancedVoiceControls.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';

	export let channel: Channel | null = null;
	export let currentUser: User | null = null;

	let messagesContainer: HTMLElement;
	let isAtBottom = true;
	let showScrollToBottom = false;
	let isLoadingOlder = false;

	$: channelMessages = $messages.filter(message => {
		const isValid = message && message.createdAt;
		const isForCurrentChannel = message?.channelId === channel?.id;
		
		return isValid && isForCurrentChannel;
	});
	$: isVoiceChannel = channel?.type === 'voice';
	$: hasVoiceConnection = $voiceStore.currentConnection?.channelId === channel?.id;

	// Auto-scroll to bottom when new messages arrive
	afterUpdate(() => {
		if (isAtBottom && messagesContainer) {
			scrollToBottom();
		}
	});

	// Load messages when channel changes
	$: if (channel) {
		loadChannelMessages(channel.id);
	}

	async function loadChannelMessages(channelId: number) {
		try {
			chatActions.clearChat();
			await chatActions.loadMessages(channelId);
			scrollToBottom();
		} catch (error) {
			console.error('Failed to load messages:', error);
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
			isAtBottom = true;
			showScrollToBottom = false;
		}
	}

	function handleScroll() {
		if (!messagesContainer) return;

		const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
		const threshold = 100;

		// Check if user is at the bottom
		isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
		showScrollToBottom = !isAtBottom && channelMessages.length > 0;

		// Load older messages when scrolled to top
		if (scrollTop < threshold && !isLoadingOlder && $chatStore.hasMoreMessages) {
			loadOlderMessages();
		}
	}

	async function loadOlderMessages() {
		if (!channel || isLoadingOlder || !$chatStore.hasMoreMessages) return;

		try {
			isLoadingOlder = true;
			const oldestMessage = channelMessages[0];
			if (oldestMessage) {
				await chatActions.loadMessages(channel.id, 50, oldestMessage.id);
			}
		} catch (error) {
			console.error('Failed to load older messages:', error);
		} finally {
			isLoadingOlder = false;
		}
	}

	function handleReply(event: CustomEvent) {
		const { message } = event.detail;
		// TODO: Implement reply functionality when available
		console.log('Reply requested for message:', message.id);
	}

	function formatTypingUsers(users: any[]) {
		if (users.length === 0) return '';
		if (users.length === 1) return `${users[0].username} is typing...`;
		if (users.length === 2) return `${users[0].username} and ${users[1].username} are typing...`;
		return `${users[0].username} and ${users.length - 1} others are typing...`;
	}

	onMount(() => {
		// Set up scroll event listener
		if (messagesContainer) {
			messagesContainer.addEventListener('scroll', handleScroll);
			return () => {
				messagesContainer.removeEventListener('scroll', handleScroll);
			};
		}
	});
</script>

<div class="chat-area" class:voice-channel={isVoiceChannel}>
	{#if channel}
		<!-- Channel Header -->
		<div class="channel-header">
			<div class="channel-info">
				<span class="channel-icon">
					{#if isVoiceChannel}
						🎤
					{:else}
						💬
					{/if}
				</span>
				<h2 class="channel-name">{channel.name}</h2>
				{#if channel.description}
					<span class="channel-description">{channel.description}</span>
				{/if}
			</div>

			<div class="channel-actions">
				{#if isVoiceChannel}
					<div class="voice-status">
						{#if hasVoiceConnection}
							<span class="voice-indicator connected">🔴 Live</span>
						{:else}
							<span class="voice-indicator">🎤 Voice Channel</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Voice Controls (for voice channels) -->
		{#if isVoiceChannel}
			<EnhancedVoiceControls {channel} {currentUser} />
		{/if}

		<!-- Messages Area -->
		<div class="messages-area">
			<div 
				class="messages-container" 
				bind:this={messagesContainer}
				on:scroll={handleScroll}
			>
				<!-- Loading indicator for older messages -->
				{#if isLoadingOlder}
					<div class="loading-older">
						<LoadingSpinner size="sm" />
						<span>Loading older messages...</span>
					</div>
				{/if}

				<!-- No messages state -->
				{#if channelMessages.length === 0 && !$chatStore.isLoadingMessages}
					<div class="empty-state">
						<div class="empty-icon">
							{#if isVoiceChannel}
								🎤
							{:else}
								💬
							{/if}
						</div>
						<h3>Welcome to #{channel.name}!</h3>
						<p>
							{#if isVoiceChannel}
								This is a voice channel. Join the voice chat to start talking with others.
							{:else}
								This is the beginning of your conversation in #{channel.name}.
							{/if}
						</p>
					</div>
				{/if}

				<!-- Messages -->
				{#each channelMessages as message, index (message?.id || index)}
					{@const prevMessage = channelMessages[index - 1]}
					{@const isGrouped = message && prevMessage && prevMessage.authorId === message.authorId && 
						new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000}
					
					{#if message}
						<div class="message-wrapper" class:grouped={isGrouped}>
							<EnhancedMessage 
								{message} 
								{currentUser}
								isReply={!!message.replyToId}
								showActions={true}
								on:reply={handleReply}
							/>
						</div>
					{/if}
				{/each}

				<!-- Typing indicators -->
				{#if $chatStore.typingUsers.length > 0}
					<div class="typing-indicator">
						<div class="typing-dots">
							<span></span>
							<span></span>
							<span></span>
						</div>
						<span class="typing-text">
							{formatTypingUsers($chatStore.typingUsers)}
						</span>
					</div>
				{/if}

				<!-- Loading indicator -->
				{#if $chatStore.isLoadingMessages}
					<div class="loading-messages">
						<LoadingSpinner />
						<span>Loading messages...</span>
					</div>
				{/if}
			</div>

			<!-- Scroll to bottom button -->
			{#if showScrollToBottom}
				<button class="scroll-to-bottom" on:click={scrollToBottom}>
					<span class="scroll-icon">↓</span>
					<span class="scroll-text">New messages</span>
				</button>
			{/if}
		</div>

		<!-- Message Input (for text channels) -->
		{#if !isVoiceChannel}
			<EnhancedMessageInput 
				channelId={channel.id}
				placeholder="Message #{channel.name}"
				disabled={!currentUser}
			/>
		{/if}

	{:else}
		<!-- No channel selected state -->
		<div class="no-channel-state">
			<div class="no-channel-icon">💬</div>
			<h3>No channel selected</h3>
			<p>Select a channel from the sidebar to start chatting.</p>
		</div>
	{/if}
</div>

<style>
	.chat-area {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--chat-bg, #1a1a1a);
		position: relative;
	}

	.voice-channel {
		background-color: rgba(59, 130, 246, 0.02);
	}

	.channel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color, #404040);
		background-color: var(--surface-color, #2d2d2d);
		flex-shrink: 0;
	}

	.channel-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.channel-icon {
		font-size: 1.5rem;
	}

	.channel-name {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.channel-description {
		color: var(--text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.channel-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.voice-status {
		display: flex;
		align-items: center;
	}

	.voice-indicator {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		color: var(--text-muted, #6b7280);
	}

	.voice-indicator.connected {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.messages-area {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	.loading-older {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		color: var(--text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		padding: 2rem;
		color: var(--text-muted, #6b7280);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text-primary, #ffffff);
		font-size: 1.5rem;
	}

	.empty-state p {
		margin: 0;
		max-width: 400px;
		line-height: 1.5;
	}

	.message-wrapper {
		border-left: 3px solid transparent;
		transition: border-color 0.2s;
	}

	.message-wrapper:hover {
		border-left-color: var(--accent-color, #3b82f6);
	}

	.message-wrapper.grouped {
		margin-top: 0.25rem;
	}

	.typing-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		margin: 0.5rem 1rem;
		background-color: var(--surface-color, #2d2d2d);
		border-radius: 0.5rem;
		color: var(--text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.typing-dots {
		display: flex;
		gap: 0.25rem;
	}

	.typing-dots span {
		width: 0.5rem;
		height: 0.5rem;
		background-color: var(--accent-color, #3b82f6);
		border-radius: 50%;
		animation: typing 1.5s infinite;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.typing-dots span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes typing {
		0%, 60%, 100% {
			transform: scale(1);
			opacity: 0.5;
		}
		30% {
			transform: scale(1.2);
			opacity: 1;
		}
	}

	.loading-messages {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 1rem;
		color: var(--text-muted, #6b7280);
	}

	.scroll-to-bottom {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--accent-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 2rem;
		cursor: pointer;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: all 0.2s;
		z-index: 10;
	}

	.scroll-to-bottom:hover {
		background-color: var(--accent-hover, #2563eb);
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.scroll-icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	.scroll-text {
		font-size: 0.875rem;
	}

	.no-channel-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: var(--text-muted, #6b7280);
	}

	.no-channel-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.no-channel-state h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text-primary, #ffffff);
		font-size: 1.5rem;
	}

	.no-channel-state p {
		margin: 0;
		max-width: 400px;
		line-height: 1.5;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.channel-header {
			padding: 0.75rem 1rem;
		}

		.channel-info {
			gap: 0.5rem;
		}

		.channel-name {
			font-size: 1.125rem;
		}

		.channel-description {
			display: none;
		}

		.scroll-to-bottom {
			bottom: 0.5rem;
			right: 0.5rem;
			padding: 0.5rem 0.75rem;
		}

		.scroll-text {
			display: none;
		}
	}

	/* Custom scrollbar */
	.messages-container::-webkit-scrollbar {
		width: 8px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: var(--surface-color, #2d2d2d);
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: var(--border-color, #404040);
		border-radius: 4px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: var(--accent-color, #3b82f6);
	}
</style>
