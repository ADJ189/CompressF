<script lang="ts">
	const techStack = [
		{ name: 'SvelteKit', desc: 'Framework & routing', color: '#ff6b35' },
		{ name: 'TypeScript', desc: 'Type safety', color: '#3178c6' },
		{ name: 'Plus Jakarta Sans', desc: 'UI typography', color: '#3b5bdb' },
		{ name: 'Canvas API', desc: 'Image rendering & compression', color: '#2f9e44' },
		{ name: 'OffscreenCanvas', desc: 'Off-main-thread rendering', color: '#2f9e44' },
		{ name: 'WebCodecs', desc: 'Hardware-accelerated video', color: '#0c8599' },
		{ name: 'MediaRecorder', desc: 'Video fallback encoding', color: '#0c8599' },
		{ name: 'PDF.js', desc: 'PDF parsing & page rendering', color: '#e03131' },
		{ name: 'Vite', desc: 'Build tool', color: '#bd34fe' },
		{ name: 'adapter-static', desc: 'Static site export', color: '#ff6b35' },
		{ name: 'Cloudflare Pages', desc: 'Hosting & CDN', color: '#f38020' },
	];

	const limitations = [
		'Video output via WebCodecs is raw H.264 — a proper MP4 muxer (mp4box.js) is planned for v1.',
		'Large PDFs (100+ pages) may be slow; Web Worker offloading is planned.',
		'AVIF encoding requires Chrome 94+ or Safari 16+. Firefox encodes as WebP instead.',
		'Batch download is sequential — ZIP bundling is planned for v1.',
	];
</script>

<svelte:head>
	<title>About — Compressly</title>
</svelte:head>

