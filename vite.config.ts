import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// FFmpeg loaded from CDN at runtime — exclude from bundle entirely
	build: {
		rollupOptions: {
			external: []
		}
	},
	optimizeDeps: {
		exclude: []
	},
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	}
});
