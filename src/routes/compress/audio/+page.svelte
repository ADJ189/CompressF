<script lang="ts">
	import DropZone from '$lib/components/DropZone.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { compressAudio } from '$lib/compressAudio';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, AudioFormat } from '$lib/types';

	let files: FileEntry[] = [];
	let outputFormat: AudioFormat = 'mp3';
	let bitrate = 192;
	let sampleRate = 0;
	let stripMeta = true;
	let mode: 'bitrate' | 'quality' = 'bitrate';
	let quality = 80;

	const bitrateOpts: Record<AudioFormat, number[]> = {
		mp3: [64, 96, 128, 192, 256, 320],
		aac: [64, 96, 128, 160, 192, 256],
		ogg: [64, 96, 128, 160, 192, 256],
		opus:[32, 48, 64, 96, 128, 192],
		flac:[], wav: []
	};
	const lossless = (f: AudioFormat) => f === 'flac' || f === 'wav';

	const fmtExtMap: Record<AudioFormat, string> = { mp3: 'mp3', aac: 'm4a', ogg: 'ogg', opus: 'opus', flac: 'flac', wav: 'wav' };

	function buildOptions(): CompressOptions {
		const o: CompressOptions = { audioFormat: outputFormat, stripMetadata: stripMeta };
		if (!lossless(outputFormat)) {
			if (mode === 'bitrate') o.audioBitrate = bitrate;
			else o.quality = quality / 100;
		}
		if (sampleRate > 0) o.audioSampleRate = sampleRate;
		return o;
	}

	function addFiles(fs: File[]) {
		const valid = fs.filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/') ||
			/\.(mp3|aac|ogg|opus|flac|wav|m4a|wma|aiff|aif|mp4|mkv|mov)$/i.test(f.name));
		files = [...files, ...valid.map(f => ({ id: uid(), file: f, type: 'audio' as const, status: 'idle' as const, progress: 0, options: buildOptions() }))];
	}

	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressAudio(entry.file, entry.options, p => { entry.progress = p; files = files; });
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message; entry.status = 'error'; }
		files = files;
	}

	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }

	function download(entry: FileEntry) {
		if (!entry.result) return;
		const a = Object.assign(document.createElement('a'), {
			href: URL.createObjectURL(entry.result.blob),
			download: entry.file.name.replace(/\.[^.]+$/, '') + '_compressed.' + fmtExtMap[outputFormat]
		});
		a.click();
	}

	$: hasFiles = files.length > 0;
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: totalSaved = files.filter(f => f.result).reduce((a, f) => a + f.file.size - (f.result?.compressedSize ?? 0), 0);
	$: showBitrate = bitrateOpts[outputFormat].length > 0;
</script>

