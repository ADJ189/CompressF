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
			// FIX: Filter out 0 byte files (e.g., folders)
			const validFiles = Array.from(e.dataTransfer.files).filter(f => f.size > 0);
			if (validFiles.length > 0) onFiles(validFiles);
		}
	}
	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		if (el.files) {
			// FIX: Filter out 0 byte files
			const validFiles = Array.from(el.files).filter(f => f.size > 0);
			if (validFiles.length > 0) onFiles(validFiles);
		}
		el.value = '';
	}
</script>
	.dz-add:hover { color: var(--accent); }
</style>
