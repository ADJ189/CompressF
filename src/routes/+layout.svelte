<script lang="ts">
	import { page } from '$app/stores';

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/compress', label: 'Compress' },
		{ href: '/about', label: 'About' },
	];
</script>

<div class="app">
	<nav class="nav">
		<a href="/" class="nav-logo">
			<span class="logo-icon">⬡</span>
			<span class="logo-text">Compressly</span>
		</a>
		<div class="nav-links">
			{#each navLinks as link}
				<a href={link.href} class="nav-link" class:active={$page.url.pathname === link.href}>
					{link.label}
				</a>
			{/each}
		</div>
		<a href="/compress" class="nav-cta">Start Compressing</a>
	</nav>

	<main>
		<slot />
	</main>

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<span class="logo-icon">⬡</span>
				<span>Compressly</span>
			</div>
			<p class="footer-note">All processing happens in your browser. Your files never leave your device.</p>
			<div class="footer-links">
				<a href="/">Home</a>
				<a href="/compress">Compress</a>
				<a href="/about">About</a>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
	:global(:root) {
		--bg: #08080e;
		--bg2: #0f0f1a;
		--bg3: #161625;
		--surface: #1a1a2e;
		--surface2: #22223a;
		--border: rgba(120, 120, 200, 0.12);
		--border-bright: rgba(120, 120, 200, 0.25);
		--accent: #6c63ff;
		--accent2: #ff6b6b;
		--accent3: #00e5ff;
		--accent-glow: rgba(108, 99, 255, 0.3);
		--text: #e8e8f0;
		--text-dim: #8888aa;
		--text-dimmer: #555570;
		--mono: 'JetBrains Mono', monospace;
		--sans: 'Syne', sans-serif;
		--radius: 12px;
		--radius-lg: 20px;
		--transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}
	:global(body) {
		background: var(--bg);
		color: var(--text);
		font-family: var(--sans);
		line-height: 1.6;
		min-height: 100vh;
		overflow-x: hidden;
	}
	:global(a) { color: inherit; text-decoration: none; }
	:global(button) { cursor: pointer; font-family: var(--sans); }
	:global(::-webkit-scrollbar) { width: 6px; }
	:global(::-webkit-scrollbar-track) { background: var(--bg2); }
	:global(::-webkit-scrollbar-thumb) { background: var(--surface2); border-radius: 3px; }

	.app { display: flex; flex-direction: column; min-height: 100vh; }

	.nav {
		position: fixed; top: 0; left: 0; right: 0; z-index: 100;
		display: flex; align-items: center; gap: 2rem; padding: 1rem 2rem;
		background: rgba(8, 8, 14, 0.85);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border);
	}
	.nav-logo {
		display: flex; align-items: center; gap: 0.6rem;
		font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em;
	}
	.logo-icon { font-size: 1.4rem; color: var(--accent); line-height: 1; }
	.logo-text {
		background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.nav-links { display: flex; gap: 0.25rem; margin-left: auto; }
	.nav-link {
		padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.9rem;
		font-weight: 500; color: var(--text-dim); transition: var(--transition);
	}
	.nav-link:hover, :global(.nav-link.active) { color: var(--text); background: var(--surface); }
	.nav-cta {
		padding: 0.5rem 1.2rem; background: var(--accent); color: white;
		border-radius: 8px; font-size: 0.88rem; font-weight: 600;
		transition: var(--transition); white-space: nowrap;
	}
	.nav-cta:hover { background: #7d75ff; box-shadow: 0 0 20px var(--accent-glow); }
	main { flex: 1; padding-top: 65px; }

	.footer { border-top: 1px solid var(--border); padding: 2.5rem 2rem; margin-top: 4rem; }
	.footer-inner {
		max-width: 1100px; margin: 0 auto;
		display: flex; align-items: center; gap: 2rem; flex-wrap: wrap;
	}
	.footer-brand { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; }
	.footer-note { flex: 1; font-size: 0.82rem; color: var(--text-dimmer); font-family: var(--mono); }
	.footer-links { display: flex; gap: 1.5rem; }
	.footer-links a { font-size: 0.85rem; color: var(--text-dim); transition: color var(--transition); }
	.footer-links a:hover { color: var(--text); }

	@media (max-width: 768px) {
		.nav { padding: 0.85rem 1rem; }
		.nav-links { display: none; }
		.footer-inner { flex-direction: column; align-items: flex-start; gap: 1rem; }
	}
</style>
