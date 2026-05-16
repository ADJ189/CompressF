<script lang="ts">
	import { onMount } from 'svelte';
	import { compressVideo } from '$lib/compressVideo';
	import { detectCaps } from '$lib/browserCaps';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions, BrowserCaps } from '$lib/types';

	let files: FileEntry[] = [];
	let dragOver = false;
	let caps: BrowserCaps | null = null;

	// Settings
	let mode: 'crf' | 'bitrate' | 'targetSize' = 'crf';
	let crfQuality = 75;
	let bitrate = 2000;
	let targetSizeMB = '';
	let codec: 'h264' | 'vp9' | 'av1' = 'h264';
	let preset: 'ultrafast' | 'fast' | 'medium' | 'slow' = 'fast';
	let maxWidth = 0;
	let fps = 0;

	onMount(async () => {
		caps = await detectCaps();
	});

	function buildOptions(): CompressOptions {
		const opts: CompressOptions = { videoCodec: codec, videoPreset: preset };
		if (mode === 'crf')        opts.quality = crfQuality / 100;
		if (mode === 'bitrate')    opts.videoBitrate = bitrate * 1000;
		if (mode === 'targetSize') opts.targetSizeKB = parseFloat(targetSizeMB) * 1024 || 50000;
		if (maxWidth > 0)          { opts.maxWidth = maxWidth; }
		if (fps > 0)               opts.fps = fps;
		return opts;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault(); dragOver = false;
		if (e.dataTransfer?.files) add(Array.from(e.dataTransfer.files));
	}
	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		if (el.files) add(Array.from(el.files)); el.value = '';
	}
	function add(fs: File[]) {
		for (const f of fs) {
			if (!f.type.startsWith('video/') && !['mp4','webm','mov','avi','mkv','m4v'].includes(f.name.split('.').pop()?.toLowerCase() ?? '')) continue;
			files = [...files, { id: uid(), file: f, type: 'video', status: 'idle', progress: 0, options: buildOptions() }];
		}
	}
	function remove(id: string) { files = files.filter(f => f.id !== id); }

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

	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
	$: crf = Math.round(18 + (1 - crfQuality / 100) * 17);
</script>

<svelte:head><title>Video Encoder — Compressly</title></svelte:head>

