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
		{ href: '/compress/pdf',    icon: '📄', label: 'PDF',       sub: 'Re-encode pages · PDF.js',       
		     color: '#c92a2a',        bg: 'rgba(224,49,49,.08)' },
		{ href: '/compress/audio',  icon: '🎵', label: 'Audio',     sub: 'MP3 · AAC · Opus · FLAC · WAV',      color: '#2f9e44',        bg: 'rgba(47,158,68,.08)' },
		{ href: '/compress/gif',    icon: '🎞️', label: 'GIF',       sub: 'Optimise or convert to WebM',         color: '#e67700',        bg: 'rgba(230,119,0,.08)' },
	];
	
	function buildOptions(): CompressOptions {
		const o: CompressOptions = { format: outputFormat, quality: quality / 100 };
		if (maxDimension > 0) { 
			o.maxWidth = maxDimension; o.maxHeight = maxDimension;
		}
		if (targetMode === 'size' && targetSizeKB) { 
			o.targetSizeKB = parseFloat(targetSizeKB); delete o.quality; 
		}
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
		} catch (err: any) { 
			entry.error = err.message ?? 'Unknown error'; entry.status = 'error'; 
		}
		files = files;
	}

	function compressAll() { 
		files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); });
	}

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const fmt = entry.result.format.toLowerCase();
		const ext = fmt.includes('webp') ? 'webp' : fmt.includes('jpeg') ?
		'jpg' : fmt.includes('png') ? 'png'
			: fmt.includes('avif') ? 'avif' : fmt.includes('pdf') ? 'pdf' : fmt.includes('webm') ? 'webm'
			: fmt.includes('mp4') ?
		'mp4' : fmt.includes('mp3') ? 'mp3' : fmt.includes('aac') ? 'm4a'
			: fmt.includes('opus') ? 'opus' : fmt.includes('flac') ? 'flac' : fmt.includes('wav') ?
		'wav'
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
	
	// FIX: Safely calculate totalSaved without causing undefined properties on idle files
	$: totalSaved = files.reduce((acc, f) => {
		return acc + (f.result ? (f.file.size - f.result.compressedSize) : 0);
	}, 0);
</script>

<svelte:head><title>Compress Files — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<h1>File Compressor</h1>
		<p>Images, video, PDF, audio, GIF — all compressed locally.
		Nothing leaves your browser.</p>
	</div>

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
		icon="📂" title="Drop any files here" subtitle="
