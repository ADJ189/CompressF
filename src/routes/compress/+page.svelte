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
		e.preventDefault(); dragOver = false;
		if (e.dataTransfer?.files) addFiles(Array.from(e.dataTransfer.files));
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
			files = [...files, { id: uid(), file, type, status: 'idle', progress: 0, options: buildOptions() }];
		}
	}
	function buildOptions(): CompressOptions {
		const opts: CompressOptions = { format: outputFormat, stripMetadata, maxWidth: maxDimension, maxHeight: maxDimension, quality: globalQuality / 100 };
		if (targetMode === 'size' && targetSizeKB) { opts.targetSizeKB = parseFloat(targetSizeKB); delete opts.quality; }
		return opts;
	}
	function removeFile(id: string) { files = files.filter(f => f.id !== id); }

	async function compressFile(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			const onProgress = (pct: number) => { entry.progress = pct; files = files; };
			let result;
			if (entry.type === 'image') result = await compressImage(entry.file, entry.options, onProgress);
			else if (entry.type === 'pdf') result = await compressPdf(entry.file, entry.options, onProgress);
			else if (entry.type === 'video') result = await compressVideo(entry.file, entry.options, onProgress);
			else throw new Error('Unsupported type');
			entry.result = result; entry.status = 'done';
		} catch (err: any) {
			entry.error = err.message ?? 'Unknown error'; entry.status = 'error';
		}
		files = files;
	}

	function compressAll() { for (const f of files) if (f.status === 'idle' || f.status === 'error') compressFile(f); }

	function downloadFile(entry: FileEntry) {
		if (!entry.result) return;
		const url = URL.createObjectURL(entry.result.blob);
		const a = document.createElement('a');
		const ext = entry.result.format.includes('webp') ? 'webp' : entry.result.format.includes('jpeg') ? 'jpg'
			: entry.result.format.includes('png') ? 'png' : entry.result.format.includes('avif') ? 'avif'
			: entry.result.format.includes('pdf') ? 'pdf' : 'webm';
		a.href = url; a.download = `${entry.file.name.replace(/\.[^.]+$/, '')}_compressed.${ext}`; a.click();
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	}
	function downloadAll() { files.filter(f => f.status === 'done').forEach(downloadFile); }
	function clearAll() { files = []; }

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.status === 'done' && f.result).reduce((acc, f) => acc + (f.file.size - (f.result?.compressedSize ?? 0)), 0);
	let hasWebCodecs = false;
	if (browser) hasWebCodecs = typeof VideoEncoder !== 'undefined';
</script>

<svelte:head>
	<title>Compress — Compressly</title>
</svelte:head>

