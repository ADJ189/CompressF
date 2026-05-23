import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		target: 'esnext', // Required for top-level await in dependencies
		// pdfjs-dist ships pre-bundled — don't try to re-bundle it
		rollupOptions: {
			external: []
		}
	},
	worker: {
		format: 'es'
	},
	optimizeDeps: {
		// Exclude from Vite's dep pre-bundling — it's loaded dynamically at runtime
		exclude: ['pdfjs-dist']
	},
	ssr: {
		// Don't bundle pdfjs-dist for SSR — it uses browser APIs
		noExternal: [],
		external: ['pdfjs-dist']
	},
	server: {
		headers: {
			'Cross-Origin-Opener-Policy':   'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	}
});
