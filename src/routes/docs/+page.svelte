<script lang="ts">
	const sections = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'privacy', label: 'Privacy' },
		{ id: 'images', label: 'Images' },
		{ id: 'video', label: 'Video' },
		{ id: 'pdf', label: 'PDF' },
		{ id: 'hardware', label: 'Hardware accel' },
		{ id: 'opensource', label: 'Open source' },
	];
	let active = 'overview';
</script>

<svelte:head><title>Documentation — Compressly</title></svelte:head>

<div class="docs-layout">
	<!-- Sidebar -->
	<aside class="sidebar">
		<div class="sidebar-label">Documentation</div>
		<nav class="sidebar-nav">
			{#each sections as s}
				<a href="#{s.id}" class="sn-link" class:active={active === s.id} on:click={() => active = s.id}>
					{s.label}
				</a>
			{/each}
		</nav>
		<div class="sidebar-links">
			<a href="https://github.com/ADJ189/compressly" target="_blank" rel="noopener" class="ext-link">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
				GitHub ↗
			</a>
			<a href="https://github.com/ADJ189/compressly/wiki" target="_blank" rel="noopener" class="ext-link">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
				Wiki ↗
			</a>
		</div>
	</aside>

	<!-- Content -->
	<div class="docs-content">

		<section id="overview" class="doc-section">
			<div class="section-badge">Overview</div>
			<h1>Compressly Documentation</h1>
			<p class="lead">Compressly is a browser-native file compression tool for images, PDFs, and video. It runs entirely client-side — no servers, no uploads, no accounts.</p>

			<div class="info-grid">
				<div class="info-card">
					<div class="ic-label">Version</div>
					<div class="ic-val">0.0.1 — Draft 1 Alpha</div>
				</div>
				<div class="info-card">
					<div class="ic-label">License</div>
					<div class="ic-val">MIT</div>
				</div>
				<div class="info-card">
					<div class="ic-label">Framework</div>
					<div class="ic-val">SvelteKit + TypeScript</div>
				</div>
				<div class="info-card">
					<div class="ic-label">Hosting</div>
					<div class="ic-val">Cloudflare Pages</div>
				</div>
			</div>

			<h2>Quick start</h2>
			<div class="code-block">
				<div class="cb-header"><span>Terminal</span></div>
				<pre><code>git clone https://github.com/ADJ189/compressly
cd compressly
npm install
npm run dev</code></pre>
			</div>

			<h2>Build & deploy</h2>
			<div class="code-block">
				<div class="cb-header"><span>Build</span></div>
				<pre><code>npm run build        # outputs to /build
# Deploy to Cloudflare Pages:
# Build command:   npm run build
# Output dir:      build
# Node version:    22</code></pre>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="privacy" class="doc-section">
			<div class="section-badge privacy">🔒 Privacy first</div>
			<h2>Privacy by design</h2>
			<p>Compressly is architecturally incapable of leaking your files. Here's why:</p>

			<div class="feature-list">
				<div class="fl-item">
					<div class="fl-icon">✓</div>
					<div>
						<strong>No network requests for your files.</strong> Compression uses browser-native APIs — Canvas, WebCodecs, OffscreenCanvas, FFmpeg.wasm. None of these send data over the network.
					</div>
				</div>
				<div class="fl-item">
					<div class="fl-icon">✓</div>
					<div>
						<strong>No server-side processing.</strong> The app is a static site served from Cloudflare's CDN. There is no backend, no database, no logging of file activity.
					</div>
				</div>
				<div class="fl-item">
					<div class="fl-icon">✓</div>
					<div>
						<strong>Files live only in memory.</strong> All file data is held in JavaScript <code>ArrayBuffer</code> and <code>Blob</code> objects in your tab's memory. Closing the tab destroys everything.
					</div>
				</div>
				<div class="fl-item">
					<div class="fl-icon">✓</div>
					<div>
						<strong>No analytics on file content.</strong> We don't track what you compress, how large files are, or what formats you use.
					</div>
				</div>
				<div class="fl-item">
					<div class="fl-icon">✓</div>
					<div>
						<strong>External CDN assets only.</strong> PDF.js and FFmpeg.wasm core files are loaded from public CDNs (cdnjs, unpkg). These are static binary/script files — they don't receive your file data.
					</div>
				</div>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="images" class="doc-section">
			<div class="section-badge">🖼️ Images</div>
			<h2>Image compression</h2>
			<p>Supports JPEG, PNG, WebP, AVIF input and output. The pipeline is:</p>

			<div class="pipeline">
				<div class="pipe-step">
					<div class="ps-num">1</div>
					<div>
						<strong>Decode</strong>
						<span><code>createImageBitmap(file)</code> — GPU-accelerated on Chrome, Safari, Edge. Falls back to <code>&lt;img&gt;</code> element for Firefox AVIF.</span>
					</div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">2</div>
					<div>
						<strong>Resize</strong>
						<span>If max dimension is set, aspect-ratio-aware scaling is applied before drawing.</span>
					</div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">3</div>
					<div>
						<strong>Draw to OffscreenCanvas</strong>
						<span>Moves rendering off the main thread. GPU-composited on supported browsers.</span>
					</div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">4</div>
					<div>
						<strong>Encode</strong>
						<span><code>convertToBlob()</code> for OffscreenCanvas, <code>toBlob()</code> for regular canvas. Quality control per format.</span>
					</div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">5</div>
					<div>
						<strong>Target size (optional)</strong>
						<span>Binary search over quality values — up to 14 iterations — to find the smallest file that fits within the target.</span>
					</div>
				</div>
			</div>

			<h3>Format comparison</h3>
			<div class="table-wrap">
				<table>
					<thead><tr><th>Format</th><th>Compression</th><th>Transparency</th><th>Browser support</th><th>Best for</th></tr></thead>
					<tbody>
						<tr><td>WebP</td><td>Excellent</td><td>✓</td><td>All modern</td><td>Photos, general use</td></tr>
						<tr><td>AVIF</td><td>Best</td><td>✓</td><td>Chrome 94+, Safari 16+</td><td>Photos, maximum compression</td></tr>
						<tr><td>JPEG</td><td>Good</td><td>✗</td><td>Universal</td><td>Photos, legacy compatibility</td></tr>
						<tr><td>PNG</td><td>Lossless</td><td>✓</td><td>Universal</td><td>Screenshots, logos, text</td></tr>
					</tbody>
				</table>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="video" class="doc-section">
			<div class="section-badge">🎬 Video</div>
			<h2>Video encoding</h2>
			<p>Three-tier fallback chain, automatically selected at runtime:</p>

			<div class="tier-cards">
				<div class="tier-card primary-tier">
					<div class="tier-header">
						<span class="tier-badge">Primary</span>
						<strong>FFmpeg.wasm</strong>
					</div>
					<p>Full ffmpeg binary compiled to WebAssembly. Supports H.264 (libx264), VP9 (libvpx-vp9), AV1 (libaom). CRF quality mode, bitrate targeting, and preset speed control. Multi-threaded when <code>SharedArrayBuffer</code> is available via COOP/COEP headers.</p>
					<div class="tier-tags"><span>All browsers</span><span>Full codec control</span><span>SIMD-optimised</span></div>
				</div>
				<div class="tier-card">
					<div class="tier-header">
						<span class="tier-badge secondary">Fallback 1</span>
						<strong>WebCodecs API</strong>
					</div>
					<p>Frame-level H.264 encoding via the browser's platform video encoder. Requests <code>hardwareAcceleration: 'prefer-hardware'</code> — this routes to Intel Media SDK, AMD AMF, or NVIDIA NVENC through the OS video encoder abstraction layer.</p>
					<div class="tier-tags"><span>Chrome 94+</span><span>Safari 16.4+</span><span>GPU path available</span></div>
				</div>
				<div class="tier-card">
					<div class="tier-header">
						<span class="tier-badge tertiary">Fallback 2</span>
						<strong>MediaRecorder</strong>
					</div>
					<p>Plays the video into a canvas stream and records it with <code>MediaRecorder</code> at the target bitrate. VP9 or VP8 depending on browser. Lower quality control but universally supported.</p>
					<div class="tier-tags"><span>All browsers</span><span>VP9 / VP8</span></div>
				</div>
			</div>

			<h3>FFmpeg encoding options</h3>
			<div class="table-wrap">
				<table>
					<thead><tr><th>Option</th><th>Description</th><th>Range</th></tr></thead>
					<tbody>
						<tr><td>CRF</td><td>Constant Rate Factor — quality-based encoding. Lower = better quality, larger file.</td><td>18–35 (mapped from 20–99%)</td></tr>
						<tr><td>Bitrate</td><td>Target average bitrate in kbps. Use for streaming/upload size requirements.</td><td>100–50,000 kbps</td></tr>
						<tr><td>Target size</td><td>Estimates required bitrate from file duration and compresses accordingly.</td><td>Any MB value</td></tr>
						<tr><td>Preset</td><td>Speed vs compression tradeoff. Slower = smaller file at same quality.</td><td>ultrafast / fast / medium / slow</td></tr>
					</tbody>
				</table>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="pdf" class="doc-section">
			<div class="section-badge">📄 PDF</div>
			<h2>PDF compression</h2>
			<p>PDF compression works by re-rendering each page as a compressed image and reassembling a valid PDF. This is a destructive operation — text becomes rasterised — but produces reliable size reduction for scanned documents, presentations, and image-heavy PDFs.</p>

			<div class="pipeline">
				<div class="pipe-step">
					<div class="ps-num">1</div>
					<div><strong>Load PDF.js</strong><span>Loaded from cdnjs CDN on first use. The worker thread handles parsing.</span></div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">2</div>
					<div><strong>Render pages</strong><span>Each page rendered to a Canvas at the configured scale (1.2×–2.5×). White background added for transparent pages.</span></div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">3</div>
					<div><strong>Encode pages</strong><span>Each canvas exported as JPEG (default) or PNG. Quality binary-search applied per-page in target-size mode.</span></div>
				</div>
				<div class="pipe-step">
					<div class="ps-num">4</div>
					<div><strong>Assemble PDF</strong><span>A hand-built minimal PDF 1.5 container with embedded image XObjects. No external PDF library needed for output.</span></div>
				</div>
			</div>

			<h3>Render scale guide</h3>
			<div class="table-wrap">
				<table>
					<thead><tr><th>Scale</th><th>Use case</th><th>File size</th></tr></thead>
					<tbody>
						<tr><td>1.2×</td><td>Draft, maximum compression, reading only</td><td>Smallest</td></tr>
						<tr><td>1.5×</td><td>Standard document sharing</td><td>Small</td></tr>
						<tr><td>1.8×</td><td>Recommended — good balance of quality and size</td><td>Medium</td></tr>
						<tr><td>2.5×</td><td>Near-print quality, archiving</td><td>Large</td></tr>
					</tbody>
				</table>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="hardware" class="doc-section">
			<div class="section-badge">⚡ Hardware</div>
			<h2>Hardware acceleration</h2>
			<p>Compressly uses hardware acceleration wherever the browser exposes it. Here's what actually happens at the hardware level:</p>

			<div class="hw-grid">
				<div class="hw-card">
					<div class="hw-icon">🖼️</div>
					<h3>Image decode</h3>
					<p><code>createImageBitmap()</code> invokes the OS image decoder — on Windows this is WIC (Windows Imaging Component), on macOS/iOS it's ImageIO. Both use GPU hardware for JPEG/HEIC decode on Apple Silicon and recent Intel/AMD iGPUs.</p>
				</div>
				<div class="hw-card">
					<div class="hw-icon">🎨</div>
					<h3>Canvas rendering</h3>
					<p>OffscreenCanvas drawing is GPU-composited through the browser's Skia/Metal/D3D backend. On Chrome, this uses the GPU process with hardware rasterisation.</p>
				</div>
				<div class="hw-card">
					<div class="hw-icon">🎬</div>
					<h3>Video encode (WebCodecs)</h3>
					<p>When WebCodecs is used, <code>hardwareAcceleration: 'prefer-hardware'</code> routes through the browser's platform encoder API — <strong>Intel QSV</strong> (Quick Sync Video), <strong>AMD VCE</strong> (Video Coding Engine), or <strong>NVIDIA NVENC</strong> via OS-level abstraction (D3D11VA on Windows, VideoToolbox on macOS, VAAPI on Linux).</p>
				</div>
				<div class="hw-card">
					<div class="hw-icon">⚙️</div>
					<h3>FFmpeg.wasm SIMD</h3>
					<p>FFmpeg.wasm uses WebAssembly SIMD instructions (128-bit SIMD equivalent to SSE4.1/NEON). libx264 and libvpx both ship SIMD-optimised paths that significantly outperform scalar code — roughly 2–4× faster on modern CPUs.</p>
				</div>
			</div>

			<div class="compat-table">
				<h3>Browser compatibility</h3>
				<div class="table-wrap">
					<table>
						<thead><tr><th>Feature</th><th>Chrome</th><th>Safari</th><th>Firefox</th><th>Edge</th></tr></thead>
						<tbody>
							<tr><td>Image compression</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
							<tr><td>AVIF encode</td><td>✅ 94+</td><td>✅ 16+</td><td>❌</td><td>✅ 94+</td></tr>
							<tr><td>OffscreenCanvas</td><td>✅</td><td>✅ 16.4+</td><td>✅</td><td>✅</td></tr>
							<tr><td>PDF compression</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
							<tr><td>FFmpeg.wasm (ST)</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
							<tr><td>FFmpeg.wasm (MT)</td><td>✅</td><td>✅ 16.4+</td><td>✅</td><td>✅</td></tr>
							<tr><td>WebCodecs (GPU)</td><td>✅ 94+</td><td>✅ 16.4+</td><td>❌</td><td>✅ 94+</td></tr>
							<tr><td>MediaRecorder</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<div class="section-divider"></div>

		<section id="opensource" class="doc-section">
			<div class="section-badge open">Open source</div>
			<h2>Open source</h2>
			<p>Compressly is MIT licensed and fully open source. All compression logic, UI code, and build configuration is on GitHub.</p>

			<div class="os-cards">
				<a href="https://github.com/ADJ189/compressly" target="_blank" rel="noopener" class="os-card">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
					<div>
						<strong>Source code</strong>
						<span>github.com/ADJ189/compressly</span>
					</div>
				</a>
				<a href="https://github.com/ADJ189/compressly/wiki" target="_blank" rel="noopener" class="os-card">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
					<div>
						<strong>Wiki</strong>
						<span>Detailed guides & API reference</span>
					</div>
				</a>
				<a href="https://github.com/ADJ189/compressly/issues" target="_blank" rel="noopener" class="os-card">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<div>
						<strong>Issues & feedback</strong>
						<span>Report bugs, request features</span>
					</div>
				</a>
			</div>

			<h3>Contributing</h3>
			<div class="code-block">
				<div class="cb-header"><span>Getting started</span></div>
				<pre><code># Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/compressly
cd compressly
npm install
npm run dev

# Make your changes, then open a PR against main</code></pre>
			</div>

			<h3>Roadmap</h3>
			<div class="roadmap">
				<div class="rm-item done"><span class="rm-dot done"></span>Core image compression + binary search</div>
				<div class="rm-item done"><span class="rm-dot done"></span>PDF compression via PDF.js</div>
				<div class="rm-item done"><span class="rm-dot done"></span>FFmpeg.wasm video encoding</div>
				<div class="rm-item done"><span class="rm-dot done"></span>Dark / light mode</div>
				<div class="rm-item done"><span class="rm-dot done"></span>Dedicated compress pages per format</div>
				<div class="rm-item"><span class="rm-dot"></span>mp4box.js proper MP4 muxing for WebCodecs output</div>
				<div class="rm-item"><span class="rm-dot"></span>Web Worker offloading for PDF rendering</div>
				<div class="rm-item"><span class="rm-dot"></span>ZIP batch download</div>
				<div class="rm-item"><span class="rm-dot"></span>Before/after preview comparison slider</div>
				<div class="rm-item"><span class="rm-dot"></span>GIF optimisation</div>
				<div class="rm-item"><span class="rm-dot"></span>Drag-to-reorder queue</div>
			</div>
		</section>

	</div>
</div>

<style>
	.docs-layout {
		display: grid; grid-template-columns: 220px 1fr;
		max-width: 1100px; margin: 0 auto;
		padding: 3rem 1.5rem 5rem; gap: 3rem; align-items: start;
	}

	/* SIDEBAR */
	.sidebar { position: sticky; top: 80px; }
	.sidebar-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-4); margin-bottom: 0.75rem; font-family: var(--mono); }
	.sidebar-nav { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 1.5rem; }
	.sn-link { padding: 0.38rem 0.75rem; border-radius: 7px; font-size: 0.875rem; font-weight: 500; color: var(--text-3); transition: var(--transition); border-left: 2px solid transparent; }
	.sn-link:hover { color: var(--text); background: var(--bg2); }
	.sn-link.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-soft); font-weight: 600; }
	.sidebar-links { display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px solid var(--border); padding-top: 1rem; }
	.ext-link { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-3); padding: 0.3rem 0.5rem; border-radius: 6px; transition: var(--transition); }
	.ext-link:hover { color: var(--accent); background: var(--bg2); }

	/* CONTENT */
	.docs-content { min-width: 0; }
	.doc-section { padding: 0.5rem 0 1rem; }
	.section-divider { height: 1px; background: var(--border); margin: 2.5rem 0; }
	.section-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.7rem; background: var(--accent-soft); border: 1px solid rgba(59,91,219,0.15); border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: var(--accent); margin-bottom: 0.85rem; font-family: var(--mono); }
	.section-badge.privacy { background: rgba(47,158,68,0.08); border-color: rgba(47,158,68,0.2); color: #2f9e44; }
	.section-badge.open { background: rgba(112,72,232,0.08); border-color: rgba(112,72,232,0.2); color: #7048e8; }

	.doc-section h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text); margin-bottom: 0.85rem; }
	.doc-section h2 { font-size: 1.25rem; font-weight: 700; color: var(--text); margin: 2rem 0 0.75rem; letter-spacing: -0.015em; }
	.doc-section h3 { font-size: 0.975rem; font-weight: 700; color: var(--text); margin: 1.5rem 0 0.6rem; }
	.doc-section p, .lead { font-size: 0.925rem; color: var(--text-3); line-height: 1.8; margin-bottom: 0.85rem; }
	.lead { font-size: 1rem; }
	.doc-section strong { color: var(--text-2); }
	.doc-section code { font-family: var(--mono); font-size: 0.82em; background: var(--bg2); border: 1px solid var(--border); padding: 0.12em 0.4em; border-radius: 4px; color: var(--accent3); }

	/* INFO GRID */
	.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin-bottom: 1.5rem; }
	.info-card { padding: 0.85rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
	.ic-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-4); font-family: var(--mono); margin-bottom: 0.3rem; }
	.ic-val { font-size: 0.82rem; font-weight: 600; color: var(--text); }

	/* CODE BLOCK */
	.code-block { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 1.25rem; }
	.cb-header { padding: 0.5rem 1rem; background: var(--bg2); border-bottom: 1px solid var(--border); font-size: 0.72rem; font-family: var(--mono); color: var(--text-4); }
	.code-block pre { padding: 1rem 1.25rem; margin: 0; overflow-x: auto; }
	.code-block code { background: none; border: none; padding: 0; font-size: 0.82rem; color: var(--text-2); line-height: 1.7; }

	/* FEATURE LIST */
	.feature-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
	.fl-item { display: flex; gap: 0.85rem; align-items: flex-start; padding: 0.9rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
	.fl-icon { width: 22px; height: 22px; background: rgba(47,158,68,0.12); border: 1px solid rgba(47,158,68,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #2f9e44; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
	.fl-item div { font-size: 0.875rem; color: var(--text-3); line-height: 1.65; }
	.fl-item strong { color: var(--text-2); display: block; margin-bottom: 0.2rem; }

	/* PIPELINE */
	.pipeline { display: flex; flex-direction: column; gap: 0; margin-bottom: 1.25rem; }
	.pipe-step { display: flex; gap: 1rem; align-items: flex-start; padding: 0.85rem 0; border-bottom: 1px solid var(--border); }
	.pipe-step:last-child { border-bottom: none; }
	.ps-num { width: 26px; height: 26px; background: var(--accent-soft); border: 1.5px solid rgba(59,91,219,0.25); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--accent); flex-shrink: 0; font-family: var(--mono); }
	.pipe-step div { display: flex; flex-direction: column; gap: 0.2rem; }
	.pipe-step strong { font-size: 0.875rem; font-weight: 700; color: var(--text); }
	.pipe-step span { font-size: 0.82rem; color: var(--text-3); line-height: 1.6; }

	/* TABLE */
	.table-wrap { overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--border); margin-bottom: 1.25rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
	thead { background: var(--bg2); }
	th { padding: 0.65rem 1rem; text-align: left; font-weight: 700; color: var(--text); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); }
	td { padding: 0.65rem 1rem; color: var(--text-3); border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.5; }
	tr:last-child td { border-bottom: none; }
	tr:nth-child(even) td { background: var(--bg); }

	/* TIER CARDS */
	.tier-cards { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
	.tier-card { padding: 1.25rem 1.4rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
	.tier-card.primary-tier { border-color: rgba(59,91,219,0.25); background: var(--accent-soft); }
	.tier-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; }
	.tier-badge { padding: 0.15rem 0.55rem; border-radius: 5px; font-size: 0.7rem; font-weight: 700; font-family: var(--mono); background: var(--accent); color: white; }
	.tier-badge.secondary { background: var(--bg3); color: var(--text-3); }
	.tier-badge.tertiary { background: var(--bg3); color: var(--text-4); }
	.tier-header strong { font-size: 0.95rem; font-weight: 700; color: var(--text); }
	.tier-card p { font-size: 0.85rem; color: var(--text-3); line-height: 1.7; margin-bottom: 0.75rem; }
	.tier-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.tier-tags span { padding: 0.15rem 0.55rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 5px; font-size: 0.7rem; font-family: var(--mono); color: var(--text-3); }

	/* HARDWARE GRID */
	.hw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
	.hw-card { padding: 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
	.hw-icon { font-size: 1.5rem; margin-bottom: 0.65rem; }
	.hw-card h3 { font-size: 0.9rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
	.hw-card p { font-size: 0.82rem; color: var(--text-3); line-height: 1.7; margin: 0; }

	/* OPEN SOURCE */
	.os-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
	.os-card { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); transition: var(--transition); color: var(--text); }
	.os-card:hover { border-color: var(--border-mid); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
	.os-card svg { flex-shrink: 0; color: var(--text-3); }
	.os-card strong { display: block; font-size: 0.875rem; font-weight: 700; }
	.os-card span { font-size: 0.75rem; color: var(--text-3); font-family: var(--mono); }

	/* ROADMAP */
	.roadmap { display: flex; flex-direction: column; gap: 0.5rem; }
	.rm-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; color: var(--text-3); }
	.rm-item.done { color: var(--text-2); }
	.rm-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-mid); flex-shrink: 0; }
	.rm-dot.done { background: #2f9e44; box-shadow: 0 0 0 3px rgba(47,158,68,0.15); }

	/* COMPAT */
	.compat-table { margin-top: 1.5rem; }

	@media (max-width: 900px) {
		.docs-layout { grid-template-columns: 1fr; }
		.sidebar { position: static; display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; }
		.sidebar-nav { flex-direction: row; flex-wrap: wrap; }
		.sidebar-label { display: none; }
		.info-grid { grid-template-columns: repeat(2, 1fr); }
		.hw-grid { grid-template-columns: 1fr; }
		.os-cards { grid-template-columns: 1fr; }
	}
</style>
