<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated, currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui';
	import { MessageSquare, Users, Shield, Zap } from 'lucide-svelte';

	// Redirect authenticated users to chat
	$: if ($isAuthenticated) {
		goto('/chat');
	}
</script>

<svelte:head>
	<title>Fethur - Lightweight Discord Alternative</title>
	<meta name="description" content="A lightweight, self-hostable Discord alternative built for performance and efficiency." />
</svelte:head>

{#if !$isAuthenticated}
	<div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-secondary-900 dark:to-secondary-800">
		<!-- Header -->
		<header class="relative z-10">
			<nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center py-6">
					<div class="flex items-center space-x-2">
						<MessageSquare class="h-8 w-8 text-primary-600" />
						<span class="text-2xl font-bold text-secondary-900 dark:text-white">Fethur</span>
					</div>
					<div class="space-x-4">
						<Button variant="ghost" href="/auth/login">Login</Button>
						<Button variant="primary" href="/auth/register">Get Started</Button>
					</div>
				</div>
			</nav>
		</header>

		<!-- Hero Section -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
			<div class="text-center">
				<h1 class="text-4xl tracking-tight font-extrabold text-secondary-900 dark:text-white sm:text-5xl md:text-6xl">
					<span class="block">Lightweight Chat</span>
					<span class="block text-primary-600">Built for Speed</span>
				</h1>
				<p class="mt-3 max-w-md mx-auto text-base text-secondary-500 dark:text-secondary-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
					A self-hostable Discord alternative that uses minimal resources while providing all the features you need for team communication.
				</p>
				<div class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
					<div class="rounded-md shadow">
						<Button variant="primary" size="lg" href="/auth/register">
							Start Chatting
						</Button>
					</div>
					<div class="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
						<Button variant="secondary" size="lg" href="/auth/login">
							Login
						</Button>
					</div>
				</div>
			</div>
		</div>

		<!-- Features Section -->
		<div class="py-12 bg-white dark:bg-secondary-800">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="lg:text-center">
					<h2 class="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
					<p class="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-secondary-900 dark:text-white sm:text-4xl">
						Everything you need
					</p>
					<p class="mt-4 max-w-2xl text-xl text-secondary-500 dark:text-secondary-300 lg:mx-auto">
						Fethur provides all essential chat features while maintaining excellent performance and resource efficiency.
					</p>
				</div>

				<div class="mt-10">
					<div class="space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<Zap class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Lightning Fast</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								&lt; 2 second load time, &lt; 500KB bundle size. Built for performance from the ground up.
							</p>
						</div>

						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<MessageSquare class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Real-time Messaging</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								WebSocket-powered instant messaging with typing indicators and presence updates.
							</p>
						</div>

						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<Users class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Server Management</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								Create and manage servers with multiple channels for organized team communication.
							</p>
						</div>

						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<Shield class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Self-Hosted</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								Your data, your control. Host on your own infrastructure with complete privacy.
							</p>
						</div>

						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<MessageSquare class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Lightweight</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								Uses &lt; 50MB RAM and starts in &lt; 2 seconds. Efficient by design.
							</p>
						</div>

						<div class="relative">
							<div class="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
								<Users class="h-6 w-6" />
							</div>
							<p class="ml-16 text-lg leading-6 font-medium text-secondary-900 dark:text-white">Open Source</p>
							<p class="mt-2 ml-16 text-base text-secondary-500 dark:text-secondary-300">
								Transparent, auditable, and customizable. Built by the community, for the community.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA Section -->
		<div class="bg-primary-600">
			<div class="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
				<h2 class="text-3xl font-extrabold text-white sm:text-4xl">
					<span class="block">Ready to get started?</span>
				</h2>
				<p class="mt-4 text-lg leading-6 text-primary-200">
					Join thousands of teams already using Fethur for fast, reliable communication.
				</p>
				<Button variant="secondary" size="lg" href="/auth/register" class="mt-8">
					Create Account
				</Button>
			</div>
		</div>
	</div>
{:else}
	<!-- Loading state while redirecting -->
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="spinner w-8 h-8 mx-auto mb-4"></div>
			<p class="text-secondary-600 dark:text-secondary-400">Redirecting to chat...</p>
		</div>
	</div>
{/if}
