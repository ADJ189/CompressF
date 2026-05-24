<script lang="ts">
	import { onMount } from 'svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressVideo } from '$lib/compressVideo';
	import { detectCaps } from '$lib/browserCaps';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, BrowserCaps } from '$lib/types';

	let files: FileEntry[] = [];
	let caps: BrowserCaps | null = null;
	let mode: 'crf' | 'bitrate' | 'targetSize' = 'crf';
	let crfQuality = 75;
	let bitrate = 2000;
	let targetSizeMB = '';
	let codec: 'h264' | 'h265' | 'vp9' | 'vp8' | 'av1' = 'h264';
	let preset: 'ultrafast' | 'fast' | 'medium' | 'slow' = 'fast';
	let maxWidth = 0;
	let fps = 0;

	onMount(async () => { caps = await detectCaps(); });

	function buildOptions(): CompressOptions {
		const o: CompressOptions = { videoCodec: codec, videoPreset: preset };
		if (mode === 'crf')        o.quality = crfQuality / 100;
		if (mode === 'bitrate')    o.videoBitrate = bitrate * 1000;
		if (mode === 'targetSize') o.targetSizeKB = (parseFloat(targetSizeMB) || 100) * 1024;
		if (maxWidth > 0)          o.maxWidth = maxWidth;
		if (fps > 0)               o.fps = fps;
		return o;
	}

	function addFiles(fs: File[]) {
		const valid = fs.filter(f => f.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|flv|wmv|ogv|3gp)$/i.test(f.name));
		files = [...files, ...valid.map(f => ({ id: uid(), file: f, type: 'video' as const, status: 'idle' as const, progress: 0, options: buildOptions() }))];
	}

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressVideo(entry.file, entry.options, p => { entry.progress = p; files = files; });
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message; entry.status = 'error'; }
		files = files;
	}

	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace(/\.[^.]+$/, '') + '_compressed.mp4'
		});
		a.click();
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: crf = Math.round(18 + (1 - crfQuality / 100) * 17);
</script>