<svelte:head><title>Audio Compression — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="badge audio">🎵 Audio</span>
			<h1>Audio Compressor</h1>
		</div>
		<p>FFmpeg.wasm · MP3 · AAC · OGG · Opus · FLAC · WAV · Also extracts audio from MP4/MKV/MOV</p>
	</div>

	<div class="settings-card">
		<div class="row">
			<div class="field">
				<span class="label">Output format</span>
				<div class="fmt-pills">
					{#each Object.keys(bitrateOpts) as f}
						<button class="pill" class:on={outputFormat === f}
							on:click={() => { outputFormat = f; bitrate = bitrateOpts[f]?.[3] ?? 128; }}>
							{f.toUpperCase()}
						</button>
					{/each}
				</div>
			</div>

			{#if showBitrate}
				<div class="field">
					<span class="label">Mode</span>
					<div class="seg">
						<button class:on={mode==='bitrate'} on:click={() => mode='bitrate'}>Bitrate</button>
						<button class:on={mode==='quality'} on:click={() => mode='quality'}>VBR</button>
					</div>
				</div>
				{#if mode === 'bitrate'}
					<div class="field">
						<span class="label">Bitrate</span>
						<div class="seg">
							{#each bitrateOpts[outputFormat] as b}
								<button class:on={bitrate===b} on:click={() => bitrate=b}>{b}k</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="field">
						<span class="label">VBR quality <strong>{quality}%</strong></span>
						<input type="range" min="20" max="99" bind:value={quality} class="slider" />
					</div>
				{/if}
			{:else}
				<div class="field end">
					<div class="lossless-chip">Lossless — no quality loss</div>
				</div>
			{/if}

			<div class="field">
				<span class="label">Sample rate</span>
				<select bind:value={sampleRate} class="si">
					<option value={0}>Original</option>
					<option value={48000}>48,000 Hz (studio)</option>
					<option value={44100}>44,100 Hz (CD)</option>
					<option value={22050}>22,050 Hz (voice)</option>
					<option value={16000}>16,000 Hz (speech)</option>
				</select>
			</div>

			<div class="field end">
				<label class="check"><input type="checkbox" bind:checked={stripMeta} /> Strip metadata</label>
			</div>
		</div>
	</div>

	<DropZone accept="audio/*,video/*,.flac,.aiff,.aif,.opus,.wma" {hasFiles} onFiles={addFiles}
		icon="🎵" title="Drop audio or video files"
		subtitle="MP3 · AAC · OGG · Opus · FLAC · WAV · AIFF · M4A · MP4 · MKV" />

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
					{anyCompressing ? 'Converting…' : `⚡ Convert to ${outputFormat.toUpperCase()}`}
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

	<div class="fmt-guide">
		<div class="fg-item"><strong>MP3</strong><span>Universal — music, podcasts</span></div>
		<div class="fg-item"><strong>AAC</strong><span>Better than MP3, native on Apple</span></div>
		<div class="fg-item"><strong>Opus</strong><span>Best for streaming & voice</span></div>
		<div class="fg-item"><strong>OGG</strong><span>Open format, great for web/games</span></div>
		<div class="fg-item"><strong>FLAC</strong><span>Lossless archiving & mastering</span></div>
		<div class="fg-item"><strong>WAV</strong><span>Uncompressed, max compatibility</span></div>
	</div>
</div>

<style>
	.page { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }
	.back-link { font-size: .82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); }
	.back-link:hover { color: var(--accent); }
	.page-header { margin-bottom: 2rem; }
	.header-top { display: flex; align-items: center; gap: .75rem; margin: .5rem 0 .4rem; }
	.badge { padding: .2rem .65rem; border-radius: 6px; font-size: .8rem; font-weight: 600; }
	.badge.audio { background: rgba(47,158,68,.1); border: 1px solid rgba(47,158,68,.2); color: #2f9e44; }
	h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -.025em; color: var(--text); }
	.page-header p { font-size: .82rem; color: var(--text-3); margin-top: .25rem; font-family: var(--mono); }

	.settings-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.5rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); }
	.row { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: flex-end; }
	.field { display: flex; flex-direction: column; gap: .4rem; }
	.field.end { justify-content: flex-end; padding-bottom: 2px; }
	.label { font-size: .73rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .05em; }
	.label strong { color: var(--accent); text-transform: none; letter-spacing: 0; }
	.fmt-pills { display: flex; gap: .35rem; flex-wrap: wrap; }
	.pill { padding: .35rem .7rem; border-radius: 7px; font-size: .78rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg2); color: var(--text-3); cursor: pointer; transition: var(--transition); }
	.pill.on { background: var(--accent); border-color: var(--accent); color: white; }
	.seg { display: flex; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
	.seg button { padding: .38rem .72rem; background: none; border: none; font-size: .78rem; font-weight: 500; color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.seg button.on { background: var(--accent); color: white; font-weight: 600; }
	.slider { -webkit-appearance: none; width: 150px; height: 4px; background: var(--border-mid); border-radius: 2px; outline: none; cursor: pointer; }
	.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 0 3px var(--accent-soft); }
	.si { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: .45rem .75rem; color: var(--text); font-size: .875rem; outline: none; transition: border-color var(--transition); }
	.si:focus { border-color: var(--accent); }
	.lossless-chip { padding: .38rem .85rem; background: rgba(47,158,68,.08); border: 1px solid rgba(47,158,68,.2); border-radius: 7px; font-size: .78rem; color: #2f9e44; font-weight: 600; }
	.check { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: var(--text-2); cursor: pointer; font-weight: 500; }
	.check input { accent-color: var(--accent); }

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

	.fmt-guide { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; margin-top: 2rem; }
	.fg-item { padding: .75rem 1rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); }
	.fg-item strong { display: block; font-size: .82rem; font-weight: 700; color: var(--text); margin-bottom: .2rem; }
	.fg-item span { font-size: .75rem; color: var(--text-3); }
	@media (max-width: 600px) { .fmt-guide { grid-template-columns: 1fr 1fr; } }
</style>
