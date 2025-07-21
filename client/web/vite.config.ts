import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		port: 5173,
		strictPort: false
	},
	build: {
		target: 'es2022',
		minify: 'esbuild',
		sourcemap: true
	},
	optimizeDeps: {
		include: ['socket.io-client', 'lucide-svelte']
	},
	define: {
		// Define global constants
		__DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
	}
});
