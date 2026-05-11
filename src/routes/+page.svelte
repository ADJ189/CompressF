<script lang="ts">
	const features = [
		{
			icon: '🖼️',
			title: 'Image Compression',
			desc: 'JPEG, PNG, WebP, AVIF — compress with quality control or target a specific file size. Canvas API + hardware acceleration.',
			tags: ['JPEG', 'PNG', 'WebP', 'AVIF'],
			color: '#6c63ff'
		},
		{
			icon: '📄',
			title: 'PDF Optimization',
			desc: 'Reduce PDF size by re-encoding embedded images and stripping metadata. Keep it readable, cut the bloat.',
			tags: ['PDF', 'Lossless', 'Metadata'],
			color: '#ff6b6b'
		},
		{
			icon: '🎬',
			title: 'Video Encoding',
			desc: 'Compress MP4/WebM video with target bitrate control. Hardware-accelerated encoding via WebCodecs API where supported.',
			tags: ['MP4', 'WebM', 'WebCodecs', 'HW Accel'],
			color: '#00e5ff'
		},
		{
			icon: '🎯',
			title: 'Target File Size',
			desc: 'Set an exact target size in KB or MB and we\'ll find the optimal quality setting automatically.',
			tags: ['Smart', 'Auto-Quality'],
			color: '#ffd166'
		},
		{
			icon: '🔒',
			title: '100% Private',
			desc: 'No file uploads, no servers, no tracking. Every byte stays in your browser tab. Always.',
			tags: ['Local', 'No Upload', 'Private'],
			color: '#06d6a0'
		},
		{
			icon: '⚡',
			title: 'Hardware Accelerated',
			desc: 'Leverages WebCodecs, OffscreenCanvas, and WebWorkers for GPU-accelerated processing on supported devices.',
			tags: ['WebWorker', 'OffscreenCanvas', 'GPU'],
			color: '#ff9a3c'
		}
	];

	const stats = [
		{ value: '100%', label: 'Browser-based' },
		{ value: '0 bytes', label: 'Uploaded to servers' },
		{ value: '3 types', label: 'File formats' },
		{ value: '∞', label: 'Files processed' }
	];
</script>

<svelte:head>
	<title>Compressly — Browser-based File Compression</title>
</svelte:head>

