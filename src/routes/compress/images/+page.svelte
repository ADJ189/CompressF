<script lang="ts">
	import { compressImage } from '$lib/compressImage';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, ImageFormat } from '$lib/types';

	let files: FileEntry[] = [];
	let dragOver = false;
	let mode: 'quality' | 'targetSize' = 'quality';
	let quality = 82;
	let targetSizeKB = '';
	let format: ImageFormat = 'image/webp';
	let maxDim = 0;
	let stripExif = true;

	function buildOptions(): CompressOptions {
		const o: CompressOptions = { format, stripMetadata: stripExif };
		if (maxDim > 0) { o.maxWidth = maxDim; o.maxHeight = maxDim; }
		if (mode === 'quality') o.quality = quality / 100;
		else o.targetSizeKB = parseFloat(targetSizeKB) || 200;
		return o;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault(); dragOver = false;
		if (e.dataTransfer?.files) add(Array.from(e.dataTransfer.files));
	}
	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		if (el.files) add(Array.from(el.files));
		el.value = '';
	}
	function add(fs: File[]) {
		for (const f of fs) {
			if (!f.type.startsWith('image/')) continue;
			files = [...files, { id: uid(), file: f, type: 'image', status: 'idle', progress: 0, options: buildOptions() }];
		}
	}
	function remove(id: string) { files = files.filter(f => f.id !== id); }

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressImage(entry.file, entry.options, p => { entry.progress = p; files = files; });
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message; entry.status = 'error'; }
		files = files;
	}
	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }
	function download(entry: FileEntry) {
		if (!entry.result) return;
		const ext = entry.result.format.includes('webp') ? 'webp' : entry.result.format.includes('jpeg') ? 'jpg' : entry.result.format.includes('png') ? 'png' : 'avif';
		const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(entry.result.blob), download: entry.file.name.replace(/\.[^.]+$/, '') + '_compressed.' + ext });
		a.click();
	}

	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
</script>

