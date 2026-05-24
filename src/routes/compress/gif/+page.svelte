<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressGif } from '$lib/compressGif';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions } from '$lib/types';

	let files: FileEntry[] = [];
	let quality = 82;
	let gifToVideo = false;
	let maxWidth = 0;
	let fps = 0;

	function buildOptions(): CompressOptions {
		return { quality: quality / 100, gifToVideo, maxWidth: maxWidth || undefined, fps: fps || undefined };
	}

	function addFiles(fs: File[]) {
		const valid = fs.filter(f => f.type === 'image/gif' || f.name.toLowerCase().endsWith('.gif'));
		files = [...files, ...valid.map(f => ({ id: uid(), file: f, type: 'gif' as const, status: 'idle' as const, progress: 0, options: buildOptions() }))];
	}

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressGif(entry.file, entry.options, p => { entry.progress = p; files = files; });
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message; entry.status = 'error'; }
		files = files;
	}

	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const ext = gifToVideo ? 'webm' : 'gif';
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace('.gif', `_compressed.${ext}`)
		});
		a.click();
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
	$: colors = Math.round(16 + (quality / 100) * 240);
</script>

<svelte:head>
	<title>GIF Optimiser — Compressly</title>
	<link rel="icon" href="/logo-gif.svg" type="image/svg+xml" />
	<meta name="description" content="Optimise GIF files in your browser using two-pass palette generation, or convert to WebM for 70-95% size reduction. No upload." />
	<meta property="og:title" content="GIF Optimiser — Compressly" />
	<meta property="og:description" content="Optimise GIFs or convert to WebM. Two-pass palettegen via FFmpeg.wasm. Runs in your browser." />
	<meta property="og:url" content="https://compressly-9jk.pages.dev/compress/gif" />
	<link rel="canonical" href="https://compressly-9jk.pages.dev/compress/gif" />
</svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="badge gif">🎞️ GIF</span>
			<h1>GIF Optimiser</h1>
		</div>
		<p>Two-pass palettegen · paletteuse dithering · GIF-to-WebM conversion · FFmpeg.wasm</p>
	</div>

	<div class="settings-card">
		<div class="row">
			<div class="field">
				<span class="label">Output</span>
				<div class="seg">
					<button class:on={!gifToVideo} on:click={() => gifToVideo = false}>Optimised GIF</button>
					<button class:on={gifToVideo}  on:click={() => gifToVideo = true}>Convert to WebM</button>
				</div>
			</div>

			{#if !gifToVideo}
				<div class="field">
					<span class="label">Quality <strong>{quality}%</strong> <em>{colors} colours</em></span>
					<input type="range" min="10" max="99" bind:value={quality} class="slider" />
				</div>
				<div class="field">
					<span class="label">Max width</span>
					<select bind:value={maxWidth} class="si">
						<option value={0}>Original</option>
						<option value={800}>800 px</option>
						<option value={600}>600 px</option>
						<option value={480}>480 px</option>
						<option value={320}>320 px</option>
					</select>
				</div>
				<div class="field">
					<span class="label">FPS limit</span>
					<select bind:value={fps} class="si">
						<option value={0}>Original</option>
						<option value={24}>24 fps</option>
						<option value={15}>15 fps</option>
						<option value={10}>10 fps</option>
					</select>
				</div>
			{:else}
				<div class="field end">
					<div class="info-chip">VP9 WebM — typically 70–95% smaller than GIF</div>
				</div>
			{/if}
		</div>
	</div>

	<DropZone accept="image/gif,.gif" {hasFiles} onFiles={addFiles}
		icon="🎞️" title="Drop GIF files here" subtitle="Animated and static GIFs" />

	{#if hasFiles}
		<div class="list-bar">
			<div class="bar-left">
				{#if doneCount > 0 && totalSaved > 0}
					<span class="saved-badge">💾 {formatBytes(totalSaved)} saved</span>
				{:else}
					<span class="count">{files.length} GIF{files.length !== 1 ? 's' : ''}</span>
				{/if}
			</div>
			<div class="bar-right">
				<button class="btn-primary" on:click={compressAll} disabled={anyCompressing}>
					{anyCompressing ? 'Optimising…' : gifToVideo ? '⚡ Convert all to WebM' : '⚡ Optimise all'}
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

	<div class="tip-cards">
		<div class="tip-card">
			<strong>Optimised GIF</strong>
			<p>Two-pass FFmpeg encoding: first generates an optimal palette (up to 256 colours), then applies it with Bayer dithering. Same technique used by Gifsicle and ezgif.</p>
		</div>
		<div class="tip-card highlight">
			<strong>Convert to WebM ✨</strong>
			<p>GIFs are notoriously inefficient. Converting to WebM VP9 typically saves 70–95% while keeping identical visual quality. Use <code>&lt;video autoplay loop muted playsinline&gt;</code> in HTML.</p>
		</div>
	</div>
</div>

<style>
	.page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
	.back-link { font-size: .82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); }
	.back-link:hover { color: var(--accent); }
	.page-header { margin-bottom: 2rem; }
	.header-top { display: flex; align-items: center; gap: .75rem; margin: .5rem 0 .4rem; }
	.badge { padding: .2rem .65rem; border-radius: 6px; font-size: .8rem; font-weight: 600; }
	.badge.gif { background: rgba(230,119,0,.1); border: 1px solid rgba(230,119,0,.2); color: #e67700; }
	h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); }
	.page-header p { font-size: .82rem; color: var(--text-3); margin-top: .25rem; font-family: var(--mono); }

	.settings-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.field.end { justify-content: flex-end; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.label em { color: var(--text-4); font-style: normal; font-size: .68rem; font-family: var(--mono); }
	.seg { display: flex; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg button { padding: .42rem .85rem; background: none; border: none; font-size: .8rem; font-weight: 500; color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.seg button.on { background: var(--accent); color: white; font-weight: 600; }
	.slider { -webkit-appearance: none; width: 160px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.si:focus { border-color: var(--accent); }
	.info-chip { padding: .38rem .85rem; background: var(--accent-soft); border: 1px solid rgba(59,91,219,.2); border-radius: 7px; font-size: .78rem; color: var(--accent); font-weight: 600; }

	.list-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; margin-bottom: .75rem; }
	.bar-left { display: flex; align-items: center; gap: .75rem; }
	.bar-right { display: flex; align-items: center; gap: .5rem; }
	.saved-badge { font-size: .82rem; font-weight: 600; color: #2f9e44; font-family: var(--mono); }
	.count { font-size: .82rem; color: var(--text-3); font-family: var(--mono); }
	.btn-primary { padding: .5rem 1.1rem; background: var(--accent); color: white; border: none; border-radius: var(--radius); font-weight: 600; font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-mid); }
	.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
	.btn-ghost { padding: .5rem .9rem; border: 1px solid var(--border); background: none; color: var(--text-3); border-radius: var(--radius); font-size: .875rem; transition: var(--transition); cursor: pointer; }
	.btn-ghost:hover { border-color: var(--border-mid); color: var(--text); }
	.btn-ghost.danger:hover { border-color: var(--accent2); color: var(--accent2); }
	.file-list { display: flex; flex-direction: column; gap: .6rem; }

	.tip-cards { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 2rem; }
	.tip-card { padding: 1.1rem 1.25rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); }
	.tip-card.highlight { border-color: rgba(59,91,219,.2); background: var(--accent-soft); }
	.tip-card strong { display: block; font-size: .875rem; font-weight: 700; color: var(--text); margin-bottom: .4rem; }
	.tip-card p { font-size: .8rem; color: var(--text-3); line-height: 1.65; margin: 0; }
	.tip-card code { font-family: var(--mono); font-size: .75em; background: var(--bg3); padding: .1em .4em; border-radius: 4px; color: var(--accent3); }
	@media (max-width: 600px) { .tip-cards { grid-template-columns: 1fr; } }
</style>
