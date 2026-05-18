<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressImage } from '$lib/compressImage';
	import { compressPdf } from '$lib/compressPdf';
	import { compressVideo } from '$lib/compressVideo';
	import { compressAudio } from '$lib/compressAudio';
	import { compressGif } from '$lib/compressGif';
	import { optimizeSvg } from '$lib/optimizeSvg';
	import { detectFileType, formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, ImageFormat } from '$lib/types';
	import { browser } from '$app/environment';

	let files: FileEntry[] = [];
	let quality = 82;
	let targetMode: 'quality' | 'size' = 'quality';
	let targetSizeKB = '';
	let outputFormat: ImageFormat = 'image/webp';
	let maxDimension = 0;

	const tools = [
		{ href: '/compress/images', icon: '🖼️', label: 'Images',    sub: 'JPEG · PNG · WebP · AVIF · HEIC',   color: 'var(--accent)', bg: 'rgba(59,91,219,.08)' },
		{ href: '/compress/video',  icon: '🎬', label: 'Video',     sub: 'H.264 · H.265 · VP9 · AV1',          color: '#7048e8',        bg: 'rgba(112,72,232,.08)' },
		{ href: '/compress/pdf',    icon: '📄', label: 'PDF',       sub: 'Re-encode pages · PDF.js',            color: '#c92a2a',        bg: 'rgba(224,49,49,.08)' },
		{ href: '/compress/audio',  icon: '🎵', label: 'Audio',     sub: 'MP3 · AAC · Opus · FLAC · WAV',      color: '#2f9e44',        bg: 'rgba(47,158,68,.08)' },
		{ href: '/compress/gif',    icon: '🎞️', label: 'GIF',       sub: 'Optimise or convert to WebM',         color: '#e67700',        bg: 'rgba(230,119,0,.08)' },
	];

	function buildOptions(): CompressOptions {
		const o: CompressOptions = { format: outputFormat, quality: quality / 100 };
		if (maxDimension > 0) { o.maxWidth = maxDimension; o.maxHeight = maxDimension; }
		if (targetMode === 'size' && targetSizeKB) { o.targetSizeKB = parseFloat(targetSizeKB); delete o.quality; }
		return o;
	}

	function addFiles(fs: File[]) {
		for (const file of fs) {
			const type = detectFileType(file);
			if (type === 'unknown') continue;
			files = [...files, { id: uid(), file, type, status: 'idle', progress: 0, options: buildOptions() }];
		}
	}

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		const prog = (p: number) => { entry.progress = p; files = files; };
		try {
			if      (entry.type === 'image') entry.result = await compressImage(entry.file, entry.options, prog);
			else if (entry.type === 'pdf')   entry.result = await compressPdf(entry.file, entry.options, prog);
			else if (entry.type === 'video') entry.result = await compressVideo(entry.file, entry.options, prog);
			else if (entry.type === 'audio') entry.result = await compressAudio(entry.file, entry.options, prog);
			else if (entry.type === 'gif')   entry.result = await compressGif(entry.file, entry.options, prog);
			else if (entry.type === 'svg')   entry.result = await optimizeSvg(entry.file, prog);
			else throw new Error('Unsupported type');
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message ?? 'Unknown error'; entry.status = 'error'; }
		files = files;
	}

	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const fmt = entry.result.format.toLowerCase();
		const ext = fmt.includes('webp') ? 'webp' : fmt.includes('jpeg') ? 'jpg' : fmt.includes('png') ? 'png'
			: fmt.includes('avif') ? 'avif' : fmt.includes('pdf') ? 'pdf' : fmt.includes('webm') ? 'webm'
			: fmt.includes('mp4') ? 'mp4' : fmt.includes('mp3') ? 'mp3' : fmt.includes('aac') ? 'm4a'
			: fmt.includes('opus') ? 'opus' : fmt.includes('flac') ? 'flac' : fmt.includes('wav') ? 'wav'
			: fmt.includes('ogg') ? 'ogg' : fmt.includes('gif') ? 'gif' : fmt.includes('svg') ? 'svg' : 'bin';
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace(/\.[^.]+$/, '') + '_compressed.' + ext
		});
		a.click();
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
</script>

