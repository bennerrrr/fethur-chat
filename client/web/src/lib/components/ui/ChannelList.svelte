<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Hash, Mic, Plus, Settings, ChevronDown } from 'lucide-svelte';
	import type { Channel, Server } from '$lib/types';

	export let server: Server | null = null;
	export let currentChannelId: number | null = null;
	export let currentUser: any = null;

	const dispatch = createEventDispatcher<{
		selectChannel: Channel;
		createChannel: { type: 'text' | 'voice' };
		openChannelSettings: Channel | null;
	}>();

	function handleChannelClick(channel: Channel) {
		dispatch('selectChannel', channel);
	}

	function handleCreateChannel(type: 'text' | 'voice') {
		dispatch('createChannel', { type });
	}

	function handleChannelSettings(channel: Channel) {
		dispatch('openChannelSettings', channel);
	}

	$: textChannels = server?.channels?.filter(c => c.type === 'text') || [];
	$: voiceChannels = server?.channels?.filter(c => c.type === 'voice') || [];
</script>

<div class="channel-list">
	<!-- Server Header -->
	{#if server}
		<div class="server-header">
			<div class="server-info">
				<h3 class="server-name">{server.name}</h3>
				{#if server.description}
					<p class="server-description">{server.description}</p>
				{/if}
			</div>
			{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
				<button class="server-settings-btn" on:click={() => dispatch('openChannelSettings', null)}>
					<Settings size={16} />
				</button>
			{/if}
		</div>
	{/if}

	<!-- Text Channels -->
	{#if textChannels.length > 0}
		<div class="channel-category">
			<div class="category-header">
				<ChevronDown size={16} />
				<span>TEXT CHANNELS</span>
				{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
					<button 
						class="add-channel-btn" 
						on:click={() => handleCreateChannel('text')}
						title="Create Text Channel"
					>
						<Plus size={16} />
					</button>
				{/if}
			</div>
			<div class="channel-items">
				{#each textChannels as channel (channel.id)}
					<div 
						class="channel-item" 
						class:active={currentChannelId === channel.id}
						on:click={() => handleChannelClick(channel)}
					>
						<Hash size={16} class="channel-icon" />
						<span class="channel-name">{channel.name}</span>
						{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
							<button 
								class="channel-settings-btn"
								on:click|stopPropagation={() => handleChannelSettings(channel)}
							>
								<Settings size={14} />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Voice Channels -->
	{#if voiceChannels.length > 0}
		<div class="channel-category">
			<div class="category-header">
				<ChevronDown size={16} />
				<span>VOICE CHANNELS</span>
				{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
					<button 
						class="add-channel-btn" 
						on:click={() => handleCreateChannel('voice')}
						title="Create Voice Channel"
					>
						<Plus size={16} />
					</button>
				{/if}
			</div>
			<div class="channel-items">
				{#each voiceChannels as channel (channel.id)}
					<div 
						class="channel-item voice-channel" 
						class:active={currentChannelId === channel.id}
						on:click={() => handleChannelClick(channel)}
					>
						<Mic size={16} class="channel-icon" />
						<span class="channel-name">{channel.name}</span>
						{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
							<button 
								class="channel-settings-btn"
								on:click|stopPropagation={() => handleChannelSettings(channel)}
							>
								<Settings size={14} />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Empty State -->
	{#if (!textChannels.length && !voiceChannels.length) && server}
		<div class="empty-state">
			<p>No channels yet</p>
			{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
				<button class="create-first-channel" on:click={() => handleCreateChannel('text')}>
					<Plus size={16} />
					Create your first channel
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.channel-list {
		width: 240px;
		background: var(--color-bg-alt);
		border-right: 1px solid var(--color-glass-border);
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow-y: auto;
	}

	.server-header {
		padding: 16px;
		border-bottom: 1px solid var(--color-glass-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.server-info {
		flex: 1;
	}

	.server-name {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 4px 0;
	}

	.server-description {
		font-size: 12px;
		color: var(--color-text);
		opacity: 0.7;
		margin: 0;
	}

	.server-settings-btn {
		background: transparent;
		border: none;
		color: var(--color-text);
		opacity: 0.7;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: opacity 0.2s ease;
	}

	.server-settings-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	.channel-category {
		margin-top: 8px;
	}

	.category-header {
		padding: 8px 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text);
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.add-channel-btn {
		background: transparent;
		border: none;
		color: var(--color-text);
		opacity: 0.7;
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		transition: opacity 0.2s ease;
		margin-left: auto;
	}

	.add-channel-btn:hover {
		opacity: 1;
		background: var(--color-glass);
	}

	.channel-items {
		display: flex;
		flex-direction: column;
	}

	.channel-item {
		padding: 8px 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		border-radius: 4px;
		margin: 0 8px;
		transition: all 0.2s ease;
		color: var(--color-text);
		opacity: 0.8;
	}

	.channel-item:hover {
		background: var(--color-glass);
		opacity: 1;
	}

	.channel-item.active {
		background: var(--color-accent);
		color: white;
		opacity: 1;
	}

	.channel-icon {
		flex-shrink: 0;
	}

	.channel-name {
		flex: 1;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.channel-settings-btn {
		background: transparent;
		border: none;
		color: inherit;
		opacity: 0;
		cursor: pointer;
		padding: 2px;
		border-radius: 4px;
		transition: opacity 0.2s ease;
	}

	.channel-item:hover .channel-settings-btn {
		opacity: 0.7;
	}

	.channel-settings-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.voice-channel {
		color: var(--color-accent);
	}

	.voice-channel.active {
		color: white;
	}

	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--color-text);
		opacity: 0.7;
	}

	.empty-state p {
		margin: 0 0 16px 0;
		font-size: 14px;
	}

	.create-first-channel {
		background: var(--color-accent);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 auto;
		transition: background 0.2s ease;
	}

	.create-first-channel:hover {
		background: var(--color-accent-hover);
	}

	/* Scrollbar styling */
	.channel-list::-webkit-scrollbar {
		width: 4px;
	}

	.channel-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.channel-list::-webkit-scrollbar-thumb {
		background: var(--color-glass-border);
		border-radius: 2px;
	}

	.channel-list::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
	}
</style> 