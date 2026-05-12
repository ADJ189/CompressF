<script lang="ts">
	const features = [
		{
			icon: '🖼️',
			title: 'Images',
			desc: 'JPEG, PNG, WebP, AVIF. Quality slider or hit an exact target size using smart binary search.',
			tags: ['JPEG', 'PNG', 'WebP', 'AVIF'],
			color: 'var(--accent)'
		},
		{
			icon: '📄',
			title: 'PDFs',
			desc: 'Re-encodes embedded pages as compressed images. Keeps everything readable, strips the bulk.',
			tags: ['PDF', 'Lossless-friendly'],
			color: '#0c8599'
		},
		{
			icon: '🎬',
			title: 'Video',
			desc: 'Hardware-accelerated encoding via WebCodecs on Chrome and Safari. MediaRecorder fallback for everyone else.',
			tags: ['MP4', 'WebM', 'WebCodecs'],
			color: '#7048e8'
		}
	];
</script>

<svelte:head>
	<title>Compressly — Browser-based file compression</title>
</svelte:head>

<div class="page">

	<!-- Hero -->
	<section class="hero">
		<div class="hero-inner">
			<div class="hero-label">
				<span class="dot"></span>
				Draft 1 · Alpha · All-browser, all-device
			</div>

			<h1 class="hero-title">
				Smaller files.<br>No compromises.
			</h1>

			<p class="hero-body">
				Compress images, PDFs, and video entirely in your browser.
				Hardware-accelerated where possible. Zero uploads, zero tracking.
				Your files stay on your device — always.
			</p>

			<div class="hero-actions">
				<a href="/compress" class="btn-primary">
					Start compressing
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
				</a>
				<a href="/about" class="btn-ghost">How it works</a>
			</div>

			<div class="format-row">
				{#each ['JPEG', 'PNG', 'WebP', 'AVIF', 'PDF', 'MP4', 'WebM'] as f}
					<span class="format-chip">{f}</span>
				{/each}
			</div>
		</div>

		<div class="hero-visual">
			<div class="visual-card">
				<div class="vc-header">
					<div class="vc-dots">
						<span></span><span></span><span></span>
					</div>
					<span class="vc-title">compressor</span>
				</div>
				<div class="vc-files">
					<div class="vc-file done">
						<span class="vc-file-icon">🖼️</span>
						<div class="vc-file-info">
							<span class="vc-name">photo_holiday.jpg</span>
							<span class="vc-meta">4.2 MB → 380 KB</span>
						</div>
						<span class="vc-badge saved">−91%</span>
					</div>
					<div class="vc-file done">
						<span class="vc-file-icon">📄</span>
						<div class="vc-file-info">
							<span class="vc-name">report_Q4_2025.pdf</span>
							<span class="vc-meta">18.3 MB → 2.1 MB</span>
						</div>
						<span class="vc-badge saved">−88%</span>
					</div>
					<div class="vc-file compressing">
						<span class="vc-file-icon">🎬</span>
						<div class="vc-file-info">
							<span class="vc-name">demo_reel.mp4</span>
							<div class="vc-progress-bar">
								<div class="vc-progress-fill" style="width: 62%"></div>
							</div>
						</div>
						<span class="vc-badge compressing">62%</span>
					</div>
				</div>
				<div class="vc-footer">
					<span class="vc-privacy">🔒 Nothing leaves your browser</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Stats -->
	<section class="stats">
		<div class="stats-inner">
			<div class="stat-item">
				<div class="stat-num">100%</div>
				<div class="stat-lbl">Browser-based</div>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<div class="stat-num">0 bytes</div>
				<div class="stat-lbl">Uploaded anywhere</div>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<div class="stat-num">3 types</div>
				<div class="stat-lbl">Images, PDF, Video</div>
			</div>
			<div class="stat-divider"></div>
			<div class="stat-item">
				<div class="stat-num">GPU ⚡</div>
				<div class="stat-lbl">Hardware acceleration</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section class="features">
		<div class="section-wrap">
			<div class="section-label">What you can compress</div>
			<h2 class="section-title">Three formats. One tool.</h2>
			<p class="section-body">
				Every format handled with the right browser API for the job —
				Canvas for images, PDF.js for documents, WebCodecs for video.
			</p>
			<div class="features-grid">
				{#each features as f}
					<div class="feat-card" style="--card-accent: {f.color}">
						<div class="feat-icon">{f.icon}</div>
						<h3>{f.title}</h3>
						<p>{f.desc}</p>
						<div class="feat-tags">
							{#each f.tags as tag}
								<span>{tag}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="how">
		<div class="section-wrap">
			<div class="section-label">Process</div>
			<h2 class="section-title">Three steps, done.</h2>
			<div class="steps-row">
				<div class="step-card">
					<div class="step-n">1</div>
					<h3>Drop your file</h3>
					<p>Drag, drop, or browse. Images, PDFs, and video all accepted at once.</p>
				</div>
				<div class="step-connector">
					<svg width="32" height="12" viewBox="0 0 32 12" fill="none"><path d="M0 6h28M22 1l6 5-6 5" stroke="var(--border-mid)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</div>
				<div class="step-card">
					<div class="step-n">2</div>
					<h3>Pick your target</h3>
					<p>Set quality, choose format, or enter an exact target size in KB or MB.</p>
				</div>
				<div class="step-connector">
					<svg width="32" height="12" viewBox="0 0 32 12" fill="none"><path d="M0 6h28M22 1l6 5-6 5" stroke="var(--border-mid)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</div>
				<div class="step-card">
					<div class="step-n">3</div>
					<h3>Download instantly</h3>
					<p>Your compressed file downloads right away. Nothing is ever saved or sent anywhere.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Privacy callout -->
	<section class="privacy-callout">
		<div class="section-wrap">
			<div class="callout-card">
				<div class="callout-icon">🔒</div>
				<div class="callout-text">
					<h3>Private by design, not by policy</h3>
					<p>
						There's no server to send files to. Compression runs using browser APIs — Canvas, WebCodecs,
						OffscreenCanvas — entirely inside your tab. Close the tab and everything is gone.
						We don't collect anything because there's nothing to collect.
					</p>
				</div>
				<a href="/compress" class="btn-primary">Try it now</a>
			</div>
		</div>
	</section>

</div>

<style>
	.page { width: 100%; }

	/* ── HERO ───────────────────────────────────────── */
	.hero {
		max-width: 1100px; margin: 0 auto;
		padding: 5rem 2rem 4rem;
		display: grid; grid-template-columns: 1fr 1fr;
		gap: 4rem; align-items: center;
	}

	.hero-label {
		display: inline-flex; align-items: center; gap: 0.5rem;
		font-size: 0.8rem; font-family: var(--mono);
		color: var(--text-3); margin-bottom: 1.5rem;
	}
	.dot {
		width: 7px; height: 7px; background: #37b24d;
		border-radius: 50%; box-shadow: 0 0 0 3px rgba(55,178,77,0.2);
		animation: pulse 2s ease-in-out infinite;
	}
	@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

	.hero-title {
		font-size: clamp(2.4rem, 5vw, 3.8rem);
		font-weight: 800; line-height: 1.1;
		letter-spacing: -0.03em; color: var(--text);
		margin-bottom: 1.25rem;
	}

	.hero-body {
		font-size: 1.05rem; color: var(--text-3);
		line-height: 1.75; margin-bottom: 2rem; max-width: 480px;
	}

	.hero-actions {
		display: flex; gap: 0.75rem; align-items: center;
		margin-bottom: 2rem; flex-wrap: wrap;
	}

	.btn-primary {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.7rem 1.5rem; background: var(--accent); color: white;
		border-radius: var(--radius); font-weight: 600; font-size: 0.95rem;
		border: none; transition: var(--transition);
		box-shadow: 0 1px 3px rgba(59,91,219,0.25);
	}
	.btn-primary:hover {
		background: var(--accent-mid);
		box-shadow: 0 4px 14px rgba(59,91,219,0.35);
		transform: translateY(-1px);
	}

	.btn-ghost {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.7rem 1.5rem; background: transparent;
		border: 1px solid var(--border-mid); color: var(--text-2);
		border-radius: var(--radius); font-weight: 600; font-size: 0.95rem;
		transition: var(--transition);
	}
	.btn-ghost:hover { border-color: var(--text-3); background: var(--bg2); color: var(--text); }

	.format-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.format-chip {
		padding: 0.2rem 0.65rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: 6px;
		font-size: 0.73rem; font-family: var(--mono); color: var(--text-3);
	}

	/* ── HERO VISUAL ────────────────────────────────── */
	.hero-visual { display: flex; justify-content: center; }

	.visual-card {
		width: 100%; max-width: 380px;
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);
		overflow: hidden;
	}
	.vc-header {
		padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--border);
		display: flex; align-items: center; gap: 0.75rem;
		background: var(--bg2);
	}
	.vc-dots { display: flex; gap: 5px; }
	.vc-dots span {
		width: 11px; height: 11px; border-radius: 50%;
		background: var(--border-mid);
	}
	.vc-dots span:nth-child(1) { background: #ff5f56; }
	.vc-dots span:nth-child(2) { background: #ffbd2e; }
	.vc-dots span:nth-child(3) { background: #27c93f; }
	.vc-title { font-size: 0.78rem; font-family: var(--mono); color: var(--text-4); margin-left: 0.25rem; }

	.vc-files { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }

	.vc-file {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.7rem 0.85rem; border-radius: 10px;
		border: 1px solid var(--border); background: var(--bg);
		transition: var(--transition);
	}
	.vc-file.done { border-color: rgba(55,178,77,0.25); background: rgba(55,178,77,0.04); }
	.vc-file.compressing { border-color: rgba(59,91,219,0.2); background: var(--accent-soft); }
	.vc-file-icon { font-size: 1.25rem; flex-shrink: 0; }
	.vc-file-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.25rem; }
	.vc-name { font-size: 0.78rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.vc-meta { font-size: 0.72rem; font-family: var(--mono); color: var(--text-3); }
	.vc-progress-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 2px; }
	.vc-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }

	.vc-badge {
		font-size: 0.72rem; font-family: var(--mono); font-weight: 600;
		padding: 0.15rem 0.5rem; border-radius: 5px; flex-shrink: 0;
	}
	.vc-badge.saved { background: rgba(55,178,77,0.12); color: #2f9e44; }
	.vc-badge.compressing { background: var(--accent-soft); color: var(--accent); }

	.vc-footer {
		padding: 0.75rem 1rem; border-top: 1px solid var(--border);
		background: var(--bg2);
	}
	.vc-privacy { font-size: 0.75rem; font-family: var(--mono); color: var(--text-4); }

	/* ── STATS ──────────────────────────────────────── */
	.stats {
		background: var(--surface); border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}
	.stats-inner {
		max-width: 860px; margin: 0 auto; padding: 2rem;
		display: flex; align-items: center; justify-content: center;
		gap: 0; flex-wrap: wrap;
	}
	.stat-item { text-align: center; padding: 0.5rem 2.5rem; }
	.stat-num { font-size: 1.6rem; font-weight: 800; color: var(--accent); letter-spacing: -0.02em; }
	.stat-lbl { font-size: 0.8rem; color: var(--text-3); margin-top: 0.15rem; }
	.stat-divider { width: 1px; height: 40px; background: var(--border); flex-shrink: 0; }

	/* ── SHARED SECTION STYLES ─────────────────────── */
	.section-wrap { max-width: 920px; margin: 0 auto; padding: 5rem 2rem; }
	.section-label {
		font-size: 0.78rem; font-family: var(--mono);
		color: var(--accent); font-weight: 500;
		text-transform: uppercase; letter-spacing: 0.08em;
		margin-bottom: 0.75rem;
	}
	.section-title {
		font-size: clamp(1.75rem, 3.5vw, 2.5rem);
		font-weight: 800; letter-spacing: -0.025em;
		color: var(--text); margin-bottom: 1rem;
	}
	.section-body { font-size: 1rem; color: var(--text-3); line-height: 1.75; max-width: 520px; margin-bottom: 3rem; }

	/* ── FEATURES ───────────────────────────────────── */
	.features-grid {
		display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
	}
	.feat-card {
		padding: 1.75rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: var(--radius-lg);
		transition: var(--transition); position: relative;
	}
	.feat-card::after {
		content: ''; position: absolute;
		top: 0; left: 1.5rem; right: 1.5rem; height: 2px;
		background: var(--card-accent); border-radius: 0 0 4px 4px; opacity: 0.7;
	}
	.feat-card:hover {
		box-shadow: var(--shadow-md); transform: translateY(-2px);
		border-color: var(--border-mid);
	}
	.feat-icon { font-size: 1.75rem; margin-bottom: 0.85rem; display: block; }
	.feat-card h3 { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
	.feat-card p { font-size: 0.875rem; color: var(--text-3); line-height: 1.65; margin-bottom: 1.1rem; }
	.feat-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
	.feat-tags span {
		padding: 0.18rem 0.55rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: 5px;
		font-size: 0.7rem; font-family: var(--mono); color: var(--text-3);
	}

	/* ── HOW IT WORKS ───────────────────────────────── */
	.how { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
	.steps-row {
		display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
	}
	.step-card {
		flex: 1; min-width: 200px; max-width: 260px;
		padding: 1.5rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: var(--radius-lg);
	}
	.step-n {
		width: 32px; height: 32px; background: var(--accent-soft);
		border: 1.5px solid var(--accent); border-radius: 8px;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.85rem; font-weight: 700; color: var(--accent);
		margin-bottom: 0.85rem;
	}
	.step-card h3 { font-size: 0.95rem; font-weight: 700; color: var(--text); margin-bottom: 0.4rem; }
	.step-card p { font-size: 0.83rem; color: var(--text-3); line-height: 1.6; }
	.step-connector { flex-shrink: 0; }

	/* ── PRIVACY CALLOUT ────────────────────────────── */
	.callout-card {
		display: flex; align-items: center; gap: 2rem;
		padding: 2.5rem; background: var(--accent-soft);
		border: 1px solid rgba(59,91,219,0.2); border-radius: var(--radius-xl);
		flex-wrap: wrap;
	}
	.callout-icon { font-size: 2.5rem; flex-shrink: 0; }
	.callout-text { flex: 1; min-width: 260px; }
	.callout-text h3 { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem; }
	.callout-text p { font-size: 0.9rem; color: var(--text-3); line-height: 1.7; }

	@media (max-width: 860px) {
		.hero { grid-template-columns: 1fr; padding: 3rem 1.5rem 2.5rem; gap: 2.5rem; }
		.hero-visual { order: -1; }
		.features-grid { grid-template-columns: 1fr; }
		.steps-row { flex-direction: column; align-items: flex-start; }
		.step-connector { transform: rotate(90deg); }
		.stats-inner { gap: 0; }
		.stat-divider { display: none; }
		.stat-item { min-width: 50%; }
		.callout-card { flex-direction: column; gap: 1.25rem; }
	}
</style>
