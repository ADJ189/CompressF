<script lang="ts">
	import { browser } from '$app/environment';
	import { compressImage } from '$lib/compressImage';
	import { compressPdf } from '$lib/compressPdf';
	import { compressVideo } from '$lib/compressVideo';
	import { detectFileType, formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, ImageFormat } from '$lib/types';

	let files: FileEntry[] = [];
	let dragOver = false;
	let globalQuality = 82;
	let targetMode: 'quality' | 'size' = 'quality';
	let targetSizeKB = '';
	let outputFormat: ImageFormat = 'image/webp';
	let stripMetadata = true;
	let maxDimension = 4096;

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const items = e.dataTransfer?.files;
		if (items) addFiles(Array.from(items));
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) addFiles(Array.from(input.files));
		input.value = '';
	}

	function addFiles(newFiles: File[]) {
		for (const file of newFiles) {
			const type = detectFileType(file);
			if (type === 'unknown') continue;
			files = [...files, {
				id: uid(),
				file,
				type,
				status: 'idle',
				progress: 0,
				options: buildOptions()
			}];
		}
	}

	function buildOptions(): CompressOptions {
		const opts: CompressOptions = {
			format: outputFormat,
			stripMetadata,
			maxWidth: maxDimension,
			maxHeight: maxDimension,
			quality: globalQuality / 100
		};
		if (targetMode === 'size' && targetSizeKB) {
			opts.targetSizeKB = parseFloat(targetSizeKB);
			delete opts.quality;
		}
		return opts;
	}

	function removeFile(id: string) {
		files = files.filter(f => f.id !== id);
	}

	async function compressFile(entry: FileEntry) {
		entry.status = 'compressing';
		entry.progress = 0;
		entry.options = buildOptions();
		files = files; // trigger reactivity

		try {
			const onProgress = (pct: number) => {
				entry.progress = pct;
				files = files;
			};

			let result;
			if (entry.type === 'image') {
				result = await compressImage(entry.file, entry.options, onProgress);
			} else if (entry.type === 'pdf') {
				result = await compressPdf(entry.file, entry.options, onProgress);
			} else if (entry.type === 'video') {
				result = await compressVideo(entry.file, entry.options, onProgress);
			} else {
				throw new Error('Unsupported type');
			}

			entry.result = result;
			entry.status = 'done';
		} catch (err: any) {
			entry.error = err.message ?? 'Unknown error';
			entry.status = 'error';
		}
		files = files;
	}

	function compressAll() {
		for (const f of files) {
			if (f.status === 'idle' || f.status === 'error') {
				compressFile(f);
			}
		}
	}

	function downloadFile(entry: FileEntry) {
		if (!entry.result) return;
		const url = URL.createObjectURL(entry.result.blob);
		const a = document.createElement('a');
		const ext = entry.result.format.includes('webp') ? 'webp'
			: entry.result.format.includes('jpeg') ? 'jpg'
			: entry.result.format.includes('png') ? 'png'
			: entry.result.format.includes('avif') ? 'avif'
			: entry.result.format.includes('pdf') ? 'pdf'
			: 'webm';
		const base = entry.file.name.replace(/\.[^.]+$/, '');
		a.href = url;
		a.download = `${base}_compressed.${ext}`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	}

	function downloadAll() {
		files.filter(f => f.status === 'done').forEach(downloadFile);
	}

	function clearAll() {
		files = [];
	}

	$: hasFiles = files.length > 0;
	$: allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files
		.filter(f => f.status === 'done' && f.result)
		.reduce((acc, f) => acc + (f.file.size - (f.result?.compressedSize ?? 0)), 0);

	// Check WebCodecs support
	let hasWebCodecs = false;
	if (browser) hasWebCodecs = typeof VideoEncoder !== 'undefined';
</script>

<svelte:head>
	<title>Compress Files — Compressly</title>
</svelte:head>

