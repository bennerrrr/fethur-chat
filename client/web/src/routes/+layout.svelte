<script lang="ts">
// Layout logic can be added here if needed
</script>

<style>
:root {
  --color-bg: #101624;
  --color-bg-alt: #18213a;
  --color-text: #e6eaf3;
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-card: #1e293b;
  --color-border: #334155;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100vh;
  margin: 0;
}

.main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

header {
  background: var(--color-bg-alt);
  color: var(--color-accent);
  padding: 1.5rem 2rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 8px 0 rgba(16,22,36,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

footer {
  background: var(--color-bg-alt);
  color: var(--color-accent);
  padding: 1rem 2rem;
  text-align: center;
  font-size: 1rem;
  margin-top: auto;
  border-top: 1px solid var(--color-border);
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 24px 0 rgba(16,22,36,0.12);
  margin: 2rem auto;
  max-width: 400px;
}

a {
  color: var(--color-accent);
  text-decoration: none;
}
a:hover {
  color: var(--color-accent-hover);
}
</style>

<div class="main">
  <header>
    Feathur
    <span style="font-size:1rem;font-weight:400;color:var(--color-text);">Self-Hosted</span>
  </header>
  <slot />
  <footer>
    &copy; {new Date().getFullYear()} Feathur &mdash; Modern, self-hosted chat
  </footer>
</div> 