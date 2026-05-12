<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let theme: 'light' | 'dark' = 'light';

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'dark' || saved === 'light') {
			theme = saved;
		} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		}
		applyTheme(theme);
	});

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		localStorage.setItem('theme', theme);
		applyTheme(theme);
	}

	function applyTheme(t: string) {
		document.documentElement.setAttribute('data-theme', t);
	}

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/compress', label: 'Compress' },
		{ href: '/about', label: 'About' },
	];
</script>

<div class="app" data-theme={theme}>
	<nav class="nav">
		<a href="/" class="nav-logo">
			<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect width="28" height="28" rx="8" fill="var(--accent)"/>
				<path d="M8 14L12 10L16 14L20 10" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M8 18L12 14L16 18L20 14" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
			</svg>
			<span class="logo-text">Compressly</span>
		</a>

		<div class="nav-center">
			{#each navLinks as link}
				<a href={link.href} class="nav-link" class:active={$page.url.pathname === link.href}>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="nav-right">
			<button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
				{#if theme === 'light'}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
						<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
					</svg>
				{/if}
			</button>
			<a href="/compress" class="nav-cta">Start compressing</a>
		</div>
	</nav>

	<main>
		<slot />
	</main>

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-left">
				<a href="/" class="footer-logo">
					<svg width="22" height="22" viewBox="0 0 28 28" fill="none">
						<rect width="28" height="28" rx="8" fill="var(--accent)"/>
						<path d="M8 14L12 10L16 14L20 10" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M8 18L12 14L16 18L20 14" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
					</svg>
					<span>Compressly</span>
				</a>
				<p class="footer-tagline">Your files never leave your device.</p>
			</div>
			<nav class="footer-nav">
				<a href="/">Home</a>
				<a href="/compress">Compress</a>
				<a href="/about">About</a>
			</nav>
		</div>
		<div class="footer-bottom">
			<span>Draft 1 · Alpha</span>
			<span>Built with SvelteKit · Hosted on Cloudflare Pages</span>
		</div>
	</footer>
</div>

<style>
	/* ── DESIGN TOKENS ──────────────────────────────── */
	:global(:root), :global([data-theme="light"]) {
		--bg:          #fafaf8;
		--bg2:         #f4f4f0;
		--bg3:         #eeeee9;
		--surface:     #ffffff;
		--surface2:    #f0f0eb;
		--border:      #e4e4de;
		--border-mid:  #d0d0c8;
		--accent:      #3b5bdb;
		--accent-soft: #eef1fd;
		--accent-mid:  #4a6ce8;
		--accent2:     #e03131;
		--accent3:     #0c8599;
		--text:        #1a1a18;
		--text-2:      #3d3d38;
		--text-3:      #6b6b63;
		--text-4:      #a8a89e;
		--shadow-sm:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
		--shadow-md:   0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
		--shadow-lg:   0 8px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.05);
		--sans:        'Plus Jakarta Sans', system-ui, sans-serif;
		--mono:        'DM Mono', 'Fira Mono', monospace;
		--radius:      10px;
		--radius-lg:   16px;
		--radius-xl:   24px;
		--transition:  0.18s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global([data-theme="dark"]) {
		--bg:          #111110;
		--bg2:         #1a1a18;
		--bg3:         #222220;
		--surface:     #1e1e1c;
		--surface2:    #282825;
		--border:      #2e2e2b;
		--border-mid:  #3a3a36;
		--accent:      #4c6ef5;
		--accent-soft: #1a2040;
		--accent-mid:  #5c7ef5;
		--accent2:     #ff6b6b;
		--accent3:     #22b8cf;
		--text:        #f0f0ec;
		--text-2:      #c8c8c0;
		--text-3:      #888880;
		--text-4:      #555550;
		--shadow-sm:   0 1px 3px rgba(0,0,0,0.3);
		--shadow-md:   0 4px 12px rgba(0,0,0,0.4);
		--shadow-lg:   0 8px 30px rgba(0,0,0,0.5);
	}

	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	:global(html) { scroll-behavior: smooth; }

	:global(body) {
		background: var(--bg);
		color: var(--text);
		font-family: var(--sans);
		font-size: 16px;
		line-height: 1.65;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition: background var(--transition), color var(--transition);
		min-height: 100vh;
		overflow-x: hidden;
	}

	:global(a) { color: inherit; text-decoration: none; }
	:global(button) { cursor: pointer; font-family: var(--sans); }
	:global(input, select, textarea) { font-family: var(--sans); }

	:global(::-webkit-scrollbar) { width: 6px; height: 6px; }
	:global(::-webkit-scrollbar-track) { background: var(--bg2); }
	:global(::-webkit-scrollbar-thumb) { background: var(--border-mid); border-radius: 3px; }
	:global(::-webkit-scrollbar-thumb:hover) { background: var(--text-4); }

	/* ── APP SHELL ──────────────────────────────────── */
	.app { display: flex; flex-direction: column; min-height: 100vh; }

	/* ── NAV ────────────────────────────────────────── */
	.nav {
		position: fixed; top: 0; left: 0; right: 0; z-index: 100;
		display: flex; align-items: center; gap: 1rem;
		padding: 0 1.5rem; height: 60px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		box-shadow: var(--shadow-sm);
		transition: background var(--transition), border-color var(--transition);
	}

	.nav-logo {
		display: flex; align-items: center; gap: 0.6rem;
		font-weight: 700; font-size: 1.05rem;
		color: var(--text); letter-spacing: -0.01em;
		flex-shrink: 0;
	}

	.logo-text { color: var(--text); }

	.nav-center {
		display: flex; align-items: center; gap: 0.1rem;
		margin: 0 auto;
	}

	.nav-link {
		padding: 0.4rem 0.9rem; border-radius: 8px;
		font-size: 0.9rem; font-weight: 500;
		color: var(--text-3);
		transition: color var(--transition), background var(--transition);
	}
	.nav-link:hover { color: var(--text); background: var(--bg2); }
	:global(.nav-link.active) { color: var(--text); background: var(--bg2); font-weight: 600; }

	.nav-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

	.theme-toggle {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; border-radius: 8px;
		background: var(--bg2); border: 1px solid var(--border);
		color: var(--text-3); transition: var(--transition);
	}
	.theme-toggle:hover { color: var(--text); border-color: var(--border-mid); background: var(--bg3); }

	.nav-cta {
		padding: 0.45rem 1.1rem;
		background: var(--accent); color: white;
		border-radius: 8px; font-size: 0.875rem; font-weight: 600;
		transition: var(--transition); white-space: nowrap;
		box-shadow: 0 1px 3px rgba(59,91,219,0.25);
	}
	.nav-cta:hover { background: var(--accent-mid); box-shadow: 0 4px 12px rgba(59,91,219,0.3); transform: translateY(-1px); }

	main { flex: 1; padding-top: 60px; }

	/* ── FOOTER ─────────────────────────────────────── */
	.footer {
		border-top: 1px solid var(--border);
		padding: 2rem 2rem 1.5rem;
		background: var(--surface);
		margin-top: 5rem;
	}
	.footer-inner {
		max-width: 1000px; margin: 0 auto;
		display: flex; align-items: flex-start; justify-content: space-between;
		gap: 2rem; flex-wrap: wrap;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}
	.footer-left { display: flex; flex-direction: column; gap: 0.4rem; }
	.footer-logo {
		display: flex; align-items: center; gap: 0.5rem;
		font-weight: 700; font-size: 0.95rem; color: var(--text);
	}
	.footer-tagline { font-size: 0.82rem; color: var(--text-4); font-family: var(--mono); }
	.footer-nav { display: flex; gap: 1.5rem; padding-top: 0.25rem; }
	.footer-nav a { font-size: 0.875rem; color: var(--text-3); transition: color var(--transition); }
	.footer-nav a:hover { color: var(--text); }
	.footer-bottom {
		max-width: 1000px; margin: 1.25rem auto 0;
		display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
		font-size: 0.78rem; color: var(--text-4); font-family: var(--mono);
	}

	@media (max-width: 680px) {
		.nav-center { display: none; }
		.footer-inner { flex-direction: column; gap: 1.25rem; }
		.footer-bottom { flex-direction: column; }
	}
</style>