<div class="about-page">
	<div class="about-inner">

		<div class="page-hero">
			<div class="section-label">About</div>
			<h1>Built for privacy,<br>not convenience.</h1>
			<p class="lead">
				Most compression tools upload your files to a server, process them remotely, and send them back.
				Compressly doesn't. Everything runs inside your browser tab using native browser APIs — no server,
				no upload, no account.
			</p>
		</div>

		<div class="content">

			<section class="content-section">
				<h2>Why browser-native?</h2>
				<p>
					When you compress a file on a typical web service, that file travels across the internet
					before you ever see a smaller version. That's fine for a stock photo — less fine for a
					confidential PDF, a personal photo, or a sensitive document.
				</p>
				<p>
					Compressly uses the same Canvas API that powers browser games, the WebCodecs API used
					by professional video editors, and OffscreenCanvas for GPU-accelerated rendering. The
					result is fast, private compression that works on any modern device.
				</p>
			</section>

			<section class="content-section">
				<h2>Hardware acceleration</h2>
				<p>
					On Chrome 94+, Safari 16.4+, and Edge 94+, video compression uses the <strong>WebCodecs API</strong>
					which routes encoding to the device's GPU or dedicated video encoder chip. This makes it
					significantly faster than software encoding, especially on mobile devices with dedicated
					media engines.
				</p>
				<p>
					Image compression uses <strong>OffscreenCanvas</strong> where available — moving pixel
					operations off the main thread so the UI stays responsive during compression.
				</p>
			</section>

			<section class="content-section">
				<h2>How each format works</h2>

				<div class="format-cards">
					<div class="format-card">
						<div class="format-header">
							<span class="format-emoji">🖼️</span>
							<div>
								<strong>Images</strong>
								<span class="format-types">JPEG · PNG · WebP · AVIF</span>
							</div>
						</div>
						<p>
							Images are decoded into a GPU bitmap via <code>createImageBitmap()</code>, drawn
							onto a canvas at the target dimensions, then re-encoded in the chosen format.
							In target-size mode, a binary search across quality values finds the optimal
							setting in ≤12 iterations.
						</p>
					</div>

					<div class="format-card">
						<div class="format-header">
							<span class="format-emoji">📄</span>
							<div>
								<strong>PDFs</strong>
								<span class="format-types">PDF 1.4</span>
							</div>
						</div>
						<p>
							PDF files are loaded with <strong>PDF.js</strong> (loaded from CDN on first use).
							Each page is rendered at 1.5× scale to a canvas, saved as a compressed JPEG,
							then reassembled into a valid PDF using a hand-built minimal PDF container
							with embedded image XObjects.
						</p>
					</div>

					<div class="format-card">
						<div class="format-header">
							<span class="format-emoji">🎬</span>
							<div>
								<strong>Video</strong>
								<span class="format-types">MP4 · WebM</span>
							</div>
						</div>
						<p>
							With WebCodecs available, frames are decoded and re-encoded with H.264 at
							a target bitrate — hardware acceleration is requested from the browser. Without
							WebCodecs, the video plays into a canvas stream captured by <strong>MediaRecorder</strong>
							at the target bitrate.
						</p>
					</div>
				</div>
			</section>

			<section class="content-section">
				<h2>Tech stack</h2>
				<div class="tech-grid">
					{#each techStack as t}
						<div class="tech-chip" style="--c: {t.color}">
							<span class="tech-dot" style="background:{t.color}"></span>
							<div>
								<div class="tech-name">{t.name}</div>
								<div class="tech-desc">{t.desc}</div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="content-section">
				<h2>Known limitations — Alpha</h2>
				<p>This is Draft 1 Alpha. The core pipeline works well, but these rough edges remain:</p>
				<ul class="limit-list">
					{#each limitations as l}
						<li>{l}</li>
					{/each}
				</ul>
			</section>

		</div>

		<div class="cta-row">
			<a href="/compress" class="btn-primary">Open the compressor</a>
			<a href="/" class="btn-ghost">Back to home</a>
		</div>

	</div>
</div>

<style>
	.about-page { padding: 4rem 2rem 5rem; }
	.about-inner { max-width: 740px; margin: 0 auto; }

	.page-hero { margin-bottom: 3.5rem; }
	.section-label {
		font-size: 0.78rem; font-family: var(--mono); color: var(--accent);
		font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem;
	}
	.page-hero h1 {
		font-size: clamp(2rem, 5vw, 3rem); font-weight: 800;
		letter-spacing: -0.03em; color: var(--text); line-height: 1.1; margin-bottom: 1.25rem;
	}
	.lead { font-size: 1.05rem; color: var(--text-3); line-height: 1.8; }

	.content { display: flex; flex-direction: column; gap: 0; }

	.content-section {
		padding: 2.5rem 0;
		border-bottom: 1px solid var(--border);
	}
	.content-section:last-child { border-bottom: none; }

	.content-section h2 {
		font-size: 1.2rem; font-weight: 700; color: var(--text);
		letter-spacing: -0.015em; margin-bottom: 1rem;
	}
	.content-section p {
		font-size: 0.925rem; color: var(--text-3); line-height: 1.8;
		margin-bottom: 0.85rem;
	}
	.content-section p:last-child { margin-bottom: 0; }
	.content-section strong { color: var(--text-2); font-weight: 600; }
	.content-section code {
		font-family: var(--mono); font-size: 0.83em;
		background: var(--bg2); border: 1px solid var(--border);
		padding: 0.15em 0.45em; border-radius: 5px; color: var(--accent3);
	}

	/* FORMAT CARDS */
	.format-cards { display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1.25rem; }
	.format-card {
		padding: 1.4rem 1.5rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: var(--radius-lg);
	}
	.format-header {
		display: flex; align-items: center; gap: 0.85rem; margin-bottom: 0.85rem;
	}
	.format-emoji { font-size: 1.5rem; flex-shrink: 0; }
	.format-header strong { font-size: 0.95rem; font-weight: 700; color: var(--text); display: block; }
	.format-types {
		font-size: 0.75rem; font-family: var(--mono); color: var(--text-4); margin-top: 0.15rem;
	}
	.format-card p { font-size: 0.875rem; margin: 0; }

	/* TECH GRID */
	.tech-grid {
		display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem;
	}
	.tech-chip {
		display: flex; align-items: center; gap: 0.55rem;
		padding: 0.5rem 0.85rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: 8px;
	}
	.tech-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.tech-name { font-size: 0.82rem; font-weight: 600; color: var(--text); }
	.tech-desc { font-size: 0.72rem; font-family: var(--mono); color: var(--text-4); margin-top: 0.1rem; }

	/* LIMITATIONS */
	.limit-list {
		margin-top: 0.85rem; padding-left: 1.1rem;
		display: flex; flex-direction: column; gap: 0.6rem;
	}
	.limit-list li { font-size: 0.875rem; color: var(--text-3); line-height: 1.65; }

	/* CTA */
	.cta-row {
		display: flex; gap: 0.75rem; align-items: center;
		padding-top: 3rem; flex-wrap: wrap;
	}
	.btn-primary {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.7rem 1.5rem; background: var(--accent); color: white;
		border-radius: var(--radius); font-weight: 600; font-size: 0.95rem;
		border: none; transition: var(--transition);
		box-shadow: 0 1px 3px rgba(59,91,219,0.25);
	}
	.btn-primary:hover { background: var(--accent-mid); box-shadow: 0 4px 14px rgba(59,91,219,0.35); transform: translateY(-1px); }
	.btn-ghost {
		display: inline-flex; align-items: center;
		padding: 0.7rem 1.5rem; background: transparent;
		border: 1px solid var(--border-mid); color: var(--text-2);
		border-radius: var(--radius); font-weight: 600; font-size: 0.95rem;
		transition: var(--transition);
	}
	.btn-ghost:hover { border-color: var(--text-3); background: var(--bg2); }
</style>