<div class="compress-page">
	<!-- Header -->
	<div class="page-header">
		<h1>File Compressor</h1>
		<p>Drop your images, PDFs, or videos below. Everything runs locally in your browser.</p>
		{#if hasWebCodecs}
			<span class="hw-badge">⚡ Hardware acceleration available</span>
		{/if}
	</div>

	<!-- Settings Panel -->
	<div class="settings-panel">
		<div class="settings-inner">
			<div class="setting-group">
				<label>Mode</label>
				<div class="mode-toggle">
					<button class:active={targetMode === 'quality'} on:click={() => targetMode = 'quality'}>Quality</button>
					<button class:active={targetMode === 'size'} on:click={() => targetMode = 'size'}>Target Size</button>
				</div>
			</div>

			{#if targetMode === 'quality'}
				<div class="setting-group">
					<label>Quality <span class="val">{globalQuality}%</span></label>
					<input type="range" min="10" max="99" bind:value={globalQuality} class="slider" />
				</div>
			{:else}
				<div class="setting-group">
					<label>Target Size (KB)</label>
					<input type="number" bind:value={targetSizeKB} placeholder="e.g. 500" class="num-input" min="1" />
				</div>
			{/if}

			<div class="setting-group">
				<label>Image Format</label>
				<select bind:value={outputFormat} class="select">
					<option value="image/webp">WebP (recommended)</option>
					<option value="image/jpeg">JPEG</option>
					<option value="image/png">PNG (lossless)</option>
					<option value="image/avif">AVIF (best ratio)</option>
				</select>
			</div>

			<div class="setting-group">
				<label>Max Dimension</label>
				<select bind:value={maxDimension} class="select">
					<option value={8192}>8192px (original)</option>
					<option value={4096}>4096px</option>
					<option value={2048}>2048px</option>
					<option value={1920}>1920px (FHD)</option>
					<option value={1280}>1280px (HD)</option>
					<option value={800}>800px (web)</option>
				</select>
			</div>

			<div class="setting-group checkbox-group">
				<label>
					<input type="checkbox" bind:checked={stripMetadata} />
					Strip metadata
				</label>
			</div>
		</div>
	</div>

	<!-- Drop Zone -->
	<div
		class="dropzone"
		class:drag-over={dragOver}
		class:has-files={hasFiles}
		on:dragover|preventDefault={() => dragOver = true}
		on:dragleave={() => dragOver = false}
		on:drop={handleDrop}
		role="button"
		tabindex="0"
		on:keydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
	>
		{#if !hasFiles}
			<div class="drop-content">
				<div class="drop-icon">📂</div>
				<p class="drop-title">Drop files here or click to browse</p>
				<p class="drop-sub">Images (JPEG, PNG, WebP, AVIF) · PDF · Video (MP4, WebM)</p>
				<label class="browse-btn">
					Browse files
					<input id="file-input" type="file" multiple accept="image/*,.pdf,video/*" on:change={handleFileInput} style="display:none" />
				</label>
			</div>
		{:else}
			<div class="add-more-zone">
				<label class="add-more-btn">
					+ Add more files
					<input type="file" multiple accept="image/*,.pdf,video/*" on:change={handleFileInput} style="display:none" />
				</label>
			</div>
		{/if}
	</div>

	<!-- File List -->
	{#if hasFiles}
		<div class="file-list">
			<!-- Summary bar -->
			{#if doneCount > 0}
				<div class="summary-bar">
					<span class="summary-stat">
						<strong>{doneCount}</strong> file{doneCount !== 1 ? 's' : ''} compressed
					</span>
					{#if totalSaved > 0}
						<span class="summary-stat saved">
							💾 Saved <strong>{formatBytes(totalSaved)}</strong>
						</span>
					{/if}
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="list-actions">
				<button class="btn-compress" on:click={compressAll} disabled={anyCompressing}>
					{anyCompressing ? 'Compressing...' : '⚡ Compress All'}
				</button>
				{#if doneCount > 0}
					<button class="btn-download-all" on:click={downloadAll}>
						⬇ Download All
					</button>
				{/if}
				<button class="btn-clear" on:click={clearAll}>Clear All</button>
			</div>

			<!-- File cards -->
			{#each files as entry (entry.id)}
				<div class="file-card" class:done={entry.status === 'done'} class:error={entry.status === 'error'}>
					<div class="file-type-badge" class:image={entry.type === 'image'} class:pdf={entry.type === 'pdf'} class:video={entry.type === 'video'}>
						{entry.type === 'image' ? '🖼️' : entry.type === 'pdf' ? '📄' : '🎬'}
					</div>

					<div class="file-info">
						<div class="file-name">{entry.file.name}</div>
						<div class="file-meta">
							<span>{formatBytes(entry.file.size)}</span>
							{#if entry.result}
								<span class="arrow">→</span>
								<span class="compressed-size">{formatBytes(entry.result.compressedSize)}</span>
								<span class="ratio" class:good={entry.result.compressionRatio > 1}>
									{entry.result.compressionRatio > 1
										? `-${(100 - 100 / entry.result.compressionRatio).toFixed(1)}%`
										: '+' + ((1 / entry.result.compressionRatio - 1) * 100).toFixed(1) + '%'}
								</span>
								{#if entry.result.width}
									<span class="dim">{entry.result.width}×{entry.result.height}</span>
								{/if}
							{/if}
						</div>
					</div>

					{#if entry.status === 'compressing'}
						<div class="progress-bar">
							<div class="progress-fill" style="width: {entry.progress}%"></div>
						</div>
					{/if}

					{#if entry.status === 'error'}
						<div class="error-msg" title={entry.error}>⚠ Error</div>
					{/if}

					<div class="file-actions">
						{#if entry.status === 'idle' || entry.status === 'error'}
							<button class="btn-sm primary" on:click={() => compressFile(entry)}>Compress</button>
						{:else if entry.status === 'compressing'}
							<span class="pct-label">{entry.progress}%</span>
						{:else if entry.status === 'done'}
							<button class="btn-sm" on:click={() => downloadFile(entry)}>⬇ Download</button>
						{/if}
						<button class="btn-sm danger" on:click={() => removeFile(entry.id)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Tips -->
	<div class="tips">
		<div class="tip"><span>💡</span> WebP typically saves 25–35% vs JPEG at the same quality.</div>
		<div class="tip"><span>🎯</span> Use "Target Size" mode when you need files under a specific limit.</div>
		<div class="tip"><span>🔒</span> Files are never uploaded — processing is 100% local.</div>
	</div>
</div>

<style>
	.compress-page {
		max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem;
	}
	.page-header {
		text-align: center; margin-bottom: 2.5rem;
	}
	.page-header h1 {
		font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.5rem;
	}
	.page-header p { color: var(--text-dim); font-size: 1rem; }
	.hw-badge {
		display: inline-block; margin-top: 0.75rem;
		padding: 0.25rem 0.85rem; background: rgba(0,229,255,0.1);
		border: 1px solid rgba(0,229,255,0.25); border-radius: 100px;
		font-size: 0.78rem; font-family: var(--mono); color: var(--accent3);
	}

	/* SETTINGS */
	.settings-panel {
		background: var(--bg2); border: 1px solid var(--border);
		border-radius: var(--radius-lg); margin-bottom: 1.5rem; overflow: hidden;
	}
	.settings-inner {
		display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.25rem 1.5rem; align-items: flex-end;
	}
	.setting-group { display: flex; flex-direction: column; gap: 0.4rem; min-width: 140px; }
	.setting-group label {
		font-size: 0.75rem; font-family: var(--mono); color: var(--text-dim); font-weight: 500;
		display: flex; align-items: center; gap: 0.4rem;
	}
	.val { color: var(--accent); font-weight: 700; }
	.slider {
		-webkit-appearance: none; width: 160px; height: 4px;
		background: var(--surface2); border-radius: 2px; outline: none;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none; width: 16px; height: 16px;
		background: var(--accent); border-radius: 50%; cursor: pointer;
		box-shadow: 0 0 6px var(--accent-glow);
	}
	.select, .num-input {
		background: var(--surface); border: 1px solid var(--border-bright);
		border-radius: 8px; padding: 0.45rem 0.75rem;
		color: var(--text); font-size: 0.85rem; outline: none;
		transition: border-color var(--transition);
	}
	.select:focus, .num-input:focus { border-color: var(--accent); }
	.num-input { width: 120px; }
	.mode-toggle {
		display: flex; background: var(--surface); border-radius: 8px; overflow: hidden;
		border: 1px solid var(--border-bright);
	}
	.mode-toggle button {
		padding: 0.45rem 0.85rem; background: none; border: none;
		font-size: 0.82rem; color: var(--text-dim); transition: var(--transition);
	}
	.mode-toggle button.active { background: var(--accent); color: white; font-weight: 600; }
	.checkbox-group label {
		flex-direction: row; align-items: center; gap: 0.5rem; cursor: pointer;
		font-size: 0.82rem; padding-top: 0.5rem;
	}
	.checkbox-group input[type=checkbox] { accent-color: var(--accent); }

	/* DROPZONE */
	.dropzone {
		border: 2px dashed var(--border-bright); border-radius: var(--radius-lg);
		background: var(--bg2); transition: var(--transition);
		margin-bottom: 1.5rem; cursor: pointer;
	}
	.dropzone.drag-over { border-color: var(--accent); background: rgba(108,99,255,0.05); }
	.dropzone.has-files { padding: 0; }
	.drop-content {
		display: flex; flex-direction: column; align-items: center;
		justify-content: center; padding: 4rem 2rem; text-align: center; gap: 0.75rem;
	}
	.drop-icon { font-size: 3rem; margin-bottom: 0.5rem; }
	.drop-title { font-size: 1.1rem; font-weight: 600; }
	.drop-sub { font-size: 0.85rem; color: var(--text-dim); font-family: var(--mono); }
	.browse-btn {
		margin-top: 0.5rem; padding: 0.6rem 1.5rem;
		background: var(--surface2); border: 1px solid var(--border-bright);
		border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer;
		transition: var(--transition);
	}
	.browse-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
	.add-more-zone { padding: 0.75rem 1.5rem; }
	.add-more-btn {
		display: inline-flex; align-items: center; gap: 0.5rem;
		font-size: 0.85rem; color: var(--text-dim); cursor: pointer;
		padding: 0.4rem 0.85rem; border-radius: 8px; border: 1px dashed var(--border-bright);
		transition: var(--transition);
	}
	.add-more-btn:hover { color: var(--text); border-color: var(--accent); }

	/* FILE LIST */
	.file-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.summary-bar {
		display: flex; align-items: center; gap: 1.5rem;
		padding: 0.75rem 1rem; background: var(--bg2); border-radius: var(--radius);
		border: 1px solid var(--border); font-size: 0.85rem;
	}
	.summary-stat strong { color: var(--text); }
	.summary-stat.saved strong { color: #06d6a0; }
	.list-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.25rem; }

	.btn-compress {
		padding: 0.6rem 1.4rem; background: var(--accent); color: white;
		border: none; border-radius: var(--radius); font-weight: 700; font-size: 0.9rem;
		transition: var(--transition);
	}
	.btn-compress:hover:not(:disabled) { background: #7d75ff; box-shadow: 0 0 15px var(--accent-glow); }
	.btn-compress:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-download-all {
		padding: 0.6rem 1.2rem; background: rgba(6,214,160,0.1);
		border: 1px solid rgba(6,214,160,0.3); color: #06d6a0;
		border-radius: var(--radius); font-weight: 600; font-size: 0.88rem; transition: var(--transition);
	}
	.btn-download-all:hover { background: rgba(6,214,160,0.2); }
	.btn-clear {
		padding: 0.6rem 1rem; background: none;
		border: 1px solid var(--border-bright); color: var(--text-dim);
		border-radius: var(--radius); font-size: 0.88rem; transition: var(--transition);
	}
	.btn-clear:hover { border-color: var(--accent2); color: var(--accent2); }

	/* FILE CARD */
	.file-card {
		display: flex; align-items: center; gap: 1rem;
		padding: 1rem 1.25rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: var(--radius);
		transition: var(--transition); position: relative; overflow: hidden; flex-wrap: wrap;
	}
	.file-card.done { border-color: rgba(6,214,160,0.2); }
	.file-card.error { border-color: rgba(255,107,107,0.3); }
	.file-type-badge { font-size: 1.5rem; flex-shrink: 0; }

	.file-info { flex: 1; min-width: 0; }
	.file-name {
		font-size: 0.9rem; font-weight: 600; white-space: nowrap;
		overflow: hidden; text-overflow: ellipsis; max-width: 400px;
	}
	.file-meta {
		display: flex; align-items: center; gap: 0.5rem;
		font-size: 0.78rem; color: var(--text-dim); font-family: var(--mono); margin-top: 0.2rem;
	}
	.arrow { color: var(--text-dimmer); }
	.compressed-size { color: var(--text); }
	.ratio.good { color: #06d6a0; font-weight: 700; }
	.ratio:not(.good) { color: var(--accent2); }
	.dim { color: var(--text-dimmer); }

	.progress-bar {
		position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
		background: var(--bg3);
	}
	.progress-fill {
		height: 100%; background: var(--accent);
		transition: width 0.15s ease; border-radius: 2px;
	}

	.error-msg { font-size: 0.78rem; color: var(--accent2); font-family: var(--mono); }
	.pct-label { font-size: 0.8rem; color: var(--text-dim); font-family: var(--mono); }

	.file-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
	.btn-sm {
		padding: 0.35rem 0.85rem; border-radius: 6px; font-size: 0.8rem;
		font-weight: 600; border: 1px solid var(--border-bright); background: var(--surface);
		color: var(--text-dim); transition: var(--transition);
	}
	.btn-sm:hover { color: var(--text); border-color: var(--accent); }
	.btn-sm.primary { background: var(--accent); border-color: var(--accent); color: white; }
	.btn-sm.primary:hover { background: #7d75ff; }
	.btn-sm.danger:hover { border-color: var(--accent2); color: var(--accent2); }

	/* TIPS */
	.tips { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 2.5rem; }
	.tip {
		display: flex; align-items: flex-start; gap: 0.6rem;
		font-size: 0.82rem; color: var(--text-dimmer); font-family: var(--mono);
		padding: 0.65rem 1rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: var(--radius);
	}
	.tip span { flex-shrink: 0; }

	@media (max-width: 600px) {
		.settings-inner { gap: 0.75rem; }
		.file-name { max-width: 200px; }
		.file-meta { flex-wrap: wrap; }
	}
</style>
