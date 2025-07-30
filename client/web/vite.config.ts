import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: true,
		port: 5173,
		strictPort: false,
		https: (() => {
			try {
				return {
					key: fs.readFileSync(path.resolve(__dirname, '../../ssl/key.pem')),
					cert: fs.readFileSync(path.resolve(__dirname, '../../ssl/cert.pem'))
				};
			} catch (error) {
				console.log('SSL certificates not found, running without HTTPS');
				return false;
			}
		})(),
		proxy: {
			'/api': {
				target: 'http://localhost:8081',
				changeOrigin: true,
				secure: false
			},
			'/ws': {
				target: 'ws://localhost:8081',
				ws: true,
				changeOrigin: true,
				secure: false
			},
			'/voice': {
				target: 'ws://localhost:8081',
				ws: true,
				changeOrigin: true,
				secure: false
			}
		}
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
