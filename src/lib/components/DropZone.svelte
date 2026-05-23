<script lang="ts">
	export let accept   = '*';
	export let multiple = true;
	export let hasFiles = false;
	export let icon     = '📂';
	export let title    = 'Drop files here';
	export let subtitle = '';
	export let onFiles: (files: File[]) => void;

	let dragOver = false;

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			const validFiles = Array.from(e.dataTransfer.files).filter(f => f.size > 0);
			if (validFiles.length > 0) onFiles(validFiles);
		}
	}
	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		if (el.files) {
			const validFiles = Array.from(el.files).filter(f => f.size > 0);
			if (validFiles.length > 0) onFiles(validFiles);
		}
		el.value = '';
	}
</script>

<div
	class="dz"
	class:drag-active={dragOver}
	class:has-files={hasFiles}
	on:dragover|preventDefault={() => dragOver = true}
	on:dragleave={() => dragOver = false}
	on:drop={handleDrop}
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && (e.currentTarget.querySelector('input') as HTMLInputElement)?.click()}
>
	{#if !hasFiles}
		<div class="dz-inner">
			<div class="dz-icon">{icon}</div>
			<p class="dz-title">{title}</p>
			{#if subtitle}<p class="dz-sub">{subtitle}</p>{/if}
			<label class="dz-btn">
				Browse files
				<input type="file" {accept} {multiple} on:change={handleInput} style="display:none" />
			</label>
		</div>
	{:else}
		<label class="dz-add">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
			Add more files
			<input type="file" {accept} {multiple} on:change={handleInput} style="display:none" />
		</label>
	{/if}
</div>

<style>
	.dz {
		border: 2px dashed var(--border-mid);
		border-radius: var(--radius-lg);
		background: var(--surface);
		transition: var(--transition);
		margin-bottom: 1.25rem;
		cursor: default;
	}
	.dz.drag-active { border-color: var(--accent); background: var(--accent-soft); }
	.dz-inner {
		display: flex; flex-direction: column; align-items: center;
		justify-content: center; padding: 3rem 2rem; gap: 0.6rem; text-align: center;
	}
	.dz-icon { font-size: 2.5rem; margin-bottom: 0.25rem; }
	.dz-title { font-size: 1rem; font-weight: 600; color: var(--text-2); }
	.dz-sub { font-size: 0.82rem; color: var(--text-3); font-family: var(--mono); }
	.dz-btn {
		margin-top: 0.5rem; padding: 0.5rem 1.25rem;
		background: var(--bg2); border: 1px solid var(--border-mid);
		border-radius: 8px; font-size: 0.875rem; font-weight: 600;
		cursor: pointer; transition: var(--transition); color: var(--text-2);
	}
	.dz-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
	.dz-add {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.75rem 1.25rem; font-size: 0.82rem; font-weight: 600;
		color: var(--text-3); cursor: pointer; border-radius: 8px; transition: var(--transition);
	}
	.dz-add:hover { color: var(--accent); }
</style>