<div class="page">
	<!-- Hero -->
	<section class="hero">
		<div class="hero-bg">
			<div class="orb orb1"></div>
			<div class="orb orb2"></div>
			<div class="orb orb3"></div>
			<div class="grid-lines"></div>
		</div>
		<div class="hero-inner">
			<div class="hero-badge">
				<span class="badge-dot"></span>
				Alpha Release · Draft 1
			</div>
			<h1 class="hero-title">
				Compress anything.<br />
				<span class="gradient-text">Keep everything private.</span>
			</h1>
			<p class="hero-sub">
				Images, PDFs, and video — compressed entirely in your browser using hardware-accelerated APIs.
				No uploads. No servers. No tracking. Just smaller files.
			</p>
			<div class="hero-actions">
				<a href="/compress" class="btn-primary">
					<span>Start Compressing</span>
					<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
				</a>
				<a href="/about" class="btn-ghost">How it works</a>
			</div>
			<div class="hero-formats">
				{#each ['JPEG', 'PNG', 'WebP', 'AVIF', 'PDF', 'MP4', 'WebM'] as fmt}
					<span class="format-pill">{fmt}</span>
				{/each}
			</div>
		</div>
	</section>

	<!-- Stats -->
	<section class="stats-bar">
		{#each stats as stat}
			<div class="stat">
				<div class="stat-value">{stat.value}</div>
				<div class="stat-label">{stat.label}</div>
			</div>
		{/each}
	</section>

	<!-- Features -->
	<section class="features">
		<div class="section-inner">
			<div class="section-header">
				<h2 class="section-title">Everything you need to compress files</h2>
				<p class="section-sub">Powered by modern browser APIs — Canvas, WebCodecs, WebWorkers, and OffscreenCanvas.</p>
			</div>
			<div class="features-grid">
				{#each features as feat}
					<div class="feature-card" style="--card-color: {feat.color}">
						<div class="card-icon">{feat.icon}</div>
						<h3 class="card-title">{feat.title}</h3>
						<p class="card-desc">{feat.desc}</p>
						<div class="card-tags">
							{#each feat.tags as tag}
								<span class="tag">{tag}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="how">
		<div class="section-inner">
			<div class="section-header">
				<h2 class="section-title">How it works</h2>
			</div>
			<div class="steps">
				<div class="step">
					<div class="step-num">01</div>
					<h3>Drop your file</h3>
					<p>Drag and drop or pick from your device. Images, PDFs, and video all accepted.</p>
				</div>
				<div class="step-arrow">→</div>
				<div class="step">
					<div class="step-num">02</div>
					<h3>Set your target</h3>
					<p>Choose quality, format, or enter an exact target file size in KB or MB.</p>
				</div>
				<div class="step-arrow">→</div>
				<div class="step">
					<div class="step-num">03</div>
					<h3>Download instantly</h3>
					<p>Compressed file downloads immediately. Nothing ever leaves your browser.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="cta-section">
		<div class="cta-inner">
			<div class="cta-glow"></div>
			<h2>Ready to compress?</h2>
			<p>No sign-up required. Works on any modern browser, any device.</p>
			<a href="/compress" class="btn-primary large">
				Open the Compressor
				<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
			</a>
		</div>
	</section>
</div>

<style>
	.page { width: 100%; }

	/* HERO */
	.hero {
		position: relative; min-height: 90vh;
		display: flex; align-items: center; justify-content: center;
		overflow: hidden; padding: 4rem 2rem;
	}
	.hero-bg { position: absolute; inset: 0; pointer-events: none; }
	.orb {
		position: absolute; border-radius: 50%;
		filter: blur(80px); opacity: 0.15;
		animation: drift 8s ease-in-out infinite;
	}
	.orb1 { width: 600px; height: 600px; background: var(--accent); top: -100px; left: -100px; }
	.orb2 { width: 400px; height: 400px; background: #ff6b6b; bottom: -50px; right: 10%; animation-delay: -3s; }
	.orb3 { width: 300px; height: 300px; background: var(--accent3); top: 40%; left: 50%; animation-delay: -6s; }

	.grid-lines {
		position: absolute; inset: 0;
		background-image:
			linear-gradient(rgba(108,99,255,0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(108,99,255,0.04) 1px, transparent 1px);
		background-size: 60px 60px;
	}

	@keyframes drift {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33% { transform: translate(30px, -20px) scale(1.05); }
		66% { transform: translate(-20px, 30px) scale(0.95); }
	}

	.hero-inner {
		position: relative; z-index: 1;
		max-width: 780px; margin: 0 auto; text-align: center;
	}
	.hero-badge {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.35rem 1rem; background: var(--surface);
		border: 1px solid var(--border-bright); border-radius: 100px;
		font-size: 0.78rem; font-family: var(--mono); color: var(--text-dim);
		margin-bottom: 2rem;
	}
	.badge-dot {
		width: 7px; height: 7px; background: #06d6a0;
		border-radius: 50%; box-shadow: 0 0 6px #06d6a0;
		animation: pulse 2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
	}

	.hero-title {
		font-size: clamp(2.8rem, 7vw, 5.5rem);
		font-weight: 800; line-height: 1.05;
		letter-spacing: -0.03em; margin-bottom: 1.5rem;
	}
	.gradient-text {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent3) 100%);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.hero-sub {
		font-size: 1.15rem; color: var(--text-dim); max-width: 560px;
		margin: 0 auto 2.5rem; line-height: 1.7;
	}
	.hero-actions { display: flex; gap: 1rem; justify-content: center; margin-bottom: 2.5rem; flex-wrap: wrap; }

	.btn-primary {
		display: inline-flex; align-items: center; gap: 0.6rem;
		padding: 0.85rem 2rem; background: var(--accent); color: white;
		border-radius: var(--radius); font-weight: 700; font-size: 1rem;
		transition: var(--transition); border: none;
	}
	.btn-primary:hover { background: #7d75ff; box-shadow: 0 0 30px var(--accent-glow); transform: translateY(-1px); }
	.btn-primary.large { padding: 1rem 2.4rem; font-size: 1.05rem; }

	.btn-ghost {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.85rem 2rem; background: transparent; color: var(--text-dim);
		border: 1px solid var(--border-bright); border-radius: var(--radius);
		font-weight: 600; font-size: 1rem; transition: var(--transition);
	}
	.btn-ghost:hover { border-color: var(--accent); color: var(--text); background: var(--surface); }

	.hero-formats { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
	.format-pill {
		padding: 0.25rem 0.75rem; background: var(--bg3);
		border: 1px solid var(--border); border-radius: 100px;
		font-size: 0.75rem; font-family: var(--mono); color: var(--text-dim);
	}

	/* STATS */
	.stats-bar {
		display: flex; justify-content: center; gap: 0;
		border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
		background: var(--bg2);
	}
	.stat {
		flex: 1; max-width: 220px; text-align: center;
		padding: 1.8rem 1rem;
		border-right: 1px solid var(--border);
	}
	.stat:last-child { border-right: none; }
	.stat-value { font-size: 1.8rem; font-weight: 800; color: var(--accent); letter-spacing: -0.02em; }
	.stat-label { font-size: 0.8rem; color: var(--text-dim); font-family: var(--mono); margin-top: 0.25rem; }

	/* FEATURES */
	.features { padding: 6rem 2rem; }
	.section-inner { max-width: 1100px; margin: 0 auto; }
	.section-header { text-align: center; margin-bottom: 3.5rem; }
	.section-title { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
	.section-sub { color: var(--text-dim); font-size: 1rem; max-width: 500px; margin: 0 auto; }

	.features-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;
	}
	.feature-card {
		padding: 2rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: var(--radius-lg);
		transition: var(--transition); position: relative; overflow: hidden;
	}
	.feature-card::before {
		content: ''; position: absolute;
		top: 0; left: 0; right: 0; height: 2px;
		background: var(--card-color);
		opacity: 0.6;
	}
	.feature-card:hover {
		border-color: var(--card-color);
		background: var(--bg3);
		transform: translateY(-3px);
		box-shadow: 0 8px 30px rgba(0,0,0,0.3);
	}
	.card-icon { font-size: 2rem; margin-bottom: 1rem; display: block; }
	.card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
	.card-desc { font-size: 0.875rem; color: var(--text-dim); line-height: 1.6; margin-bottom: 1.25rem; }
	.card-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.tag {
		padding: 0.2rem 0.6rem; background: var(--surface); border-radius: 6px;
		font-size: 0.72rem; font-family: var(--mono); color: var(--text-dimmer);
	}

	/* HOW */
	.how { padding: 5rem 2rem; background: var(--bg2); border-top: 1px solid var(--border); }
	.steps {
		display: flex; align-items: center; gap: 1rem;
		justify-content: center; flex-wrap: wrap;
	}
	.step {
		flex: 1; min-width: 220px; max-width: 280px;
		background: var(--bg3); border: 1px solid var(--border);
		border-radius: var(--radius-lg); padding: 2rem 1.5rem; text-align: center;
	}
	.step-num {
		font-family: var(--mono); font-size: 2.5rem; font-weight: 300;
		color: var(--accent); opacity: 0.5; margin-bottom: 0.75rem;
	}
	.step h3 { font-weight: 700; margin-bottom: 0.5rem; }
	.step p { font-size: 0.875rem; color: var(--text-dim); line-height: 1.6; }
	.step-arrow { font-size: 1.5rem; color: var(--text-dimmer); }

	/* CTA */
	.cta-section {
		padding: 7rem 2rem; text-align: center;
		border-top: 1px solid var(--border);
	}
	.cta-inner { position: relative; max-width: 600px; margin: 0 auto; }
	.cta-glow {
		position: absolute; top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		width: 500px; height: 200px;
		background: var(--accent); filter: blur(100px); opacity: 0.08;
		pointer-events: none;
	}
	.cta-inner h2 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 1rem; }
	.cta-inner p { color: var(--text-dim); margin-bottom: 2rem; font-size: 1rem; }

	@media (max-width: 600px) {
		.stats-bar { flex-wrap: wrap; }
		.stat { border-right: none; border-bottom: 1px solid var(--border); min-width: 50%; }
		.step-arrow { transform: rotate(90deg); }
		.steps { flex-direction: column; }
	}
</style>
