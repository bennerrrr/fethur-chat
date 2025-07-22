<script lang="ts">
	export let serverName = '';
	export let memberCount = 0;
	export let isOnline = true;
	export let showSettings = false;

	function toggleSettings() {
		showSettings = !showSettings;
	}
</script>

<div class="server-header">
	<div class="server-info">
		<div class="server-name">
			<span class="server-icon">🏠</span>
			{serverName || 'Server'}
		</div>
		<div class="server-status">
			<span class="status-indicator {isOnline ? 'online' : 'offline'}"></span>
			<span class="member-count">{memberCount} members</span>
		</div>
	</div>
	
	<div class="server-actions">
		<button 
			class="action-btn" 
			on:click={toggleSettings}
			title="Server Settings"
		>
			⚙️
		</button>
	</div>
</div>

<style>
	.server-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--color-glass);
		border-bottom: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius) var(--border-radius) 0 0;
	}

	.server-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.server-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.server-icon {
		font-size: 1.2rem;
	}

	.server-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-error);
	}

	.status-indicator.online {
		background: var(--color-success);
	}

	.server-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1rem;
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 2rem;
	}

	.action-btn:hover {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}
</style> 