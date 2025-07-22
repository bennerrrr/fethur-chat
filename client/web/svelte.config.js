import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false
		}),
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore missing routes during prerender
				if (message.includes('Not found')) {
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
