<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { apiClient } from '$lib/api/client';

	let isFirstTime = false;
	let currentStep = 1;
	let totalSteps = 5;
	let loading = true;
	let authChecking = true;

	// Configuration data
	let config = {
		network: {
			hostname: 'localhost',
			port: '8081',
			ssl: false,
			externalDomain: '',
			mdns: true
		},
		auth: {
			mode: 'public', // 'public', 'open_registration', 'admin_only'
			registrationPassword: ''
		},
		admin: {
			username: '',
			password: '',
			confirmPassword: ''
		},
		user: {
			username: '',
			password: '',
			confirmPassword: ''
		}
	};

	// Login data
	let loginData = {
		username: '',
		password: ''
	};

	let error = '';
	let success = '';

	onMount(async () => {
		if (!browser) return;
		
		try {
			// First, check if user is already authenticated
			const token = localStorage.getItem('token');
			if (token) {
				apiClient.setToken(token);
				try {
					const user = await apiClient.getCurrentUser();
					console.log('User already authenticated:', user);
					// Redirect to appropriate page based on user role
					if (user.role === 'admin' || user.role === 'super_admin') {
						goto('/admin');
					} else {
						goto('/chat');
					}
					return;
				} catch (err) {
					console.log('Token invalid, clearing and continuing...');
					localStorage.removeItem('token');
				}
			}

			// Check if this is first time setup
			const response = await fetch('/api/setup/status');
			const data = await response.json();
			isFirstTime = data.isFirstTime;
		} catch (err) {
			console.error('Error checking setup status:', err);
			isFirstTime = true; // Default to setup mode if error
		} finally {
			loading = false;
			authChecking = false;
		}
	});

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	async function handleSetup() {
		try {
			const response = await fetch('/api/setup/configure', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(config)
			});

			if (response.ok) {
				success = 'Configuration completed successfully!';
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			} else {
				const data = await response.json();
				error = data.error || 'Configuration failed';
			}
		} catch (err) {
			error = 'Failed to save configuration';
		}
	}

	async function handleLogin() {
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(loginData)
			});

			if (response.ok) {
				const data = await response.json();
				localStorage.setItem('token', data.token);
				apiClient.setToken(data.token);
				
				// Get user info to determine redirect
				try {
					const user = await apiClient.getCurrentUser();
					if (user.role === 'admin' || user.role === 'super_admin') {
						goto('/admin');
					} else {
						goto('/chat');
					}
				} catch (err) {
					goto('/chat'); // Fallback
				}
			} else {
				const data = await response.json();
				error = data.error || 'Login failed';
			}
		} catch (err) {
			error = 'Login failed';
		}
	}

	async function handleGuestLogin() {
		try {
			const response = await fetch('/api/auth/guest', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			if (response.ok) {
				const data = await response.json();
				localStorage.setItem('token', data.token);
				apiClient.setToken(data.token);
				goto('/chat');
			} else {
				const data = await response.json();
				error = data.error || 'Guest login failed';
			}
		} catch (err) {
			error = 'Guest login failed';
		}
	}

	function validateStep() {
		switch (currentStep) {
			case 1: // Network
				return config.network.hostname && config.network.port;
			case 2: // Auth
				return config.auth.mode && 
					(config.auth.mode !== 'open_registration' || config.auth.registrationPassword);
			case 3: // Admin
				return config.admin.username && config.admin.password && 
					config.admin.password === config.admin.confirmPassword &&
					config.admin.password.length >= 9;
			case 4: // User (optional)
				return true; // Optional step
			default:
				return true;
		}
	}
</script>

{#if loading || authChecking}
	<div class="glass-card">
		<div style="text-align: center; padding: 2rem;">
			<div style="font-size: 1.2rem; margin-bottom: 1rem;">
				{#if authChecking}
					Checking authentication...
				{:else}
					Loading...
				{/if}
			</div>
			<div style="width: 40px; height: 40px; border: 3px solid var(--color-glass-border); border-top: 3px solid var(--color-accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
		</div>
	</div>
{:else if isFirstTime}
	<!-- Configuration Wizard -->
	<div class="glass-card">
		<div style="text-align: center; margin-bottom: 2rem;">
			<h2 style="color: var(--color-accent); margin-bottom: 0.5rem;">Welcome to Feathur</h2>
			<p style="color: var(--color-text); opacity: 0.8;">Let's configure your self-hosted chat server</p>
			
			<!-- Progress bar -->
			<div style="background: var(--color-glass-border); height: 4px; border-radius: 2px; margin: 1rem 0;">
				<div style="background: var(--color-accent); height: 100%; border-radius: 2px; width: {(currentStep / totalSteps) * 100}%; transition: width 0.3s;"></div>
			</div>
			<div style="font-size: 0.9rem; color: var(--color-text); opacity: 0.7;">Step {currentStep} of {totalSteps}</div>
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		{#if success}
			<div class="success-message">{success}</div>
		{/if}

		<!-- Step 1: Network Configuration -->
		{#if currentStep === 1}
			<div class="step-content">
				<h3 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Network Settings</h3>
				<div class="form-grid">
					<div class="form-group">
						<label for="hostname">Hostname</label>
						<input id="hostname" type="text" bind:value={config.network.hostname} placeholder="localhost" />
					</div>
					<div class="form-group">
						<label for="port">Port</label>
						<input id="port" type="number" bind:value={config.network.port} placeholder="8081" />
					</div>
					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={config.network.ssl} />
							<span>Enable SSL/HTTPS</span>
						</label>
					</div>
					<div class="form-group">
						<label for="externalDomain">External Domain (optional)</label>
						<input id="externalDomain" type="text" bind:value={config.network.externalDomain} placeholder="yourdomain.com" />
					</div>
					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={config.network.mdns} />
							<span>Enable mDNS (feathur.local)</span>
						</label>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 2: Authentication Mode -->
		{#if currentStep === 2}
			<div class="step-content">
				<h3 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Authentication Mode</h3>
				<div class="form-grid">
					<div class="form-group radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={config.auth.mode} value="public" />
							<span>Public - Anyone can register without password</span>
						</label>
					</div>
					<div class="form-group radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={config.auth.mode} value="open_registration" />
							<span>Open Registration - Anyone with password can register</span>
						</label>
					</div>
					<div class="form-group radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={config.auth.mode} value="admin_only" />
							<span>Admin Only - Only pre-created accounts can join</span>
						</label>
					</div>
					
					{#if config.auth.mode === 'open_registration'}
						<div class="form-group">
							<label for="regPassword">Registration Password</label>
							<input id="regPassword" type="password" bind:value={config.auth.registrationPassword} placeholder="Enter registration password" />
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Step 3: Admin Account -->
		{#if currentStep === 3}
			<div class="step-content">
				<h3 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Super Admin Account</h3>
				<div class="form-grid">
					<div class="form-group">
						<label for="adminUsername">Username</label>
						<input id="adminUsername" type="text" bind:value={config.admin.username} placeholder="admin" />
					</div>
					<div class="form-group">
						<label for="adminPassword">Password</label>
						<input id="adminPassword" type="password" bind:value={config.admin.password} placeholder="Min 9 chars, number, special char" />
					</div>
					<div class="form-group">
						<label for="adminConfirmPassword">Confirm Password</label>
						<input id="adminConfirmPassword" type="password" bind:value={config.admin.confirmPassword} placeholder="Confirm password" />
					</div>
					<div class="form-group info-text">
						Password must be at least 9 characters with a number and special character
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 4: Normal User (Optional) -->
		{#if currentStep === 4}
			<div class="step-content">
				<h3 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Create Normal User (Optional)</h3>
				<div class="form-grid">
					<div class="form-group">
						<label for="userUsername">Username</label>
						<input id="userUsername" type="text" bind:value={config.user.username} placeholder="user" />
					</div>
					<div class="form-group">
						<label for="userPassword">Password</label>
						<input id="userPassword" type="password" bind:value={config.user.password} placeholder="Min 9 chars, number, special char" />
					</div>
					<div class="form-group">
						<label for="userConfirmPassword">Confirm Password</label>
						<input id="userConfirmPassword" type="password" bind:value={config.user.confirmPassword} placeholder="Confirm password" />
					</div>
					<div class="form-group info-text">
						You can skip this step and create users later
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 5: Finish -->
		{#if currentStep === 5}
			<div>
				<h3 style="color: var(--color-accent); margin-bottom: 1rem;">Configuration Summary</h3>
				<div style="text-align: left; margin-bottom: 2rem;">
					<div style="margin-bottom: 1rem;">
						<strong>Network:</strong> {config.network.hostname}:{config.network.port}
						{#if config.network.ssl} (SSL enabled){/if}
					</div>
					<div style="margin-bottom: 1rem;">
						<strong>Authentication:</strong> {config.auth.mode}
						{#if config.auth.mode === 'open_registration'} (Password: {config.auth.registrationPassword}){/if}
					</div>
					<div style="margin-bottom: 1rem;">
						<strong>Admin:</strong> {config.admin.username}
					</div>
					{#if config.user.username}
						<div>
							<strong>User:</strong> {config.user.username}
						</div>
					{/if}
				</div>
				<button on:click={handleSetup} class="primary-button">Complete Setup</button>
			</div>
		{/if}

		<!-- Navigation -->
		{#if currentStep < 5}
			<div style="display: flex; justify-content: space-between; margin-top: 2rem;">
				<button on:click={prevStep} disabled={currentStep === 1} class="secondary-button">Previous</button>
				<button on:click={nextStep} disabled={!validateStep()} class="primary-button">Next</button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Login/Registration -->
	<div class="glass-card">
		<h2 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Welcome Back</h2>
		
		{#if error}
			<div class="error">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleLogin}>
			<div style="display: flex; flex-direction: column; gap: 1rem;">
				<div>
					<label for="username">Username</label>
					<input id="username" type="text" bind:value={loginData.username} placeholder="Enter username" required />
				</div>
				<div>
					<label for="password">Password</label>
					<input id="password" type="password" bind:value={loginData.password} placeholder="Enter password" required />
				</div>
				<button type="submit" class="primary-button">Login</button>
			</div>
		</form>

		<div style="margin-top: 1.5rem; text-align: center;">
			<a href="/register" style="color: var(--color-accent);">Need an account? Register here</a>
		</div>
		
		<div style="margin-top: 1rem; text-align: center;">
			<button type="button" class="secondary-button" on:click={handleGuestLogin}>
				👤 Continue as Guest
			</button>
		</div>
	</div>
{/if}

<style>
	form {
			display: flex;
	flex-direction: column;
	gap: 1rem;
}

.step-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 1.5rem;
	width: 100%;
	max-width: 800px;
	margin: 0 auto;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.checkbox-group, .radio-group {
	flex-direction: row;
	align-items: center;
	gap: 0.75rem;
}

.checkbox-label, .radio-label {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	cursor: pointer;
	font-size: 0.95rem;
	line-height: 1.4;
}

.checkbox-label input[type="checkbox"], .radio-label input[type="radio"] {
	width: auto;
	margin: 0;
	flex-shrink: 0;
}

.info-text {
	font-size: 0.9rem;
	color: var(--color-text);
	opacity: 0.7;
	text-align: center;
	grid-column: 1 / -1;
	margin-top: 0.5rem;
	}
	
	label {
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 0.25rem;
		display: block;
	}
	
	input[type="text"], input[type="email"], input[type="password"], input[type="number"] {
		background: var(--color-glass);
		color: var(--color-text);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		padding: 0.875rem 1rem;
		font-size: 0.95rem;
		outline: none;
		transition: all 0.3s ease;
		width: 100%;
		box-sizing: border-box;
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow-sm);
		max-width: 100%;
	}
	
	input:focus {
		border: 2px solid var(--color-accent);
		box-shadow: var(--shadow-md), 0 0 0 3px rgba(99, 102, 241, 0.1);
		transform: translateY(-1px);
	}
	
	input[type="checkbox"], input[type="radio"] {
		margin-right: 0.5rem;
	}
	
	.primary-button {
		background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
		color: #fff;
		border: none;
		border-radius: var(--border-radius);
		padding: 1rem 1.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: var(--shadow-md);
		position: relative;
		overflow: hidden;
	}
	
	.primary-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}
	
	.primary-button:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--color-accent-hover), var(--color-accent));
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}
	
	.primary-button:hover::before {
		left: 100%;
	}
	
	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.secondary-button {
		background: transparent;
		color: var(--color-accent);
		border: 2px solid var(--color-accent);
		border-radius: var(--border-radius);
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}
	
	.secondary-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 100%;
		background: var(--color-accent);
		transition: width 0.3s ease;
		z-index: -1;
	}
	
	.secondary-button:hover:not(:disabled) {
		color: #fff;
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
	
	.secondary-button:hover::before {
		width: 100%;
	}
	
	.secondary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.error-message {
		color: var(--color-error);
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--border-radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		text-align: center;
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow-sm);
		position: relative;
		overflow: hidden;
	}

	.error-message::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 4px;
		height: 100%;
		background: var(--color-error);
	}
	
	.success-message {
		color: var(--color-success);
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: var(--border-radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		text-align: center;
		backdrop-filter: blur(8px);
		box-shadow: var(--shadow-sm);
		position: relative;
		overflow: hidden;
	}

	.success-message::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 4px;
		height: 100%;
		background: var(--color-success);
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style> 