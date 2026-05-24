<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressPdf } from '$lib/compressPdf';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, PdfCompressionLevel } from '$lib/types';

	let files: FileEntry[] = [];

	// iLovePDF-style presets
	let compressionLevel: PdfCompressionLevel = 'recommended';

	// Advanced settings (hidden by default, toggleable)
	let showAdvanced = false;
	let customQuality = 82;
	let renderScale = 1.8;
	let imgFormat: 'image/jpeg' | 'image/png' = 'image/jpeg';
	let targetSizeMB = '';
	let useTargetSize = false;

	const presets = [
		{
			id: 'low' as PdfCompressionLevel,
			icon: '🟢',
			label: 'Low',
			sub: 'High quality · less compression',
			detail: 'Minimal quality loss. Best for documents you\'ll print or present professionally.',
		},
		{
			id: 'recommended' as PdfCompressionLevel,
			icon: '🔵',
			label: 'Recommended',
			sub: 'Good quality · good compression',
			detail: 'The best balance. Works for most documents — reports, invoices, forms.',
		},
		{
			id: 'extreme' as PdfCompressionLevel,
			icon: '🟠',
			label: 'Extreme',
			sub: 'Less quality · high compression',
			detail: 'Maximum compression. Slight quality reduction. Good for email attachments.',
		},
	];

	function buildOptions(): CompressOptions {
		const o: CompressOptions = {
			pdfCompressionLevel: compressionLevel,
			pdfRenderScale: renderScale,
			pdfImageFormat: imgFormat,
		};
		if (useTargetSize && targetSizeMB) {
			o.targetSizeKB = parseFloat(targetSizeMB) * 1024;
		} else if (showAdvanced) {
			o.quality = customQuality / 100;
		}
		return o;
	}

	function addFiles(fs: File[]) {
		const valid = fs.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
		if (valid.length === 0) return;
		files = [...files, ...valid.map(f => ({
			id: uid(), file: f, type: 'pdf' as const,
			status: 'idle' as const, progress: 0, options: buildOptions()
		}))];
	}

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0;
		entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressPdf(entry.file, entry.options, p => {
				entry.progress = p; files = files;
			});
			entry.status = 'done';
		} catch (err: any) {
			entry.error = err.message ?? 'Compression failed';
			entry.status = 'error';
		}
		files = files;
	}

	function compressAll() {
		files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); });
	}

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace(/\.pdf$/i, '') + '_compressed.pdf'
		});
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
	}

	function getProgressLabel(pct: number): string {
		if (pct < 8)  return 'Loading PDF.js…';
		if (pct < 12) return 'Parsing PDF…';
		if (pct < 85) return `Rendering pages… ${pct}%`;
		if (pct < 98) return 'Assembling PDF…';
		return 'Done!';
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
</script>

<svelte:head>
	<title>PDF Compressor — Compressly</title>
	<link rel="icon" href="/logo-pdf.svg" type="image/svg+xml" />
	<meta name="description" content="Compress PDF files in your browser. Low, Recommended, or Extreme presets. Powered by PDF.js and pdf-lib. No upload." />
	<meta property="og:title" content="PDF Compressor — Compressly" />
	<meta property="og:description" content="Compress PDF files privately in your browser. No upload, no server." />
	<meta property="og:url" content="https://compressly-9jk.pages.dev/compress/pdf" />
	<link rel="canonical" href="https://compressly-9jk.pages.dev/compress/pdf" />
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="badge pdf">📄 PDF</span>
			<h1>PDF Compressor</h1>
		</div>
		<p class="subtitle">Runs entirely in your browser · PDF.js rendering · No upload · No server</p>
	</div>

	<!-- Compression level selector (iLovePDF style) -->
	<div class="preset-section">
		<div class="preset-label">Compression level</div>
		<div class="preset-cards">
			{#each presets as p}
				<button
					class="preset-card"
					class:selected={compressionLevel === p.id}
					on:click={() => compressionLevel = p.id}
				>
					<div class="pc-top">
						<span class="pc-icon">{p.icon}</span>
						<div class="pc-text">
							<strong>{p.label}</strong>
							<span>{p.sub}</span>
						</div>
						{#if compressionLevel === p.id}
							<svg class="pc-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
						{/if}
					</div>
					<p class="pc-detail">{p.detail}</p>
				</button>
			{/each}
		</div>
	</div>

	<!-- Target size toggle -->
	<div class="target-row">
		<label class="target-toggle">
			<input type="checkbox" bind:checked={useTargetSize} />
			<span>Compress to specific size</span>
		</label>
		{#if useTargetSize}
			<div class="target-input-row">
				<input type="number" bind:value={targetSizeMB} placeholder="Target size in MB" class="ti" min="0.1" step="0.1" />
				<span class="ti-unit">MB</span>
			</div>
		{/if}
	</div>

	<!-- Advanced settings toggle -->
	<button class="advanced-toggle" on:click={() => showAdvanced = !showAdvanced}>
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate({showAdvanced ? 90 : 0}deg); transition: transform 0.2s">
			<polyline points="9 18 15 12 9 6"/>
		</svg>
		Advanced settings
	</button>

	{#if showAdvanced}
		<div class="advanced-panel">
			<div class="row">
				<div class="field">
					<span class="label">Custom quality <strong>{customQuality}%</strong></span>
					<input type="range" min="20" max="98" bind:value={customQuality} class="slider" />
				</div>
				<div class="field">
					<span class="label">Page resolution</span>
					<select bind:value={renderScale} class="si">
						<option value={1.2}>Draft (1.2×) — smallest file</option>
						<option value={1.5}>Standard (1.5×)</option>
						<option value={1.8}>High (1.8×) — recommended</option>
						<option value={2.5}>Print (2.5×) — largest file</option>
					</select>
				</div>
				<div class="field">
					<span class="label">Page encoding</span>
					<select bind:value={imgFormat} class="si">
						<option value="image/jpeg">JPEG (smaller)</option>
						<option value="image/png">PNG (lossless pages)</option>
					</select>
				</div>
			</div>
		</div>
	{/if}

	<DropZone accept=".pdf,application/pdf" {hasFiles} onFiles={addFiles}
		icon="📄" title="Drop PDF files here"
		subtitle="Any PDF — reports, scans, forms, presentations" />

	{#if hasFiles}
		<div class="list-bar">
			<div class="bar-left">
				{#if doneCount > 0 && totalSaved > 0}
					<span class="saved-badge">💾 {formatBytes(totalSaved)} saved across {doneCount} file{doneCount !== 1 ? 's' : ''}</span>
				{:else}
					<span class="count">{files.length} PDF{files.length !== 1 ? 's' : ''} queued</span>
				{/if}
			</div>
			<div class="bar-right">
				<button class="btn-primary" on:click={compressAll} disabled={anyCompressing}>
					{anyCompressing ? 'Compressing…' : '⚡ Compress all'}
				</button>
				{#if doneCount > 0}
					<button class="btn-ghost" on:click={() => files.filter(f => f.status === 'done').forEach(download)}>
						⬇ Download all
					</button>
				{/if}
				<button class="btn-ghost danger" on:click={() => files = []}>Clear</button>
			</div>
		</div>

		<div class="file-list">
			{#each files as entry (entry.id)}
				<div class="file-card"
					class:is-done={entry.status === 'done'}
					class:is-error={entry.status === 'error'}
					class:is-compressing={entry.status === 'compressing'}
				>
					<div class="fc-icon">📄</div>
					<div class="fc-info">
						<div class="fc-name">{entry.file.name}</div>
						<div class="fc-meta">
							<span>{formatBytes(entry.file.size)}</span>
							{#if entry.result}
								<span class="arr">→</span>
								<span class="cs">{formatBytes(entry.result.compressedSize)}</span>
								<span class="rt" class:pos={entry.result.compressionRatio > 1}>
									{entry.result.compressionRatio > 1
										? `−${(100 - 100 / entry.result.compressionRatio).toFixed(1)}%`
										: `+${((1 / entry.result.compressionRatio - 1) * 100).toFixed(1)}%`}
								</span>
							{/if}
						</div>
						{#if entry.status === 'compressing'}
							<div class="progress-track">
								<div class="progress-fill" style="width:{entry.progress}%"></div>
							</div>
							<div class="progress-label">{getProgressLabel(entry.progress)}</div>
						{/if}
						{#if entry.status === 'error'}
							<div class="error-msg">⚠ {entry.error}</div>
						{/if}
					</div>
					<div class="fc-actions">
						{#if entry.status === 'idle' || entry.status === 'error'}
							<button class="fc-btn primary" on:click={() => compress(entry)}>Compress</button>
						{:else if entry.status === 'compressing'}
							<span class="fc-pct">{entry.progress}%</span>
						{:else if entry.status === 'done'}
							<button class="fc-btn" on:click={() => download(entry)}>⬇ Download</button>
						{/if}
						<button class="fc-btn icon" on:click={() => files = files.filter(f => f.id !== entry.id)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="how-it-works">
		<h3>How it works</h3>
		<div class="steps">
			<div class="step"><span class="sn">1</span><span>PDF.js renders each page to a canvas at high resolution</span></div>
			<div class="step"><span class="sn">2</span><span>Each page is re-encoded as a compressed JPEG or PNG</span></div>
			<div class="step"><span class="sn">3</span><span>Pages are reassembled into a valid PDF — stays readable in all viewers</span></div>
			<div class="step"><span class="sn">4</span><span>Everything runs locally — no upload, no server, no tracking</span></div>
		</div>
	</div>
</div>

<style>
	.page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
	.back-link { font-size: .82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); }
	.back-link:hover { color: var(--accent); }
	.page-header { margin-bottom: 2rem; }
	.header-top { display: flex; align-items: center; gap: .75rem; margin: .5rem 0 .3rem; }
	.badge { padding: .2rem .65rem; border-radius: 6px; font-size: .8rem; font-weight: 600; }
	.badge.pdf { background: rgba(224,49,49,.1); border: 1px solid rgba(224,49,49,.2); color: #c92a2a; }
	h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); }
	.subtitle { font-size: .82rem; color: var(--text-4); font-family: var(--mono); margin-top: .25rem; }

	/* PRESETS */
	.preset-section { margin-bottom: 1rem; }
	.preset-label { font-size: .73rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); margin-bottom: .6rem; }
	.preset-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
	.preset-card {
		background: var(--surface); border: 1.5px solid var(--border);
		border-radius: var(--radius-lg); padding: 1rem 1.1rem;
		cursor: pointer; transition: var(--transition); text-align: left;
	}
	.preset-card:hover { border-color: var(--border-mid); box-shadow: var(--shadow-sm); }
	.preset-card.selected { border-color: var(--accent); background: var(--accent-soft); }
	.pc-top { display: flex; align-items: center; gap: .65rem; margin-bottom: .5rem; }
	.pc-icon { font-size: 1.1rem; flex-shrink: 0; }
	.pc-text { flex: 1; min-width: 0; }
	.pc-text strong { display: block; font-size: .875rem; font-weight: 700; color: var(--text); }
	.pc-text span { font-size: .72rem; color: var(--text-3); font-family: var(--mono); }
	.pc-check { color: var(--accent); flex-shrink: 0; }
	.pc-detail { font-size: .775rem; color: var(--text-3); line-height: 1.55; margin: 0; }

	/* TARGET SIZE */
	.target-row { display: flex; align-items: center; gap: 1rem; margin-bottom: .75rem; flex-wrap: wrap; }
	.target-toggle { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: var(--text-2); cursor: pointer; font-weight: 500; }
	.target-toggle input { accent-color: var(--accent); }
	.target-input-row { display: flex; align-items: center; gap: .5rem; }
	.ti { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .42rem .75rem; color: var(--text); font-size: .875rem; outline: none; width: 140px; transition: border-color var(--transition); }
	.ti:focus { border-color: var(--accent); }
	.ti-unit { font-size: .82rem; color: var(--text-3); font-family: var(--mono); }

	/* ADVANCED */
	.advanced-toggle {
		display: flex; align-items: center; gap: .45rem;
		font-size: .8rem; color: var(--text-3); background: none; border: none;
		cursor: pointer; padding: .3rem 0; margin-bottom: .5rem;
		transition: color var(--transition);
	}
	.advanced-toggle:hover { color: var(--text); }
	.advanced-panel { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.slider { -webkit-appearance: none; width: 160px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.si:focus { border-color: var(--accent); }

	/* LIST */
	.list-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; margin-bottom: .75rem; }
	.bar-left { display: flex; align-items: center; gap: .75rem; }
	.bar-right { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
	.saved-badge { font-size: .82rem; font-weight: 600; color: #2f9e44; font-family: var(--mono); }
	.count { font-size: .82rem; color: var(--text-3); font-family: var(--mono); }
	.btn-primary { padding: .5rem 1.1rem; background: var(--accent); color: white; border: none; border-radius: var(--radius); font-weight: 600; font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-mid); }
	.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
	.btn-ghost { padding: .5rem .9rem; border: 1px solid var(--border); background: none; color: var(--text-3); border-radius: var(--radius); font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-ghost:hover { border-color: var(--border-mid); color: var(--text); }
	.btn-ghost.danger:hover { border-color: var(--accent2); color: var(--accent2); }

	/* FILE CARDS */
	.file-list { display: flex; flex-direction: column; gap: .6rem; }
	.file-card { display: flex; align-items: flex-start; gap: .85rem; padding: 1rem 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); transition: border-color var(--transition); }
	.file-card.is-done { border-color: rgba(47,158,68,.25); }
	.file-card.is-error { border-color: rgba(224,49,49,.25); }
	.file-card.is-compressing { border-color: rgba(59,91,219,.2); }
	.fc-icon { font-size: 1.35rem; flex-shrink: 0; padding-top: 2px; }
	.fc-info { flex: 1; min-width: 0; }
	.fc-name { font-size: .875rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.fc-meta { display: flex; align-items: center; gap: .4rem; font-size: .75rem; font-family: var(--mono); color: var(--text-3); margin-top: .15rem; flex-wrap: wrap; }
	.arr { color: var(--text-4); }
	.cs { color: var(--text-2); font-weight: 500; }
	.rt.pos { color: #2f9e44; font-weight: 600; }
	.progress-track { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: .5rem; }
	.progress-fill { height: 100%; background: var(--accent); transition: width .2s ease; border-radius: 2px; }
	.progress-label { font-size: .72rem; font-family: var(--mono); color: var(--text-3); margin-top: .3rem; }
	.error-msg { font-size: .78rem; color: var(--accent2); margin-top: .3rem; line-height: 1.4; }
	.fc-actions { display: flex; gap: .4rem; flex-shrink: 0; }
	.fc-pct { font-size: .78rem; font-family: var(--mono); color: var(--text-3); min-width: 32px; text-align: right; }
	.fc-btn { padding: .35rem .8rem; border-radius: 7px; font-size: .78rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg2); color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.fc-btn:hover { border-color: var(--border-mid); color: var(--text); }
	.fc-btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
	.fc-btn.primary:hover { background: var(--accent-mid); }
	.fc-btn.icon { padding: .35rem .5rem; }
	.fc-btn.icon:hover { border-color: var(--accent2); color: var(--accent2); }

	/* HOW IT WORKS */
	.how-it-works { margin-top: 2.5rem; padding: 1.5rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); }
	.how-it-works h3 { font-size: .875rem; font-weight: 700; color: var(--text); margin-bottom: 1rem; }
	.steps { display: flex; flex-direction: column; gap: .6rem; }
	.step { display: flex; align-items: center; gap: .75rem; font-size: .82rem; color: var(--text-3); }
	.sn { width: 22px; height: 22px; background: var(--accent-soft); border: 1.5px solid rgba(59,91,219,.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 700; color: var(--accent); flex-shrink: 0; font-family: var(--mono); }

	@media (max-width: 640px) {
		.preset-cards { grid-template-columns: 1fr; }
		.pc-detail { display: none; }
	}
</style>
