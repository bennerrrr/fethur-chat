<script lang="ts">
	import type { User } from '$lib/types';

	export let user: User;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let showStatus = true;

	$: sizeClass = `avatar-${size}`;
	$: initials = user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
</script>

<div class="avatar {sizeClass}">
	{#if user.avatar}
		<img src={user.avatar} alt={user.username} />
	{:else}
		<div class="avatar-initials">{initials}</div>
	{/if}
	
	{#if showStatus}
		<div class="status-indicator" class:online={user.isOnline}></div>
	{/if}
</div>

<style>
	.avatar {
		position: relative;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-glass);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-initials {
		color: var(--color-text);
		font-weight: 600;
		text-align: center;
	}

	.avatar-sm {
		width: 24px;
		height: 24px;
		font-size: 10px;
	}

	.avatar-md {
		width: 32px;
		height: 32px;
		font-size: 12px;
	}

	.avatar-lg {
		width: 40px;
		height: 40px;
		font-size: 14px;
	}

	.status-indicator {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #6b7280;
		border: 2px solid var(--color-bg);
	}

	.status-indicator.online {
		background: #10b981;
	}

	.avatar-sm .status-indicator {
		width: 6px;
		height: 6px;
		border-width: 1px;
	}

	.avatar-lg .status-indicator {
		width: 10px;
		height: 10px;
		border-width: 2px;
	}
</style> 