<div class="compress-page">
	<div class="page-header">
		<h1>File Compressor</h1>
		<p>Drop files below. Everything runs locally — images, PDFs, and video.</p>
		{#if hasWebCodecs}
			<span class="hw-chip">⚡ Hardware acceleration available</span>
		{/if}
	</div>

	<!-- Settings -->
	<div class="settings-card">
		<div class="settings-row">
			<div class="field">
				<span class="field-label">Mode</span>
				<div class="toggle-group">
					<button class:on={targetMode === 'quality'} on:click={() => targetMode = 'quality'}>Quality</button>
					<button class:on={targetMode === 'size'} on:click={() => targetMode = 'size'}>Target size</button>
				</div>
			</div>

			{#if targetMode === 'quality'}
				<div class="field">
					<span class="field-label">Quality <strong>{globalQuality}%</strong></span>
					<input id="quality-slider" type="range" min="10" max="99" bind:value={globalQuality} class="slider" />
				</div>
			{:else}
				<div class="field">
					<span class="field-label">Target size (KB)</span>
					<input id="target-size" type="number" bind:value={targetSizeKB} placeholder="e.g. 500" class="text-input" min="1" />
				</div>
			{/if}

			<div class="field">
				<span class="field-label">Image format</span>
				<select id="image-format" bind:value={outputFormat} class="select-input">
					<option value="image/webp">WebP (recommended)</option>
					<option value="image/jpeg">JPEG</option>
					<option value="image/png">PNG (lossless)</option>
					<option value="image/avif">AVIF (best ratio)</option>
				</select>
			</div>

			<div class="field">
				<span class="field-label">Max dimension</span>
				<select id="max-dim" bind:value={maxDimension} class="select-input">
					<option value={8192}>Original</option>
					<option value={4096}>4096 px</option>
					<option value={2048}>2048 px</option>
					<option value={1920}>1920 px</option>
					<option value={1280}>1280 px</option>
					<option value={800}>800 px</option>
				</select>
			</div>

			<div class="field checkbox-field">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={stripMetadata} />
					<span>Strip metadata</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Drop zone -->
	<div
		class="dropzone" class:drag-active={dragOver} class:has-files={hasFiles}
		on:dragover|preventDefault={() => dragOver = true}
		on:dragleave={() => dragOver = false}
		on:drop={handleDrop}
		role="button" tabindex="0"
		on:keydown={(e) => e.key === 'Enter' && document.getElementById('file-browse')?.click()}
	>
		{#if !hasFiles}
			<div class="drop-inner">
				<div class="drop-icon">
					<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
						<polyline points="17 8 12 3 7 8"/>
						<line x1="12" y1="3" x2="12" y2="15"/>
					</svg>
				</div>
				<p class="drop-title">Drop files here to compress</p>
				<p class="drop-sub">Images · PDF · Video — or <label class="browse-link">browse<input id="file-browse" type="file" multiple accept="image/*,.pdf,video/*" on:change={handleFileInput} style="display:none"/></label></p>
			</div>
		{:else}
			<div class="add-more">
				<label class="add-btn">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Add more files
					<input type="file" multiple accept="image/*,.pdf,video/*" on:change={handleFileInput} style="display:none"/>
				</label>
			</div>
		{/if}
	</div>

	<!-- File list -->
	{#if hasFiles}
		<div class="file-list">
			<!-- Summary + actions -->
			<div class="list-top">
				{#if doneCount > 0}
					<div class="summary">
						<span><strong>{doneCount}</strong> file{doneCount !== 1 ? 's' : ''} compressed</span>
						{#if totalSaved > 0}
							<span class="saved">Saved <strong>{formatBytes(totalSaved)}</strong></span>
						{/if}
					</div>
				{:else}
					<div class="summary"><span>{files.length} file{files.length !== 1 ? 's' : ''} queued</span></div>
				{/if}
				<div class="list-actions">
					<button class="btn-compress" on:click={compressAll} disabled={anyCompressing}>
						{anyCompressing ? 'Compressing…' : '⚡ Compress all'}
					</button>
					{#if doneCount > 0}
						<button class="btn-dl-all" on:click={downloadAll}>⬇ Download all</button>
					{/if}
					<button class="btn-clear" on:click={clearAll}>Clear</button>
				</div>
			</div>

			<!-- Cards -->
			{#each files as entry (entry.id)}
				<div class="file-card"
					class:is-done={entry.status === 'done'}
					class:is-error={entry.status === 'error'}
					class:is-compressing={entry.status === 'compressing'}
				>
					<div class="fc-type" class:img={entry.type==='image'} class:pdf={entry.type==='pdf'} class:vid={entry.type==='video'}>
						{entry.type === 'image' ? '🖼️' : entry.type === 'pdf' ? '📄' : '🎬'}
					</div>

					<div class="fc-info">
						<div class="fc-name">{entry.file.name}</div>
						<div class="fc-meta">
							<span class="orig">{formatBytes(entry.file.size)}</span>
							{#if entry.result}
								<span class="arrow">→</span>
								<span class="compressed">{formatBytes(entry.result.compressedSize)}</span>
								<span class="ratio" class:positive={entry.result.compressionRatio > 1}>
									{entry.result.compressionRatio > 1
										? `−${(100 - 100 / entry.result.compressionRatio).toFixed(1)}%`
										: `+${((1 / entry.result.compressionRatio - 1) * 100).toFixed(1)}%`}
								</span>
							{/if}
							{#if entry.status === 'error'}
								<span class="err-msg" title={entry.error}>⚠ {entry.error?.slice(0,40)}</span>
							{/if}
						</div>
						{#if entry.status === 'compressing'}
							<div class="progress-track">
								<div class="progress-fill" style="width:{entry.progress}%"></div>
							</div>
						{/if}
					</div>

					<div class="fc-actions">
						{#if entry.status === 'idle' || entry.status === 'error'}
							<button class="fc-btn primary" on:click={() => compressFile(entry)}>Compress</button>
						{:else if entry.status === 'compressing'}
							<span class="fc-pct">{entry.progress}%</span>
						{:else if entry.status === 'done'}
							<button class="fc-btn" on:click={() => downloadFile(entry)}>⬇ Download</button>
						{/if}
						<button class="fc-btn icon" on:click={() => removeFile(entry.id)} aria-label="Remove">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Tips -->
	<div class="tips">
		<div class="tip">💡 WebP saves 25–35% vs JPEG at the same visual quality.</div>
		<div class="tip">🎯 Use "Target size" when you need files under a specific limit (email, upload form).</div>
		<div class="tip">🔒 Files never leave your browser — there's no server involved at all.</div>
	</div>
</div>

<style>
	.compress-page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 4rem; }

	.page-header { margin-bottom: 2rem; }
	.page-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text); margin-bottom: 0.35rem; }
	.page-header p { font-size: 0.95rem; color: var(--text-3); }
	.hw-chip {
		display: inline-block; margin-top: 0.6rem;
		padding: 0.22rem 0.7rem; background: rgba(0,150,150,0.08);
		border: 1px solid rgba(0,150,150,0.2); border-radius: 6px;
		font-size: 0.75rem; font-family: var(--mono); color: var(--accent3);
	}

	/* SETTINGS */
	.settings-card {
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--radius-lg); padding: 1.25rem 1.5rem;
		margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);
	}
	.settings-row { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: 0.4rem; }
	.field-label {
		font-size: 0.75rem; font-weight: 600; color: var(--text-3);
		text-transform: uppercase; letter-spacing: 0.04em;
	}
	.field-label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }

	.toggle-group {
		display: flex; background: var(--bg2);
		border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
	}
	.toggle-group button {
		padding: 0.42rem 0.9rem; background: none; border: none;
		font-size: 0.82rem; font-weight: 500; color: var(--text-3); transition: var(--transition);
	}
	.toggle-group button.on { background: var(--accent); color: white; font-weight: 600; }

	.slider {
		-webkit-appearance: none; width: 180px; height: 4px;
		background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none; width: 16px; height: 16px;
		background: var(--accent); border-radius: 50%;
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.text-input, .select-input {
		background: var(--bg2); border: 1px solid var(--border);
		border-radius: 8px; padding: 0.45rem 0.75rem;
		color: var(--text); font-size: 0.875rem; outline: none;
		transition: border-color var(--transition);
	}
	.text-input:focus, .select-input:focus { border-color: var(--accent); }
	.text-input { width: 130px; }

	.checkbox-field { justify-content: flex-end; padding-bottom: 2px; }
	.checkbox-label {
		display: flex; align-items: center; gap: 0.5rem;
		font-size: 0.875rem; color: var(--text-2); cursor: pointer; font-weight: 500;
	}
	.checkbox-label input { accent-color: var(--accent); width: 15px; height: 15px; }

	/* DROPZONE */
	.dropzone {
		border: 2px dashed var(--border-mid); border-radius: var(--radius-lg);
		background: var(--surface); transition: var(--transition);
		margin-bottom: 1.25rem; cursor: default;
	}
	.dropzone.drag-active { border-color: var(--accent); background: var(--accent-soft); }
	.drop-inner {
		display: flex; flex-direction: column; align-items: center;
		justify-content: center; padding: 3.5rem 2rem; gap: 0.6rem; text-align: center;
	}
	.drop-icon { color: var(--text-4); margin-bottom: 0.25rem; }
	.drop-title { font-size: 1rem; font-weight: 600; color: var(--text-2); }
	.drop-sub { font-size: 0.875rem; color: var(--text-3); }
	.browse-link { color: var(--accent); font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }

	.add-more { padding: 0.85rem 1.25rem; }
	.add-btn {
		display: inline-flex; align-items: center; gap: 0.5rem;
		font-size: 0.82rem; font-weight: 600; color: var(--text-3); cursor: pointer;
		padding: 0.35rem 0.85rem; border-radius: 7px; border: 1px dashed var(--border-mid);
		transition: var(--transition);
	}
	.add-btn:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

	/* FILE LIST */
	.file-list { display: flex; flex-direction: column; gap: 0.6rem; }

	.list-top {
		display: flex; align-items: center; justify-content: space-between;
		flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.25rem;
	}
	.summary { display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-3); align-items: center; }
	.summary strong { color: var(--text); }
	.saved strong { color: #2f9e44; }
	.list-actions { display: flex; gap: 0.6rem; }

	.btn-compress {
		padding: 0.5rem 1.1rem; background: var(--accent); color: white;
		border: none; border-radius: var(--radius); font-weight: 600; font-size: 0.875rem;
		transition: var(--transition); box-shadow: 0 1px 3px rgba(59,91,219,0.2);
	}
	.btn-compress:hover:not(:disabled) { background: var(--accent-mid); box-shadow: 0 4px 10px rgba(59,91,219,0.3); }
	.btn-compress:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-dl-all {
		padding: 0.5rem 1rem; border: 1px solid rgba(47,158,68,0.3);
		background: rgba(47,158,68,0.08); color: #2f9e44;
		border-radius: var(--radius); font-weight: 600; font-size: 0.875rem; transition: var(--transition);
	}
	.btn-dl-all:hover { background: rgba(47,158,68,0.14); }

	.btn-clear {
		padding: 0.5rem 0.9rem; border: 1px solid var(--border);
		background: none; color: var(--text-3); border-radius: var(--radius);
		font-size: 0.875rem; transition: var(--transition);
	}
	.btn-clear:hover { border-color: var(--accent2); color: var(--accent2); }

	/* FILE CARD */
	.file-card {
		display: flex; align-items: center; gap: 0.85rem;
		padding: 0.9rem 1.1rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: var(--radius);
		transition: border-color var(--transition), box-shadow var(--transition);
		position: relative; overflow: hidden;
	}
	.file-card.is-done { border-color: rgba(47,158,68,0.25); }
	.file-card.is-error { border-color: rgba(224,49,49,0.25); }
	.file-card.is-compressing { border-color: rgba(59,91,219,0.2); }

	.fc-type { font-size: 1.35rem; flex-shrink: 0; }
	.fc-info { flex: 1; min-width: 0; }
	.fc-name {
		font-size: 0.875rem; font-weight: 600; color: var(--text);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.fc-meta {
		display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
		font-size: 0.75rem; font-family: var(--mono); color: var(--text-3); margin-top: 0.15rem;
	}
	.arrow { color: var(--text-4); }
	.compressed { color: var(--text-2); font-weight: 500; }
	.ratio.positive { color: #2f9e44; font-weight: 600; }
	.ratio:not(.positive) { color: var(--accent2); }
	.err-msg { color: var(--accent2); font-size: 0.72rem; }

	.progress-track {
		height: 3px; background: var(--border); border-radius: 2px;
		overflow: hidden; margin-top: 0.4rem;
	}
	.progress-fill {
		height: 100%; background: var(--accent);
		border-radius: 2px; transition: width 0.15s ease;
	}

	.fc-actions { display: flex; gap: 0.4rem; align-items: center; flex-shrink: 0; }
	.fc-pct { font-size: 0.78rem; font-family: var(--mono); color: var(--text-3); min-width: 32px; text-align: right; }

	.fc-btn {
		padding: 0.35rem 0.8rem; border-radius: 7px; font-size: 0.78rem; font-weight: 600;
		border: 1px solid var(--border); background: var(--bg2); color: var(--text-3);
		transition: var(--transition);
	}
	.fc-btn:hover { border-color: var(--border-mid); color: var(--text); }
	.fc-btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
	.fc-btn.primary:hover { background: var(--accent-mid); border-color: var(--accent-mid); }
	.fc-btn.icon { padding: 0.35rem 0.45rem; }
	.fc-btn.icon:hover { border-color: var(--accent2); color: var(--accent2); }

	/* TIPS */
	.tips { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 2.5rem; }
	.tip {
		font-size: 0.8rem; color: var(--text-4); font-family: var(--mono);
		padding: 0.6rem 0.9rem; background: var(--bg2);
		border: 1px solid var(--border); border-radius: 8px;
	}

	@media (max-width: 600px) {
		.settings-row { gap: 1rem; }
		.slider { width: 130px; }
		.fc-name { max-width: 180px; }
		.list-top { flex-direction: column; align-items: flex-start; }
	}
</style>
