<script lang="ts">
	export let isConnected = false;
	export let isMuted = false;
	export let isDeafened = false;

	function toggleMute() {
		isMuted = !isMuted;
	}

	function toggleDeafen() {
		isDeafened = !isDeafened;
	}

	function connectVoice() {
		isConnected = true;
	}

	function disconnectVoice() {
		isConnected = false;
	}
</script>

<div class="voice-controls">
	{#if isConnected}
		<button 
			class="voice-btn {isMuted ? 'muted' : ''}" 
			on:click={toggleMute}
			title={isMuted ? 'Unmute' : 'Mute'}
		>
			{#if isMuted}
				🔇
			{:else}
				🎤
			{/if}
		</button>
		
		<button 
			class="voice-btn {isDeafened ? 'deafened' : ''}" 
			on:click={toggleDeafen}
			title={isDeafened ? 'Undeafen' : 'Deafen'}
		>
			{#if isDeafened}
				🔇
			{:else}
				🔊
			{/if}
		</button>
		
		<button 
			class="voice-btn disconnect" 
			on:click={disconnectVoice}
			title="Disconnect"
		>
			📞
		</button>
	{:else}
		<button 
			class="voice-btn connect" 
			on:click={connectVoice}
			title="Connect to Voice"
		>
			📞
		</button>
	{/if}
</div>

<style>
	.voice-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.5rem;
		background: var(--color-glass);
		border-radius: var(--border-radius);
		border: 1px solid var(--color-glass-border);
	}

	.voice-btn {
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		height: 2.5rem;
	}

	.voice-btn:hover {
		background: var(--color-accent-hover);
		transform: translateY(-1px);
	}

	.voice-btn.muted {
		background: var(--color-error);
	}

	.voice-btn.deafened {
		background: var(--color-warning);
	}

	.voice-btn.connect {
		background: var(--color-success);
	}

	.voice-btn.disconnect {
		background: var(--color-error);
	}
</style> 