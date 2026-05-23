// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // Essential for Cloudflare Pages routing
			precompress: true,    // Set to true! Cloudflare serves precompressed gzip/brotli beautifully
			strict: false         // Prevents aggressive build-time crawler errors
		})
	}
};

export default config;
