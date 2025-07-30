<script lang="ts">
	// Simple voice test route
</script>

<svelte:head>
	<title>Voice Test - Fethur</title>
</svelte:head>

<div class="voice-test-page">
	<h1>🎤 Voice Test</h1>
	<p>Voice test page is working!</p>
	<p>This is a simplified voice test route.</p>
	<a href="/chat" class="back-link">← Back to Chat</a>
</div>

<style>
	.voice-test-page {
		padding: 2rem;
		text-align: center;
		background: #1a1a1a;
		color: #ffffff;
		min-height: 100vh;
	}
	.back-link {
		color: #3b82f6;
		text-decoration: none;
	}
	.back-link:hover {
		text-decoration: underline;
	}
</style> 