<svelte:head>
	<title>Video Compressor — Compressly</title>
	<link rel="icon" href="/logo-video.svg" type="image/svg+xml" />
	<meta name="description" content="Compress MP4, WebM, MOV video in your browser using FFmpeg.wasm. H.264, H.265, VP9, AV1. No upload." />
	<meta property="og:title" content="Video Compressor — Compressly" />
	<meta property="og:description" content="Compress video privately in your browser. FFmpeg.wasm · H.264 · VP9 · AV1." />
	<meta property="og:url" content="https://compressly-9jk.pages.dev/compress/video" />
	<link rel="canonical" href="https://compressly-9jk.pages.dev/compress/video" />
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="badge video">🎬 Video</span>
			<h1>Video Encoder</h1>
		</div>
		<p>FFmpeg.wasm (CDN) · WebCodecs GPU · MediaRecorder — auto-selected per browser</p>

		{#if caps}
			<div class="caps-row">
				<span class="cap browser">{caps.browser}</span>
				{#each caps.videoEngines as e}
					<span class="cap" class:primary={e.startsWith('FFmpeg')} class:gpu={e.includes('GPU')}>{e}</span>
				{/each}
			</div>
			{#if caps.warnings.length > 0}
				<div class="warns">
					{#each caps.warnings as w}<div class="warn">⚠ {w}</div>{/each}
				</div>
			{/if}
		{/if}
	</div>

	<div class="settings-card">
		<div class="row">
			<div class="field">
				<span class="label">Mode</span>
				<div class="seg">
					<button class:on={mode==='crf'}        on:click={() => mode='crf'}>Quality</button>
					<button class:on={mode==='bitrate'}    on:click={() => mode='bitrate'}>Bitrate</button>
					<button class:on={mode==='targetSize'} on:click={() => mode='targetSize'}>Target size</button>
				</div>
			</div>
			{#if mode === 'crf'}
				<div class="field">
					<span class="label">Quality <strong>{crfQuality}%</strong> <em>CRF {crf}</em></span>
					<input type="range" min="20" max="99" bind:value={crfQuality} class="slider" />
				</div>
			{:else if mode === 'bitrate'}
				<div class="field">
					<span class="label">Bitrate (kbps)</span>
					<input type="number" bind:value={bitrate} min="100" max="50000" class="ti" />
				</div>
			{:else}
				<div class="field">
					<span class="label">Target size (MB)</span>
					<input type="number" bind:value={targetSizeMB} placeholder="e.g. 50" class="ti" min="1" />
				</div>
			{/if}
			<div class="field">
				<span class="label">Codec</span>
				<select bind:value={codec} class="si">
					<option value="h264">H.264 — best compat</option>
					<option value="h265">H.265 — 2× smaller</option>
					<option value="vp9">VP9 — open, efficient</option>
					<option value="vp8">VP8 — legacy web</option>
					<option value="av1">AV1 — best ratio</option>
				</select>
			</div>
			<div class="field">
				<span class="label">Preset</span>
				<select bind:value={preset} class="si">
					<option value="ultrafast">Ultrafast</option>
					<option value="fast">Fast ✓</option>
					<option value="medium">Medium</option>
					<option value="slow">Slow (best)</option>
				</select>
			</div>
			<div class="field">
				<span class="label">Max width</span>
				<select bind:value={maxWidth} class="si">
					<option value={0}>Original</option>
					<option value={3840}>3840 (4K)</option>
					<option value={1920}>1920 (FHD)</option>
					<option value={1280}>1280 (HD)</option>
					<option value={854}>854 (480p)</option>
					<option value={640}>640 (360p)</option>
				</select>
			</div>
			<div class="field">
				<span class="label">FPS</span>
				<select bind:value={fps} class="si">
					<option value={0}>Original</option>
					<option value={60}>60</option>
					<option value={30}>30</option>
					<option value={24}>24</option>
					<option value={15}>15</option>
				</select>
			</div>
		</div>
	</div>

	<DropZone accept="video/*,.mkv,.avi,.flv,.wmv,.3gp" {hasFiles} onFiles={addFiles}
		icon="🎬" title="Drop video files here" subtitle="MP4 · WebM · MOV · MKV · AVI · FLV · 3GP" />

	{#if hasFiles}
		<div class="list-bar">
			<div class="bar-left">
				<span class="count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
				{#if doneCount > 0}<span class="done-note">{doneCount} encoded</span>{/if}
			</div>
			<div class="bar-right">
				<button class="btn-primary" on:click={compressAll} disabled={anyCompressing}>
					{anyCompressing ? 'Encoding…' : '⚡ Encode all'}
				</button>
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

	<div class="info-tip">💡 FFmpeg.wasm downloads ~30 MB on first use and is then cached. Subsequent compressions are instant.</div>
</div>

<style>
	.page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
	.back-link { font-size: .82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); }
	.back-link:hover { color: var(--accent); }
	.page-header { margin-bottom: 2rem; }
	.header-top { display: flex; align-items: center; gap: .75rem; margin: .5rem 0 .4rem; }
	.badge { padding: .2rem .65rem; border-radius: 6px; font-size: .8rem; font-weight: 600; }
	.badge.video { background: rgba(112,72,232,.1); border: 1px solid rgba(112,72,232,.2); color: #7048e8; }
	h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); }
	.page-header p { font-size: .82rem; color: var(--text-3); margin-top: .25rem; font-family: var(--mono); }
	.caps-row { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .75rem; }
	.cap { padding: .2rem .65rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; font-size: .72rem; font-family: var(--mono); color: var(--text-3); }
	.cap.browser { border-color: var(--border-mid); color: var(--text-2); font-weight: 700; }
	.cap.primary { background: var(--accent-soft); border-color: rgba(59,91,219,.2); color: var(--accent); }
	.cap.gpu { background: rgba(47,158,68,.08); border-color: rgba(47,158,68,.2); color: #2f9e44; }
	.warns { margin-top: .6rem; display: flex; flex-direction: column; gap: .35rem; }
	.warn { font-size: .78rem; font-family: var(--mono); color: #e67700; background: rgba(230,119,0,.08); border: 1px solid rgba(230,119,0,.2); padding: .4rem .75rem; border-radius: 7px; }

	.settings-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.label em { color: var(--text-4); font-style: normal; font-size: .68rem; font-family: var(--mono); }
	.seg { display: flex; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg button { padding: .42rem .85rem; background: none; border: none; font-size: .8rem; font-weight: 500; color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.seg button.on { background: var(--accent); color: white; font-weight: 600; }
	.slider { -webkit-appearance: none; width: 160px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.ti, .si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.ti:focus, .si:focus { border-color: var(--accent); }
	.ti { width: 110px; }

	.list-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; margin-bottom: .75rem; }
	.bar-left { display: flex; align-items: center; gap: .75rem; }
	.bar-right { display: flex; align-items: center; gap: .5rem; }
	.count { font-size: .82rem; color: var(--text-3); font-family: var(--mono); }
	.done-note { font-size: .78rem; color: #2f9e44; font-family: var(--mono); }
	.btn-primary { padding: .5rem 1.1rem; background: var(--accent); color: white; border: none; border-radius: var(--radius); font-weight: 600; font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-mid); }
	.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
	.btn-ghost { padding: .5rem .9rem; border: 1px solid var(--border); background: none; color: var(--text-3); border-radius: var(--radius); font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-ghost:hover { border-color: var(--border-mid); color: var(--text); }
	.btn-ghost.danger:hover { border-color: var(--accent2); color: var(--accent2); }
	.file-list { display: flex; flex-direction: column; gap: .6rem; }
	.info-tip { margin-top: 2rem; font-size: .8rem; color: var(--text-4); font-family: var(--mono); padding: .65rem 1rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
</style>
