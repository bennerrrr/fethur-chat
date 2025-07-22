<script lang="ts">
	import { page } from '$app/stores';
	
	// Determine if we're on a chat page that needs full-screen layout
	$: isChatPage = $page.url.pathname.startsWith('/chat');
</script>

<style>
	:root {
		--color-bg: #0f0f23;
		--color-bg-alt: #1a1a2e;
		--color-text: #f8fafc;
		--color-accent: #6366f1;
		--color-accent-hover: #4f46e5;
		--color-accent-light: #818cf8;
		--color-card: rgba(30, 41, 59, 0.6);
		--color-border: rgba(99, 102, 241, 0.2);
		--color-glass: rgba(255, 255, 255, 0.08);
		--color-glass-border: rgba(255, 255, 255, 0.12);
		--color-success: #10b981;
		--color-error: #ef4444;
		--color-warning: #f59e0b;
		--border-radius: 16px;
		--border-radius-lg: 24px;
		--border-radius-xl: 32px;
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	body {
		background: var(--color-bg);
		color: var(--color-text);
		font-family: 'Inter', system-ui, sans-serif;
		min-height: 100vh;
		margin: 0;
		overflow-x: hidden;
	}

	/* Traditional layout for auth pages */
	.main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
		position: relative;
	}

	/* Enhanced animated background blobs */
	.background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		overflow: visible;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(50px);
		opacity: 0.6;
		animation: float 25s ease-in-out infinite;
		pointer-events: none;
	}

	.blob1 {
		width: 400px;
		height: 400px;
		background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
		top: 10%;
		left: 10%;
		animation-delay: 0s;
		border-radius: 43% 57% 70% 30% / 45% 45% 55% 55%;
	}

	.blob2 {
		width: 320px;
		height: 320px;
		background: linear-gradient(135deg, #06b6d4, #6366f1, #ec4899);
		top: 60%;
		right: 15%;
		animation-delay: -8s;
		border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%;
	}

	.blob3 {
		width: 260px;
		height: 260px;
		background: linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b);
		bottom: 20%;
		left: 20%;
		animation-delay: -16s;
		border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%;
	}

	.blob4 {
		width: 200px;
		height: 200px;
		background: linear-gradient(135deg, #f59e0b, #10b981, #6366f1);
		top: 35%;
		right: 35%;
		animation-delay: -12s;
		border-radius: 67% 33% 47% 53% / 37% 20% 80% 63%;
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0px) rotate(0deg) scale(1);
		}
		25% {
			transform: translateY(-40px) rotate(90deg) scale(1.1);
		}
		50% {
			transform: translateY(30px) rotate(180deg) scale(0.9);
		}
		75% {
			transform: translateY(-20px) rotate(270deg) scale(1.05);
		}
	}

	header {
		background: rgba(26, 26, 46, 0.7);
		backdrop-filter: blur(24px);
		color: var(--color-accent);
		padding: 1.75rem 2.5rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-glass-border);
		border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
		position: relative;
		overflow: hidden;
	}

	header::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
		opacity: 0.4;
	}

	footer {
		background: rgba(26, 26, 46, 0.7);
		backdrop-filter: blur(24px);
		color: var(--color-accent);
		padding: 1.25rem 2.5rem;
		text-align: center;
		font-size: 1rem;
		margin-top: auto;
		border-top: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
		box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.05);
		position: relative;
		overflow: hidden;
	}

	footer::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
		opacity: 0.4;
	}

	.glass-card {
		background: var(--color-glass);
		backdrop-filter: blur(32px);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius-xl);
		padding: 3rem;
		box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255, 255, 255, 0.05);
		margin: 2rem auto;
		max-width: 600px;
		width: 90%;
		position: relative;
		overflow: hidden;
	}

	.glass-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
		opacity: 0.3;
	}

	a {
		color: var(--color-accent);
		text-decoration: none;
	}
	a:hover {
		color: var(--color-accent-hover);
	}

	/* Full-screen layout for chat pages */
	.chat-layout {
		height: 100vh;
		width: 100vw;
		overflow: hidden;
		background: var(--color-bg);
	}
</style>

{#if isChatPage}
	<!-- Full-screen chat layout -->
	<div class="chat-layout">
		<slot />
	</div>
{:else}
	<!-- Traditional layout for auth pages -->
	<div class="main">
		<!-- Enhanced animated background -->
		<div class="background">
			<div class="blob blob1"></div>
			<div class="blob blob2"></div>
			<div class="blob blob3"></div>
			<div class="blob blob4"></div>
		</div>

		<header>
			Feathur
			<span style="font-size:1rem;font-weight:400;color:var(--color-text);">Self-Hosted</span>
		</header>
		
		<slot />
		
		<footer>
			&copy; {new Date().getFullYear()} Feathur &mdash; Modern, self-hosted chat
		</footer>
	</div>
{/if} 