<svelte:head><title>Image Compression — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="format-badge img">🖼️ Images</span>
			<h1>Image Compressor</h1>
		</div>
		<p>GPU-decoded via <code>createImageBitmap()</code> · Re-encoded with OffscreenCanvas · SIMD-optimised WebP/AVIF</p>
	</div>

	<div class="settings-card">
		<div class="settings-row">
			<div class="fg">
				<span class="fl">Mode</span>
				<div class="seg">
					<button class:on={mode==='quality'}    on:click={() => mode='quality'}>Quality</button>
					<button class:on={mode==='targetSize'} on:click={() => mode='targetSize'}>Target size</button>
				</div>
			</div>
			{#if mode === 'quality'}
				<div class="fg">
					<span class="fl">Quality <strong>{quality}%</strong></span>
					<input type="range" min="10" max="99" bind:value={quality} class="slider" />
				</div>
			{:else}
				<div class="fg">
					<span class="fl">Target (KB)</span>
					<input type="number" bind:value={targetSizeKB} placeholder="e.g. 200" class="ti" min="1"/>
				</div>
			{/if}
			<div class="fg">
				<span class="fl">Output format</span>
				<select bind:value={format} class="si">
					<option value="image/webp">WebP (recommended)</option>
					<option value="image/jpeg">JPEG</option>
					<option value="image/png">PNG (lossless)</option>
					<option value="image/avif">AVIF (best ratio)</option>
				</select>
			</div>
			<div class="fg">
				<span class="fl">Max dimension</span>
				<select bind:value={maxDim} class="si">
					<option value={0}>Original</option>
					<option value={4096}>4096 px</option>
					<option value={2048}>2048 px</option>
					<option value={1920}>1920 px</option>
					<option value={1280}>1280 px</option>
					<option value={800}>800 px</option>
				</select>
			</div>
			<div class="fg checkbox-fg">
				<label class="cl"><input type="checkbox" bind:checked={stripExif} /> Strip EXIF metadata</label>
			</div>
		</div>
	</div>

	<div class="dropzone" class:drag-active={dragOver}
		on:dragover|preventDefault={() => dragOver = true}
		on:dragleave={() => dragOver = false}
		on:drop={handleDrop}
		role="button" tabindex="0">
		{#if files.length === 0}
			<div class="di">
				<div class="dicon">🖼️</div>
				<p class="dt">Drop images here</p>
				<p class="ds">JPEG · PNG · WebP · AVIF · GIF · BMP</p>
				<label class="bb">Browse <input type="file" multiple accept="image/*" on:change={handleInput} style="display:none"/></label>
			</div>
		{:else}
			<label class="ab">+ Add more <input type="file" multiple accept="image/*" on:change={handleInput} style="display:none"/></label>
		{/if}
	</div>

	{#if files.length > 0}
		<div class="la">
			<button class="bp" on:click={compressAll} disabled={anyCompressing}>{anyCompressing ? 'Compressing…' : '⚡ Compress all'}</button>
			{#if doneCount > 0 && totalSaved > 0}
				<span class="saved">💾 Saved {formatBytes(totalSaved)}</span>
			{/if}
		</div>
		<div class="fl-list">
			{#each files as entry (entry.id)}
				<div class="fc" class:done={entry.status==='done'} class:err={entry.status==='error'}>
					<div class="fc-icon">🖼️</div>
					<div class="fc-info">
						<div class="fc-name">{entry.file.name}</div>
						<div class="fc-meta">
							<span>{formatBytes(entry.file.size)}</span>
							{#if entry.result}
								<span class="arr">→</span>
								<span class="cs">{formatBytes(entry.result.compressedSize)}</span>
								<span class="rt" class:pos={entry.result.compressionRatio>1}>
									{entry.result.compressionRatio>1 ? `−${(100-100/entry.result.compressionRatio).toFixed(1)}%` : 'larger'}
								</span>
								{#if entry.result.width}<span class="dim">{entry.result.width}×{entry.result.height}</span>{/if}
							{/if}
						</div>
						{#if entry.status==='compressing'}
							<div class="pt"><div class="pf" style="width:{entry.progress}%"></div></div>
						{/if}
						{#if entry.status==='error'}<div class="em">⚠ {entry.error}</div>{/if}
					</div>
					<div class="fca">
						{#if entry.status==='idle'||entry.status==='error'}
							<button class="fb primary" on:click={() => compress(entry)}>Compress</button>
						{:else if entry.status==='compressing'}
							<span class="pct">{entry.progress}%</span>
						{:else if entry.status==='done'}
							<button class="fb" on:click={() => download(entry)}>⬇ Save</button>
						{/if}
						<button class="fb icon" on:click={() => remove(entry.id)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page{max-width:860px;margin:0 auto;padding:3rem 1.5rem 5rem}
	.back-link{font-size:.82rem;color:var(--text-3);font-family:var(--mono);transition:color var(--transition)}
	.back-link:hover{color:var(--accent)}
	.page-header{margin-bottom:2rem}
	.header-top{display:flex;align-items:center;gap:.75rem;margin:.5rem 0 .4rem}
	.format-badge{padding:.2rem .65rem;border-radius:6px;font-size:.8rem;font-weight:600}
	.format-badge.img{background:rgba(59,91,219,.1);border:1px solid rgba(59,91,219,.2);color:var(--accent)}
	.page-header h1{font-size:1.9rem;font-weight:800;letter-spacing:-.025em;color:var(--text)}
	.page-header p{font-size:.88rem;color:var(--text-3);margin-top:.25rem;font-family:var(--mono)}
	.page-header code{background:var(--bg2);padding:.1em .35em;border-radius:4px;color:var(--accent3)}
	.settings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.25rem;box-shadow:var(--shadow-sm)}
	.settings-row{display:flex;flex-wrap:wrap;gap:1.1rem;align-items:flex-end}
	.fg{display:flex;flex-direction:column;gap:.4rem}
	.fl{font-size:.75rem;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em}
	.fl strong{color:var(--accent);text-transform:none;letter-spacing:0}
	.seg{display:flex;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
	.seg button{padding:.42rem .85rem;background:none;border:none;font-size:.8rem;font-weight:500;color:var(--text-3);transition:var(--transition)}
	.seg button.on{background:var(--accent);color:white;font-weight:600}
	.slider{-webkit-appearance:none;width:160px;height:4px;background:var(--border-mid);border-radius:2px;outline:none;cursor:pointer}
	.slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:var(--accent);border-radius:50%;box-shadow:0 0 0 3px var(--accent-soft)}
	.ti,.si{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:.45rem .75rem;color:var(--text);font-size:.875rem;outline:none;transition:border-color var(--transition)}
	.ti:focus,.si:focus{border-color:var(--accent)}
	.ti{width:120px}
	.checkbox-fg{justify-content:flex-end;padding-bottom:2px}
	.cl{display:flex;align-items:center;gap:.5rem;font-size:.875rem;color:var(--text-2);cursor:pointer;font-weight:500}
	.cl input{accent-color:var(--accent)}
	.dropzone{border:2px dashed var(--border-mid);border-radius:var(--radius-lg);background:var(--surface);transition:var(--transition);margin-bottom:1.25rem}
	.dropzone.drag-active{border-color:var(--accent);background:var(--accent-soft)}
	.di{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2rem;gap:.6rem;text-align:center}
	.dicon{font-size:2.5rem}
	.dt{font-size:1rem;font-weight:600;color:var(--text-2)}
	.ds{font-size:.875rem;color:var(--text-3)}
	.bb{margin-top:.5rem;padding:.5rem 1.25rem;background:var(--bg2);border:1px solid var(--border-mid);border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;transition:var(--transition);color:var(--text-2)}
	.bb:hover{background:var(--accent);border-color:var(--accent);color:white}
	.ab{display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1rem;font-size:.82rem;font-weight:600;color:var(--text-3);cursor:pointer;border-radius:8px;transition:var(--transition)}
	.ab:hover{color:var(--accent)}
	.la{display:flex;align-items:center;gap:1rem;margin-bottom:.75rem}
	.bp{padding:.55rem 1.2rem;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-weight:600;font-size:.9rem;transition:var(--transition)}
	.bp:hover:not(:disabled){background:var(--accent-mid)}
	.bp:disabled{opacity:.5;cursor:not-allowed}
	.saved{font-size:.82rem;color:#2f9e44;font-family:var(--mono);font-weight:600}
	.fl-list{display:flex;flex-direction:column;gap:.6rem}
	.fc{display:flex;align-items:center;gap:.85rem;padding:.9rem 1.1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);transition:border-color var(--transition)}
	.fc.done{border-color:rgba(47,158,68,.25)}
	.fc.err{border-color:rgba(224,49,49,.25)}
	.fc-icon{font-size:1.35rem;flex-shrink:0}
	.fc-info{flex:1;min-width:0}
	.fc-name{font-size:.875rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.fc-meta{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-family:var(--mono);color:var(--text-3);margin-top:.2rem;flex-wrap:wrap}
	.arr{color:var(--text-4)}
	.cs{color:var(--text-2);font-weight:500}
	.rt.pos{color:#2f9e44;font-weight:600}
	.dim{color:var(--text-4)}
	.pt{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:.4rem}
	.pf{height:100%;background:var(--accent);transition:width .15s ease;border-radius:2px}
	.em{font-size:.78rem;color:var(--accent2);margin-top:.25rem}
	.fca{display:flex;gap:.4rem;flex-shrink:0}
	.pct{font-size:.78rem;font-family:var(--mono);color:var(--text-3);min-width:32px;text-align:right}
	.fb{padding:.35rem .8rem;border-radius:7px;font-size:.78rem;font-weight:600;border:1px solid var(--border);background:var(--bg2);color:var(--text-3);transition:var(--transition)}
	.fb:hover{border-color:var(--border-mid);color:var(--text)}
	.fb.primary{background:var(--accent);border-color:var(--accent);color:white}
	.fb.primary:hover{background:var(--accent-mid)}
	.fb.icon{padding:.35rem .5rem}
	.fb.icon:hover{border-color:var(--accent2);color:var(--accent2)}
</style>
