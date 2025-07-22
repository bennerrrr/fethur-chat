<script lang="ts">
	import { onMount } from 'svelte';

	let authMode = 'public';
	let registrationPassword = '';
	let loading = true;
	let error = '';

	let formData = {
		username: '',
		password: '',
		confirmPassword: '',
		registrationPassword: ''
	};

	onMount(async () => {
		try {
			// Get auth mode from settings
			const response = await fetch('/api/setup/status');
			if (response.ok) {
				const data = await response.json();
				if (!data.isFirstTime) {
					// Try to get auth mode from settings
					const settingsResponse = await fetch('/api/settings');
					if (settingsResponse.ok) {
						const settings = await settingsResponse.json();
						authMode = settings.auth_mode || 'public';
						registrationPassword = settings.registration_password || '';
					}
				}
			}
		} catch (err) {
			console.error('Error loading auth settings:', err);
		} finally {
			loading = false;
		}
	});

	async function handleRegister() {
		if (formData.password !== formData.confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (formData.password.length < 9) {
			error = 'Password must be at least 9 characters long';
			return;
		}

		// Check for number and special character
		let hasNumber = false;
		let hasSpecial = false;
		for (const char of formData.password) {
			if (char >= '0' && char <= '9') hasNumber = true;
			if ((char >= '!' && char <= '/') || (char >= ':' && char <= '@') || (char >= '[' && char <= '`') || (char >= '{' && char <= '~')) {
				hasSpecial = true;
			}
		}

		if (!hasNumber) {
			error = 'Password must contain at least one number';
			return;
		}
		if (!hasSpecial) {
			error = 'Password must contain at least one special character';
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: formData.username,
					password: formData.password,
					registrationPassword: formData.registrationPassword
				})
			});

			if (response.ok) {
				const data = await response.json();
				localStorage.setItem('token', data.token);
				window.location.href = '/dashboard';
			} else {
				const data = await response.json();
				error = data.error || 'Registration failed';
			}
		} catch (err) {
			error = 'Registration failed';
		}
	}
</script>

{#if loading}
	<div class="glass-card">
		<div style="text-align: center; padding: 2rem;">
			<div style="font-size: 1.2rem; margin-bottom: 1rem;">Loading...</div>
			<div style="width: 40px; height: 40px; border: 3px solid var(--color-glass-border); border-top: 3px solid var(--color-accent); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
		</div>
	</div>
{:else if authMode === 'admin_only'}
	<div class="glass-card">
		<h2 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Registration Disabled</h2>
		<div style="text-align: center; margin-bottom: 2rem;">
			<p style="color: var(--color-text); opacity: 0.8;">
				Registration is currently disabled. Only administrators can create new accounts.
			</p>
		</div>
		<div style="text-align: center;">
			<a href="/" class="primary-button" style="text-decoration: none; display: inline-block;">Back to Login</a>
		</div>
	</div>
{:else}
	<div class="glass-card">
		<h2 style="color: var(--color-accent); margin-bottom: 1.5rem; text-align: center;">Create Account</h2>
		
		{#if error}
			<div class="error">{error}</div>
		{/if}

		<form on:submit|preventDefault={handleRegister}>
			<div style="display: flex; flex-direction: column; gap: 1rem;">
				<div>
					<label for="username">Username</label>
					<input id="username" type="text" bind:value={formData.username} placeholder="Enter username" required />
				</div>
				<div>
					<label for="password">Password</label>
					<input id="password" type="password" bind:value={formData.password} placeholder="Min 9 chars, number, special char" required />
				</div>
				<div>
					<label for="confirmPassword">Confirm Password</label>
					<input id="confirmPassword" type="password" bind:value={formData.confirmPassword} placeholder="Confirm password" required />
				</div>
				
				{#if authMode === 'open_registration'}
					<div>
						<label for="regPassword">Registration Password</label>
						<input id="regPassword" type="password" bind:value={formData.registrationPassword} placeholder="Enter registration password" required />
					</div>
				{/if}
				
				<button type="submit" class="primary-button">Create Account</button>
			</div>
		</form>

		<div style="margin-top: 1.5rem; text-align: center;">
			<a href="/" style="color: var(--color-accent);">Already have an account? Login here</a>
		</div>
	</div>
{/if}

<style>
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	label {
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 0.25rem;
		display: block;
	}
	
	input[type="text"], input[type="email"], input[type="password"] {
		background: var(--color-glass);
		color: var(--color-text);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		padding: 0.75rem 1rem;
		font-size: 1rem;
		outline: none;
		transition: border 0.2s;
		width: 100%;
		box-sizing: border-box;
	}
	
	input:focus {
		border: 1.5px solid var(--color-accent);
	}
	
	.primary-button {
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--border-radius);
		padding: 0.75rem 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}
	
	.primary-button:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	
	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.error {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--border-radius);
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style> 