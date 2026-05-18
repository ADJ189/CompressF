<script lang="ts">
	import { formatBytes } from '$lib/types';
	import type { FileEntry } from '$lib/types';

	export let entry: FileEntry;
	export let onCompress: (e: FileEntry) => void;
	export let onDownload: (e: FileEntry) => void;
	export let onRemove:   (id: string) => void;

	const typeIcon: Record<string, string> = {
		image: '🖼️', pdf: '📄', video: '🎬', audio: '🎵', gif: '🎞️', svg: '✦'
	};
</script>

<div class="file-card"
	class:is-done={entry.status === 'done'}
	class:is-error={entry.status === 'error'}
	class:is-compressing={entry.status === 'compressing'}
>
	<div class="fc-icon">{typeIcon[entry.type] ?? '📁'}</div>

	<div class="fc-info">
		<div class="fc-name" title={entry.file.name}>{entry.file.name}</div>
		<div class="fc-meta">
			<span>{formatBytes(entry.file.size)}</span>
			{#if entry.result}
				<span class="sep">→</span>
				<span class="fc-compressed">{formatBytes(entry.result.compressedSize)}</span>
				<span class="fc-ratio" class:positive={entry.result.compressionRatio > 1}>
					{entry.result.compressionRatio > 1
						? `−${(100 - 100 / entry.result.compressionRatio).toFixed(1)}%`
						: 'larger'}
				</span>
				{#if entry.result.width}
					<span class="fc-dim">{entry.result.width}×{entry.result.height}</span>
				{/if}
				{#if entry.result.format}
					<span class="fc-engine">{entry.result.format.split('·')[1]?.trim() ?? ''}</span>
				{/if}
			{/if}
			{#if entry.status === 'error'}
				<span class="fc-err">⚠ {entry.error?.slice(0, 60)}</span>
			{/if}
		</div>
		{#if entry.status === 'compressing'}
			<div class="fc-progress">
				<div class="fc-progress-fill" style="width:{entry.progress}%"></div>
			</div>
			<div class="fc-progress-label">{entry.progress < 6 ? 'Loading…' : `${entry.progress}%`}</div>
		{/if}
	</div>

	<div class="fc-actions">
		{#if entry.status === 'idle' || entry.status === 'error'}
			<button class="fc-btn primary" on:click={() => onCompress(entry)}>
				{entry.status === 'error' ? 'Retry' : 'Compress'}
			</button>
		{:else if entry.status === 'compressing'}
			<span class="fc-pct">{entry.progress}%</span>
		{:else if entry.status === 'done'}
			<button class="fc-btn" on:click={() => onDownload(entry)}>⬇ Download</button>
		{/if}
		<button class="fc-btn icon" on:click={() => onRemove(entry.id)} aria-label="Remove">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>
</div>

<style>
	.file-card {
		display: flex; align-items: center; gap: 0.85rem;
		padding: 0.9rem 1.1rem; background: var(--surface);
		border: 1px solid var(--border); border-radius: var(--radius);
		transition: border-color var(--transition); position: relative;
	}
	.file-card.is-done      { border-color: rgba(47,158,68,0.28); }
	.file-card.is-error     { border-color: rgba(224,49,49,0.28); }
	.file-card.is-compressing { border-color: rgba(59,91,219,0.2); }
	.fc-icon  { font-size: 1.35rem; flex-shrink: 0; }
	.fc-info  { flex: 1; min-width: 0; }
	.fc-name  { font-size: 0.875rem; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.fc-meta  { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.75rem; font-family: var(--mono); color: var(--text-3); margin-top: 0.15rem; }
	.sep      { color: var(--text-4); }
	.fc-compressed { color: var(--text-2); font-weight: 500; }
	.fc-ratio.positive { color: #2f9e44; font-weight: 700; }
	.fc-dim   { color: var(--text-4); }
	.fc-engine { color: var(--text-4); font-size: 0.68rem; }
	.fc-err   { color: var(--accent2); font-size: 0.72rem; }
	.fc-progress { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 0.4rem; }
	.fc-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.15s ease; }
	.fc-progress-label { font-size: 0.68rem; font-family: var(--mono); color: var(--text-4); margin-top: 0.2rem; }
	.fc-actions { display: flex; gap: 0.4rem; align-items: center; flex-shrink: 0; }
	.fc-pct   { font-size: 0.78rem; font-family: var(--mono); color: var(--text-3); min-width: 32px; text-align: right; }
	.fc-btn   { padding: 0.35rem 0.8rem; border-radius: 7px; font-size: 0.78rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg2); color: var(--text-3); transition: var(--transition); cursor: pointer; }
	.fc-btn:hover          { border-color: var(--border-mid); color: var(--text); }
	.fc-btn.primary        { background: var(--accent); border-color: var(--accent); color: white; }
	.fc-btn.primary:hover  { background: var(--accent-mid); border-color: var(--accent-mid); }
	.fc-btn.icon           { padding: 0.35rem 0.45rem; }
	.fc-btn.icon:hover     { border-color: var(--accent2); color: var(--accent2); }
</style>
