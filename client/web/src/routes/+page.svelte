<script lang="ts">
  let username = '';
  let password = '';
  let error = '';

  function handleLogin() {
    if (username === 'admin' && password === 'feathur') {
      error = '';
      alert('Login successful! (demo only)');
    } else {
      error = 'Invalid username or password';
    }
  }
</script>

<div class="card">
  <h2 style="color:var(--color-accent);margin-bottom:1.5rem;text-align:center;">Feathur Login</h2>
  <form on:submit|preventDefault={handleLogin}>
    <label for="username">Username</label>
    <input id="username" type="text" bind:value={username} placeholder="admin" autocomplete="username" required />
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} placeholder="feathur" autocomplete="current-password" required />
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <button type="submit">Login</button>
  </form>
  <div style="margin-top:1.5rem;font-size:0.95rem;color:var(--color-text);text-align:center;">
    <strong>Default login:</strong><br />
    <span style="color:var(--color-accent);">admin</span> / <span style="color:var(--color-accent);">feathur</span>
  </div>
</div>

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
}
input {
  background: var(--color-bg-alt);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s;
}
input:focus {
  border: 1.5px solid var(--color-accent);
}
button {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s;
}
button:hover {
  background: var(--color-accent-hover);
}
.error {
  color: #ef4444;
  background: #1e293b;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  text-align: center;
  font-size: 0.98rem;
}
</style> 