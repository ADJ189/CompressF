import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		target: 'esnext',
		rollupOptions: {
			external: []
		}
	},
	worker: {
		format: 'es'
	},
	optimizeDeps: {
		exclude: ['pdfjs-dist']
	},
	ssr: {
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
