<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressImage, getBestFormat } from '$lib/compressImage';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, ImageFormat } from '$lib/types';

	let files: FileEntry[] = [];
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

	function addFiles(fs: File[]) {
		const valid = fs.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|avif|bmp|tiff|heic|heif|gif)$/i.test(f.name));
		files = [...files, ...valid.map(f => ({ id: uid(), file: f, type: 'image' as const, status: 'idle' as const, progress: 0, options: buildOptions() }))];
	}

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
		const extMap: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/avif': 'avif' };
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace(/\.[^.]+$/, '') + '_compressed.' + (extMap[format] ?? 'webp')
		});
		a.click();
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
	$: effectiveFormat = getBestFormat(format);
	$: formatMismatch = effectiveFormat !== format;
</script>

<svelte:head><title>Image Compression — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="badge img">🖼️ Images</span>
			<h1>Image Compressor</h1>
		</div>
		<p>GPU-decoded · OffscreenCanvas · JPEG · PNG · WebP · AVIF · BMP · TIFF · HEIC</p>
		{#if formatMismatch}
			<div class="compat-warn">⚠ Your browser doesn't support {format.split('/')[1].toUpperCase()} encoding — using {effectiveFormat.split('/')[1].toUpperCase()} instead.</div>
		{/if}
	</div>

	<div class="settings-card">
		<div class="row">
			<div class="field">
				<span class="label">Mode</span>
				<div class="seg">
					<button class:on={mode==='quality'}    on:click={() => mode='quality'}>Quality</button>
					<button class:on={mode==='targetSize'} on:click={() => mode='targetSize'}>Target size</button>
				</div>
			</div>
			{#if mode === 'quality'}
				<div class="field">
					<span class="label">Quality <strong>{quality}%</strong></span>
					<input type="range" min="10" max="99" bind:value={quality} class="slider" />
				</div>
			{:else}
				<div class="field">
					<span class="label">Target (KB)</span>
					<input type="number" bind:value={targetSizeKB} placeholder="e.g. 200" class="ti" min="1"/>
				</div>
			{/if}
			<div class="field">
				<span class="label">Output format</span>
				<select bind:value={format} class="si">
					<option value="image/webp">WebP (recommended)</option>
					<option value="image/jpeg">JPEG</option>
					<option value="image/png">PNG (lossless)</option>
					<option value="image/avif">AVIF (best ratio)</option>
				</select>
			</div>
			<div class="field">
				<span class="label">Max size</span>
				<select bind:value={maxDim} class="si">
					<option value={0}>Original</option>
					<option value={4096}>4096 px</option>
					<option value={2048}>2048 px</option>
					<option value={1920}>1920 px</option>
					<option value={1280}>1280 px</option>
					<option value={800}>800 px</option>
				</select>
			</div>
			<div class="field end">
				<label class="check"><input type="checkbox" bind:checked={stripExif} /> Strip EXIF</label>
			</div>
		</div>
	</div>

	<DropZone accept="image/*,.heic,.heif,.tiff,.tif" {hasFiles} onFiles={addFiles}
		icon="🖼️" title="Drop images here" subtitle="JPEG · PNG · WebP · AVIF · BMP · TIFF · HEIC" />

	{#if hasFiles}
		<div class="list-bar">
			<div class="bar-left">
				{#if doneCount > 0 && totalSaved > 0}
					<span class="saved-badge">💾 {formatBytes(totalSaved)} saved</span>
				{:else}
					<span class="count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
				{/if}
			</div>
			<div class="bar-right">
				<button class="btn-primary" on:click={compressAll} disabled={anyCompressing}>
					{anyCompressing ? 'Compressing…' : '⚡ Compress all'}
				</button>
				{#if doneCount > 0}
					<button class="btn-ghost" on:click={() => files.filter(f=>f.status==='done').forEach(download)}>⬇ All</button>
				{/if}
				<button class="btn-ghost danger" on:click={() => files = []}>Clear</button>
			</div>
		</div>

		<div class="file-list">
			{#each files as entry (entry.id)}
				<FileCard {entry}
					onCompress={compress}
					onDownload={download}
					onRemove={(id) => files = files.filter(f => f.id !== id)}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
	.back-link { font-size: .82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); }
	.back-link:hover { color: var(--accent); }
	.page-header { margin-bottom: 2rem; }
	.header-top { display: flex; align-items: center; gap: .75rem; margin: .5rem 0 .4rem; }
	.badge { padding: .2rem .65rem; border-radius: 6px; font-size: .8rem; font-weight: 600; }
	.badge.img { background: rgba(59,91,219,.1); border: 1px solid rgba(59,91,219,.2); color: var(--accent); }
	h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); }
	.page-header p { font-size: .82rem; color: var(--text-3); margin-top: .25rem; font-family: var(--mono); }
	.compat-warn { margin-top: .6rem; padding: .4rem .85rem; background: rgba(230,119,0,.08); border: 1px solid rgba(230,119,0,.25); border-radius: 7px; font-size: .78rem; font-family: var(--mono); color: #e67700; }

	.settings-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.field.end { justify-content: flex-end; padding-bottom: 2px; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.seg { display: flex; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg button { padding: .42rem .85rem; background: none; border: none; font-size: .8rem; font-weight: 500; color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.seg button.on { background: var(--accent); color: white; font-weight: 600; }
	.slider { -webkit-appearance: none; width: 160px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.ti, .si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.ti:focus, .si:focus { border-color: var(--accent); }
	.ti { width: 110px; }
	.check { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: var(--text-2); cursor: pointer; font-weight: 500; }
	.check input { accent-color: var(--accent); }

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
	.file-list { display: flex; flex-direction: column; gap: .6rem; }
</style>
