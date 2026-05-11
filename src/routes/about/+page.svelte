<script lang="ts">
	const techStack = [
		{ name: 'SvelteKit', desc: 'Framework & routing', color: '#ff6b35' },
		{ name: 'TypeScript', desc: 'Type safety', color: '#3178c6' },
		{ name: 'Canvas API', desc: 'Image rendering & compression', color: '#6c63ff' },
		{ name: 'OffscreenCanvas', desc: 'Off-main-thread rendering', color: '#6c63ff' },
		{ name: 'WebCodecs', desc: 'Hardware-accelerated video', color: '#00e5ff' },
		{ name: 'MediaRecorder', desc: 'Video fallback encoding', color: '#00e5ff' },
		{ name: 'PDF.js', desc: 'PDF parsing & page rendering', color: '#ff6b6b' },
		{ name: 'Vite', desc: 'Build tool & dev server', color: '#bd34fe' },
		{ name: 'Cloudflare Pages', desc: 'Hosting & CDN', color: '#f38020' },
	];
</script>

<svelte:head>
	<title>About — Compressly</title>
</svelte:head>

<div class="about-page">
	<div class="about-inner">
		<section class="about-hero">
			<h1>About Compressly</h1>
			<p class="lead">
				A fast, private, browser-native file compressor. No backend. No cloud.
				Every byte stays on your device.
			</p>
		</section>

		<section class="section">
			<h2>Why browser-native?</h2>
			<p>
				Traditional file compression services upload your files to servers. That means your private photos,
				confidential PDFs, and personal videos travel across the internet before you get a compressed version.
			</p>
			<p>
				Compressly does all the work locally using APIs built into modern browsers —
				the same Canvas API that powers browser games, the WebCodecs API used by video editors,
				and OffscreenCanvas for GPU-accelerated rendering. The result is compression that is fast,
				private, and completely free.
			</p>
		</section>

		<section class="section">
			<h2>Hardware acceleration</h2>
			<p>
				On supported browsers (Chrome 94+, Safari 16.4+, Edge 94+), video compression uses the
				<strong>WebCodecs API</strong> which routes encoding to the device's GPU or dedicated video
				hardware. On older browsers, <strong>MediaRecorder</strong> is used as a fallback.
			</p>
			<p>
				Image compression uses <strong>OffscreenCanvas</strong> where available, which moves pixel
				operations off the main thread and can leverage GPU compositing.
			</p>
		</section>

		<section class="section">
			<h2>How each format is handled</h2>
			<div class="format-list">
				<div class="format-item">
					<div class="fi-header">
						<span class="fi-icon">🖼️</span>
						<strong>Images (JPEG, PNG, WebP, AVIF)</strong>
					</div>
					<p>
						Images are decoded into a bitmap via <code>createImageBitmap()</code>, drawn onto a
						canvas at the target dimensions, then re-encoded in the chosen output format.
						For target-size mode, a binary search across quality values (0–100) finds the
						optimal setting within ~12 iterations.
					</p>
				</div>
				<div class="format-item">
					<div class="fi-header">
						<span class="fi-icon">📄</span>
						<strong>PDFs</strong>
					</div>
					<p>
						PDF files are loaded with <strong>PDF.js</strong>, each page rendered at 1.5x scale
						to a canvas, then saved as a compressed JPEG. A minimal hand-crafted PDF container
						wraps all pages back into a valid PDF file with embedded image XObjects.
					</p>
				</div>
				<div class="format-item">
					<div class="fi-header">
						<span class="fi-icon">🎬</span>
						<strong>Video (MP4, WebM)</strong>
					</div>
					<p>
						With <strong>WebCodecs</strong>, video frames are decoded, re-encoded with
						H.264/VP9 at the target bitrate, and hardware acceleration is requested from
						the browser. Without WebCodecs, the video plays into a canvas stream which is
						captured by <strong>MediaRecorder</strong> at the target bitrate.
					</p>
				</div>
			</div>
		</section>

		<section class="section">
			<h2>Tech stack</h2>
			<div class="tech-grid">
				{#each techStack as tech}
					<div class="tech-item" style="--c: {tech.color}">
						<div class="tech-name">{tech.name}</div>
						<div class="tech-desc">{tech.desc}</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="section">
			<h2>Alpha status</h2>
			<p>
				This is <strong>Draft 1 Alpha</strong>. The core compression pipeline works, but there are
				known limitations:
			</p>
			<ul class="limitation-list">
				<li>Video output via WebCodecs is raw H.264 without a proper MP4 container muxer (planned: mp4box.js integration)</li>
				<li>Very large PDFs (100+ pages) may be slow without Web Worker offloading</li>
				<li>AVIF encoding support depends on browser (Chrome 94+ only)</li>
				<li>Batch download is sequential — a ZIP bundler is planned for v1</li>
			</ul>
		</section>

		<div class="cta-row">
			<a href="/compress" class="btn-accent">Open the Compressor</a>
		</div>
	</div>
</div>

<style>
	.about-page { padding: 4rem 2rem; }
	.about-inner { max-width: 760px; margin: 0 auto; }
	.about-hero { margin-bottom: 3.5rem; }
	.about-hero h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 1rem; }
	.lead { font-size: 1.15rem; color: var(--text-dim); line-height: 1.7; }
	.section { margin-bottom: 3rem; padding-bottom: 3rem; border-bottom: 1px solid var(--border); }
	.section h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1rem; }
	.section p { color: var(--text-dim); line-height: 1.8; margin-bottom: 0.75rem; font-size: 0.95rem; }
	.section strong { color: var(--text); }
	.section code {
		font-family: var(--mono); font-size: 0.85em;
		background: var(--surface); padding: 0.15em 0.4em; border-radius: 4px;
		color: var(--accent3);
	}
	.format-list { display: flex; flex-direction: column; gap: 1.5rem; }
	.format-item {
		padding: 1.5rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: var(--radius);
	}
	.fi-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; font-size: 1rem; }
	.fi-icon { font-size: 1.4rem; }
	.fi-header strong { color: var(--text); }
	.format-item p { margin: 0; font-size: 0.875rem; }

	.tech-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
	.tech-item {
		padding: 0.6rem 1rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: 8px;
		border-left: 3px solid var(--c, var(--accent));
	}
	.tech-name { font-size: 0.875rem; font-weight: 700; color: var(--text); }
	.tech-desc { font-size: 0.75rem; color: var(--text-dimmer); font-family: var(--mono); }

	.limitation-list {
		padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;
	}
	.limitation-list li { font-size: 0.875rem; color: var(--text-dim); line-height: 1.6; }

	.cta-row { display: flex; justify-content: center; padding-top: 1rem; }
	.btn-accent {
		padding: 0.85rem 2.2rem; background: var(--accent); color: white;
		border-radius: var(--radius); font-weight: 700; font-size: 1rem;
		transition: var(--transition);
	}
	.btn-accent:hover { background: #7d75ff; box-shadow: 0 0 25px var(--accent-glow); }
</style>
