<script lang="ts">
	import { compressPdf } from '$lib/compressPdf';
	import { formatBytes, uid } from '$lib/types';
	import type { FileEntry, CompressOptions } from '$lib/types';

	let files: FileEntry[] = [];
	let dragOver = false;
	let renderScale = 1.8;
	let imgFormat: 'image/jpeg' | 'image/png' = 'image/jpeg';
	let quality = 82;
	let mode: 'quality' | 'targetSize' = 'quality';
	let targetSizeMB = '';

	function buildOptions(): CompressOptions {
		const o: CompressOptions = { pdfRenderScale: renderScale, pdfImageFormat: imgFormat };
		if (mode === 'quality') o.quality = quality / 100;
		else o.targetSizeKB = parseFloat(targetSizeMB) * 1024;
		return o;
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
			if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) continue;
			files = [...files, { id: uid(), file: f, type: 'pdf', status: 'idle', progress: 0, options: buildOptions() }];
		}
	}
	function remove(id: string) { files = files.filter(f => f.id !== id); }
	async function compress(entry: FileEntry) {
		entry.status = 'compressing'; entry.progress = 0; entry.options = buildOptions(); files = files;
		try {
			entry.result = await compressPdf(entry.file, entry.options, p => { entry.progress = p; files = files; });
			entry.status = 'done';
		} catch (err: any) { entry.error = err.message; entry.status = 'error'; }
		files = files;
	}
	function compressAll() { files.forEach(f => { if (f.status === 'idle' || f.status === 'error') compress(f); }); }
	function download(entry: FileEntry) {
		if (!entry.result) return;
		const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(entry.result.blob), download: entry.file.name.replace('.pdf', '_compressed.pdf') });
		a.click();
	}
	$: anyCompressing = files.some(f => f.status === 'compressing');
	$: doneCount = files.filter(f => f.status === 'done').length;
</script>

<svelte:head><title>PDF Compression — Compressly</title></svelte:head>
<div class="page">
	<div class="page-header">
		<a href="/compress" class="back-link">← All formats</a>
		<div class="header-top">
			<span class="format-badge pdf">📄 PDF</span>
			<h1>PDF Compressor</h1>
		</div>
		<p>Renders pages with PDF.js · Re-encodes as compressed JPEG/PNG · Reassembles valid PDF</p>
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
					<input type="range" min="20" max="98" bind:value={quality} class="slider"/>
				</div>
			{:else}
				<div class="fg">
					<span class="fl">Target size (MB)</span>
					<input type="number" bind:value={targetSizeMB} placeholder="e.g. 5" class="ti" min="0.1"/>
				</div>
			{/if}
			<div class="fg">
				<span class="fl">Page quality</span>
				<select bind:value={renderScale} class="si">
					<option value={1.2}>Draft (1.2×) — smallest</option>
					<option value={1.5}>Standard (1.5×)</option>
					<option value={1.8}>High (1.8×) — recommended</option>
					<option value={2.5}>Print (2.5×) — largest</option>
				</select>
			</div>
			<div class="fg">
				<span class="fl">Page encoding</span>
				<select bind:value={imgFormat} class="si">
					<option value="image/jpeg">JPEG (smaller, lossy)</option>
					<option value="image/png">PNG (lossless)</option>
				</select>
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
				<div class="dicon">📄</div>
				<p class="dt">Drop PDF files here</p>
				<p class="ds">Any PDF — reports, scans, presentations</p>
				<label class="bb">Browse <input type="file" multiple accept=".pdf,application/pdf" on:change={handleInput} style="display:none"/></label>
			</div>
		{:else}
			<label class="ab">+ Add more PDFs <input type="file" multiple accept=".pdf,application/pdf" on:change={handleInput} style="display:none"/></label>
		{/if}
	</div>

	{#if files.length > 0}
		<div class="la">
			<button class="bp" on:click={compressAll} disabled={anyCompressing}>{anyCompressing ? 'Processing…' : '⚡ Compress all'}</button>
		</div>
		<div class="fl-list">
			{#each files as entry (entry.id)}
				<div class="fc" class:done={entry.status==='done'} class:err={entry.status==='error'}>
					<div class="fci">📄</div>
					<div class="fci-info">
						<div class="fcn">{entry.file.name}</div>
						<div class="fcm">
							<span>{formatBytes(entry.file.size)}</span>
							{#if entry.result}
								<span class="arr">→</span>
								<span class="cs">{formatBytes(entry.result.compressedSize)}</span>
								<span class="rt" class:pos={entry.result.compressionRatio>1}>
									{entry.result.compressionRatio>1 ? `−${(100-100/entry.result.compressionRatio).toFixed(1)}%` : 'larger'}
								</span>
							{/if}
						</div>
						{#if entry.status==='compressing'}
							<div class="pt"><div class="pf" style="width:{entry.progress}%"></div></div>
							<div class="pl">{entry.progress < 12 ? 'Loading PDF.js…' : entry.progress < 88 ? `Rendering pages… ${entry.progress}%` : 'Assembling PDF…'}</div>
						{/if}
						{#if entry.status==='error'}<div class="em">⚠ {entry.error}</div>{/if}
					</div>
					<div class="fca">
						{#if entry.status==='idle'||entry.status==='error'}
							<button class="fb primary" on:click={() => compress(entry)}>Compress</button>
						{:else if entry.status==='compressing'}
							<span class="pct">{entry.progress}%</span>
						{:else if entry.status==='done'}
							<button class="fb" on:click={() => download(entry)}>⬇ Download</button>
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
	.back-link{font-size:.82rem;color:var(--text-3);font-family:var(--mono);transition:color var(--transition)}.back-link:hover{color:var(--accent)}
	.page-header{margin-bottom:2rem}
	.header-top{display:flex;align-items:center;gap:.75rem;margin:.5rem 0 .4rem}
	.format-badge{padding:.2rem .65rem;border-radius:6px;font-size:.8rem;font-weight:600}
	.format-badge.pdf{background:rgba(224,49,49,.1);border:1px solid rgba(224,49,49,.2);color:#c92a2a}
	.page-header h1{font-size:1.9rem;font-weight:800;letter-spacing:-.025em;color:var(--text)}
	.page-header p{font-size:.88rem;color:var(--text-3);margin-top:.25rem;font-family:var(--mono)}
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
	.fl-list{display:flex;flex-direction:column;gap:.6rem}
	.fc{display:flex;align-items:flex-start;gap:.85rem;padding:.9rem 1.1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);transition:border-color var(--transition)}
	.fc.done{border-color:rgba(47,158,68,.25)}
	.fc.err{border-color:rgba(224,49,49,.25)}
	.fci{font-size:1.35rem;flex-shrink:0;padding-top:2px}
	.fci-info{flex:1;min-width:0}
	.fcn{font-size:.875rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.fcm{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-family:var(--mono);color:var(--text-3);margin-top:.2rem;flex-wrap:wrap}
	.arr{color:var(--text-4)}.cs{color:var(--text-2);font-weight:500}
	.rt.pos{color:#2f9e44;font-weight:600}
	.pt{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:.5rem}
	.pf{height:100%;background:var(--accent);transition:width .2s ease;border-radius:2px}
	.pl{font-size:.72rem;font-family:var(--mono);color:var(--text-3);margin-top:.3rem}
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