<svelte:head><title>Compress Files — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<h1>File Compressor</h1>
		<p>Images, video, PDF, audio, GIF — all compressed locally. Nothing leaves your browser.</p>
	</div>

	<!-- Tool cards -->
	<div class="tool-grid">
		{#each tools as t}
			<a href={t.href} class="tool-card" style="--c: {t.color}; --bg: {t.bg}">
				<span class="tc-icon">{t.icon}</span>
				<div class="tc-body">
					<strong>{t.label}</strong>
					<span>{t.sub}</span>
				</div>
				<svg class="tc-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
			</a>
		{/each}
	</div>

	<div class="divider"><span>or drop anything here for quick compression</span></div>

	<!-- Quick settings (images only) -->
	<div class="settings-card">
		<div class="row">
			<div class="field">
				<span class="label">Mode</span>
				<div class="seg">
					<button class:on={targetMode==='quality'} on:click={() => targetMode='quality'}>Quality</button>
					<button class:on={targetMode==='size'}    on:click={() => targetMode='size'}>Target size</button>
				</div>
			</div>
			{#if targetMode === 'quality'}
				<div class="field">
					<span class="label">Quality <strong>{quality}%</strong></span>
					<input type="range" min="10" max="99" bind:value={quality} class="slider" />
				</div>
			{:else}
				<div class="field">
					<span class="label">Target (KB)</span>
					<input type="number" bind:value={targetSizeKB} placeholder="e.g. 500" class="ti" min="1" />
				</div>
			{/if}
			<div class="field">
				<span class="label">Image format</span>
				<select bind:value={outputFormat} class="si">
					<option value="image/webp">WebP (recommended)</option>
					<option value="image/jpeg">JPEG</option>
					<option value="image/png">PNG (lossless)</option>
					<option value="image/avif">AVIF (best ratio)</option>
				</select>
			</div>
			<div class="field">
				<span class="label">Max dimension</span>
				<select bind:value={maxDimension} class="si">
					<option value={0}>Original</option>
					<option value={4096}>4096 px</option>
					<option value={2048}>2048 px</option>
					<option value={1920}>1920 px</option>
					<option value={1280}>1280 px</option>
					<option value={800}>800 px</option>
				</select>
			</div>
		</div>
	</div>

	<DropZone accept="image/*,video/*,audio/*,.pdf,.gif,.svg,.heic,.heif,.flac,.opus,.aiff,.aif,.mkv,.avi" {hasFiles} onFiles={addFiles}
		icon="📂" title="Drop any files here" subtitle="Images · PDF · Video · Audio · GIF · SVG" />

	{#if hasFiles}
		<div class="list-bar">
			<div class="bar-left">
				{#if doneCount > 0 && totalSaved > 0}
					<span class="saved-badge">💾 {formatBytes(totalSaved)} saved</span>
				{:else}
					<span class="count">{files.length} file{files.length !== 1 ? 's' : ''} queued</span>
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

	<div class="tips">
		<span class="tip">💡 For advanced video encoding options — codecs, bitrate, FPS — use the dedicated <a href="/compress/video">Video Encoder</a>.</span>
		<span class="tip">🔒 Nothing is uploaded. All processing runs locally using browser APIs and FFmpeg.wasm.</span>
	</div>
</div>

<style>
	.page { max-width: 920px; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
	h1 { font-size: 2rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); margin-bottom: .35rem; }
	.page-header { margin-bottom: 2rem; }
	.page-header p { font-size: .95rem; color: var(--text-3); }

	/* Tool grid */
	.tool-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .6rem; margin-bottom: 1.5rem; }
	.tool-card {
		display: flex; flex-direction: column; align-items: flex-start; gap: .5rem;
		padding: 1rem 1rem .85rem; background: var(--bg, var(--bg2));
		border: 1px solid var(--border); border-radius: var(--radius-lg);
		transition: var(--transition); cursor: pointer; position: relative; overflow: hidden;
	}
	.tool-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c); opacity: .7; }
	.tool-card:hover { border-color: var(--c); box-shadow: var(--shadow-md); transform: translateY(-2px); }
	.tc-icon { font-size: 1.5rem; }
	.tc-body { flex: 1; min-width: 0; }
	.tc-body strong { display: block; font-size: .82rem; font-weight: 700; color: var(--text); }
	.tc-body span { font-size: .68rem; font-family: var(--mono); color: var(--text-4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; margin-top: .15rem; }
	.tc-arrow { color: var(--text-4); margin-top: auto; align-self: flex-end; transition: transform var(--transition); }
	.tool-card:hover .tc-arrow { transform: translateX(3px); color: var(--c); }

	.divider { text-align: center; position: relative; margin: 1.25rem 0; }
	.divider::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border); }
	.divider span { position: relative; background: var(--bg); padding: 0 1rem; font-size: .78rem; color: var(--text-4); font-family: var(--mono); }

	/* Settings */
	.settings-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.seg { display: flex; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg button { padding: .42rem .9rem; background: none; border: none; font-size: .82rem; font-weight: 500; color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.seg button.on { background: var(--accent); color: white; font-weight: 600; }
	.slider { -webkit-appearance: none; width: 180px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.ti, .si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.ti:focus, .si:focus { border-color: var(--accent); }
	.ti { width: 120px; }

	/* List */
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

	.tips { display: flex; flex-direction: column; gap: .45rem; margin-top: 2rem; }
	.tip { font-size: .78rem; color: var(--text-4); font-family: var(--mono); padding: .55rem .9rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
	.tip a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }

	@media (max-width: 700px) {
		.tool-grid { grid-template-columns: 1fr 1fr; }
		.tc-body span { display: none; }
	}
	@media (max-width: 440px) {
		.tool-grid { grid-template-columns: 1fr; }
	}
</style>
