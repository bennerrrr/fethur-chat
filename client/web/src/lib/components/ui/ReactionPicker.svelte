<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const emojiCategories = {
		'Smileys': ['😀', '😃', '😄', '��', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '��', '🤩', '🥳'],
		'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '��', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
		'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
		'Objects': ['🔥', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭']
	};

	let selectedCategory = 'Smileys';

	function selectEmoji(emoji: string) {
		dispatch('reaction', emoji);
	}
</script>

<div class="reaction-picker">
	<div class="category-tabs">
		{#each Object.keys(emojiCategories) as category}
			<button
				class="category-tab"
				class:active={selectedCategory === category}
				on:click={() => selectedCategory = category}
			>
				{category}
			</button>
		{/each}
	</div>

	<div class="emoji-grid">
		{#each emojiCategories[selectedCategory as keyof typeof emojiCategories] as emoji}
			<button
				class="emoji-btn"
				on:click={() => selectEmoji(emoji)}
				title={emoji}
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>

<style>
	.reaction-picker {
		position: absolute;
		top: 100%;
		right: 0;
		width: 300px;
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1000;
		padding: 0.5rem;
	}

	.category-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #404040);
		margin-bottom: 0.5rem;
	}

	.category-tab {
		flex: 1;
		padding: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-muted, #6b7280);
		cursor: pointer;
		font-size: 0.75rem;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.category-tab:hover {
		color: var(--text-primary, #ffffff);
	}

	.category-tab.active {
		color: var(--accent-color, #3b82f6);
		border-bottom-color: var(--accent-color, #3b82f6);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.25rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.emoji-btn {
		padding: 0.5rem;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 1.25rem;
		transition: background-color 0.2s;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.emoji-btn:hover {
		background-color: var(--accent-color, #3b82f6);
	}
</style>