<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="format-badge video">🎬 Video</span>
			<h1>Video Encoder</h1>
		</div>
		<p>FFmpeg.wasm (CDN) · WebCodecs GPU · MediaRecorder — auto-selected for your browser.</p>

		{#if caps}
			<div class="caps-row">
				<span class="cap-chip browser">{caps.browser}</span>
				{#each caps.videoEngines as engine}
					<span class="cap-chip" class:primary={engine.startsWith('FFmpeg')} class:gpu={engine.includes('GPU')}>{engine}</span>
				{/each}
			</div>
			{#if caps.warnings.length > 0}
				<div class="warnings">
					{#each caps.warnings as w}
						<div class="warn-item">⚠ {w}</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Settings -->
	<div class="settings-card">
		<div class="settings-row">
			<div class="fg">
				<span class="fl">Mode</span>
				<div class="seg">
					<button class:on={mode==='crf'}        on:click={() => mode='crf'}>Quality (CRF)</button>
					<button class:on={mode==='bitrate'}    on:click={() => mode='bitrate'}>Bitrate</button>
					<button class:on={mode==='targetSize'} on:click={() => mode='targetSize'}>Target size</button>
				</div>
			</div>

			{#if mode === 'crf'}
				<div class="fg">
					<span class="fl">Quality <strong>{crfQuality}%</strong> <span class="hint">CRF {crf}</span></span>
					<input type="range" min="20" max="99" bind:value={crfQuality} class="slider" />
				</div>
			{:else if mode === 'bitrate'}
				<div class="fg">
					<span class="fl">Bitrate (kbps)</span>
					<input type="number" bind:value={bitrate} min="100" max="50000" class="ti" />
				</div>
			{:else}
				<div class="fg">
					<span class="fl">Target size (MB)</span>
					<input type="number" bind:value={targetSizeMB} placeholder="e.g. 50" class="ti" min="1" />
				</div>
			{/if}

			<div class="fg">
				<span class="fl">Codec</span>
				<select bind:value={codec} class="si">
					<option value="h264">H.264 — best compatibility</option>
					<option value="vp9">VP9 — better ratio, slower</option>
					<option value="av1">AV1 — best ratio, very slow</option>
				</select>
			</div>

			<div class="fg">
				<span class="fl">Speed preset</span>
				<select bind:value={preset} class="si">
					<option value="ultrafast">Ultrafast (larger)</option>
					<option value="fast">Fast (recommended)</option>
					<option value="medium">Medium</option>
					<option value="slow">Slow (best compression)</option>
				</select>
			</div>

			<div class="fg">
				<span class="fl">Max width</span>
				<select bind:value={maxWidth} class="si">
					<option value={0}>Original</option>
					<option value={3840}>3840 (4K)</option>
					<option value={1920}>1920 (FHD)</option>
					<option value={1280}>1280 (HD)</option>
					<option value={854}>854 (480p)</option>
					<option value={640}>640 (360p)</option>
				</select>
			</div>

			<div class="fg">
				<span class="fl">Frame rate</span>
				<select bind:value={fps} class="si">
					<option value={0}>Original</option>
					<option value={60}>60 fps</option>
					<option value={30}>30 fps</option>
					<option value={24}>24 fps</option>
					<option value={15}>15 fps</option>
				</select>
			</div>
		</div>
	</div>

	<!-- Drop zone -->
	<div class="dropzone" class:drag-active={dragOver}
		on:dragover|preventDefault={() => dragOver = true}
		on:dragleave={() => dragOver = false}
		on:drop={handleDrop}
		role="button" tabindex="0">
		{#if files.length === 0}
			<div class="drop-inner">
				<div class="drop-icon">🎬</div>
				<p class="drop-title">Drop video files here</p>
				<p class="drop-sub">MP4 · WebM · MOV · AVI · MKV</p>
				<label class="browse-btn">Browse files <input type="file" multiple accept="video/*" on:change={handleInput} style="display:none"/></label>
			</div>
		{:else}
			<label class="add-btn">+ Add more <input type="file" multiple accept="video/*" on:change={handleInput} style="display:none"/></label>
		{/if}
	</div>

	{#if files.length > 0}
		<div class="list-actions">
			<button class="btn-primary" on:click={compressAll} disabled={anyCompressing}>
				{anyCompressing ? 'Encoding…' : '⚡ Encode all'}
			</button>
			{#if doneCount > 0}<span class="done-note">{doneCount} ready</span>{/if}
		</div>

		<div class="file-list">
			{#each files as entry (entry.id)}
				<div class="file-card" class:done={entry.status==='done'} class:error={entry.status==='error'}>
					<div class="fc-icon">🎬</div>
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
								<span class="engine">{entry.result.format}</span>
							{/if}
						</div>
						{#if entry.status==='compressing'}
							<div class="pt"><div class="pf" style="width:{entry.progress}%"></div></div>
							<div class="progress-label">
								{entry.progress < 6 ? 'Loading FFmpeg…' : entry.progress < 95 ? `Encoding… ${entry.progress}%` : 'Finalising…'}
							</div>
						{/if}
						{#if entry.status==='error'}<div class="err-msg">⚠ {entry.error}</div>{/if}
					</div>
					<div class="fc-actions">
						{#if entry.status==='idle'||entry.status==='error'}
							<button class="fc-btn primary" on:click={() => compress(entry)}>Encode</button>
						{:else if entry.status==='compressing'}
							<span class="pct">{entry.progress}%</span>
						{:else if entry.status==='done'}
							<button class="fc-btn" on:click={() => download(entry)}>⬇ Download</button>
						{/if}
						<button class="fc-btn icon" on:click={() => remove(entry.id)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="info-box">
		<h3>Note on first use</h3>
		<p>FFmpeg.wasm downloads ~30MB of WebAssembly from esm.sh CDN on first use. This is cached by the browser — subsequent runs are instant. If your browser blocks the CDN, WebCodecs or MediaRecorder will be used automatically.</p>
	</div>
</div>

<style>
	.page{max-width:860px;margin:0 auto;padding:3rem 1.5rem 5rem}
	.back-link{font-size:.82rem;color:var(--text-3);font-family:var(--mono);transition:color var(--transition)}.back-link:hover{color:var(--accent)}
	.page-header{margin-bottom:2rem}
	.header-top{display:flex;align-items:center;gap:.75rem;margin:.5rem 0 .4rem}
	.format-badge{padding:.2rem .65rem;border-radius:6px;font-size:.8rem;font-weight:600}
	.format-badge.video{background:rgba(112,72,232,.1);border:1px solid rgba(112,72,232,.2);color:#7048e8}
	.page-header h1{font-size:1.9rem;font-weight:800;letter-spacing:-.025em;color:var(--text)}
	.page-header p{font-size:.88rem;color:var(--text-3);margin-top:.25rem;font-family:var(--mono)}
	.caps-row{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem}
	.cap-chip{padding:.2rem .65rem;background:var(--bg2);border:1px solid var(--border);border-radius:6px;font-size:.72rem;font-family:var(--mono);color:var(--text-3)}
	.cap-chip.browser{border-color:var(--border-mid);color:var(--text-2);font-weight:600}
	.cap-chip.primary{background:var(--accent-soft);border-color:rgba(59,91,219,.2);color:var(--accent)}
	.cap-chip.gpu{background:rgba(47,158,68,.08);border-color:rgba(47,158,68,.2);color:#2f9e44}
	.warnings{margin-top:.75rem;display:flex;flex-direction:column;gap:.4rem}
	.warn-item{font-size:.78rem;font-family:var(--mono);color:#e67700;background:rgba(230,119,0,.08);border:1px solid rgba(230,119,0,.2);padding:.4rem .75rem;border-radius:7px}
	.settings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.25rem;box-shadow:var(--shadow-sm)}
	.settings-row{display:flex;flex-wrap:wrap;gap:1.1rem;align-items:flex-end}
	.fg{display:flex;flex-direction:column;gap:.4rem}
	.fl{font-size:.75rem;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em}
	.fl strong{color:var(--accent);text-transform:none;letter-spacing:0}
	.hint{color:var(--text-4);font-family:var(--mono);font-size:.7rem;font-weight:400;text-transform:none;letter-spacing:0}
	.seg{display:flex;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
	.seg button{padding:.42rem .85rem;background:none;border:none;font-size:.8rem;font-weight:500;color:var(--text-3);transition:var(--transition)}
	.seg button.on{background:var(--accent);color:white;font-weight:600}
	.slider{-webkit-appearance:none;width:180px;height:4px;background:var(--border-mid);border-radius:2px;outline:none;cursor:pointer}
	.slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:var(--accent);border-radius:50%;box-shadow:0 0 0 3px var(--accent-soft)}
	.ti,.si{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:.45rem .75rem;color:var(--text);font-size:.875rem;outline:none;transition:border-color var(--transition)}
	.ti:focus,.si:focus{border-color:var(--accent)}.ti{width:130px}
	.dropzone{border:2px dashed var(--border-mid);border-radius:var(--radius-lg);background:var(--surface);transition:var(--transition);margin-bottom:1.25rem}
	.dropzone.drag-active{border-color:var(--accent);background:var(--accent-soft)}
	.drop-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2rem;gap:.6rem;text-align:center}
	.drop-icon{font-size:2.5rem}.drop-title{font-size:1rem;font-weight:600;color:var(--text-2)}.drop-sub{font-size:.875rem;color:var(--text-3)}
	.browse-btn{margin-top:.5rem;padding:.5rem 1.25rem;background:var(--bg2);border:1px solid var(--border-mid);border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;transition:var(--transition);color:var(--text-2)}
	.browse-btn:hover{background:var(--accent);border-color:var(--accent);color:white}
	.add-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1rem;font-size:.82rem;font-weight:600;color:var(--text-3);cursor:pointer;border-radius:8px;transition:var(--transition)}
	.add-btn:hover{color:var(--accent)}
	.list-actions{display:flex;align-items:center;gap:1rem;margin-bottom:.75rem}
	.btn-primary{padding:.55rem 1.2rem;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-weight:600;font-size:.9rem;transition:var(--transition)}
	.btn-primary:hover:not(:disabled){background:var(--accent-mid)}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
	.done-note{font-size:.82rem;color:var(--text-3);font-family:var(--mono)}
	.file-list{display:flex;flex-direction:column;gap:.6rem;margin-bottom:2rem}
	.file-card{display:flex;align-items:flex-start;gap:.85rem;padding:1rem 1.1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);transition:border-color var(--transition)}
	.file-card.done{border-color:rgba(47,158,68,.25)}.file-card.error{border-color:rgba(224,49,49,.25)}
	.fc-icon{font-size:1.35rem;flex-shrink:0;padding-top:2px}
	.fc-info{flex:1;min-width:0}
	.fc-name{font-size:.875rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.fc-meta{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-family:var(--mono);color:var(--text-3);margin-top:.2rem;flex-wrap:wrap}
	.arr{color:var(--text-4)}.cs{color:var(--text-2);font-weight:500}.rt.pos{color:#2f9e44;font-weight:600}
	.engine{color:var(--text-4);font-size:.68rem}
	.pt{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:.5rem}
	.pf{height:100%;background:var(--accent);transition:width .2s ease;border-radius:2px}
	.progress-label{font-size:.72rem;font-family:var(--mono);color:var(--text-3);margin-top:.3rem}
	.err-msg{font-size:.78rem;color:var(--accent2);margin-top:.3rem}
	.fc-actions{display:flex;gap:.4rem;flex-shrink:0}
	.pct{font-size:.78rem;font-family:var(--mono);color:var(--text-3);min-width:32px;text-align:right}
	.fc-btn{padding:.35rem .8rem;border-radius:7px;font-size:.78rem;font-weight:600;border:1px solid var(--border);background:var(--bg2);color:var(--text-3);transition:var(--transition)}
	.fc-btn:hover{border-color:var(--border-mid);color:var(--text)}.fc-btn.primary{background:var(--accent);border-color:var(--accent);color:white}.fc-btn.primary:hover{background:var(--accent-mid)}
	.fc-btn.icon{padding:.35rem .5rem}.fc-btn.icon:hover{border-color:var(--accent2);color:var(--accent2)}
	.info-box{padding:1.25rem 1.5rem;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);margin-top:2rem}
	.info-box h3{font-size:.875rem;font-weight:700;color:var(--text);margin-bottom:.5rem}
	.info-box p{font-size:.82rem;color:var(--text-3);line-height:1.7}
</style>
