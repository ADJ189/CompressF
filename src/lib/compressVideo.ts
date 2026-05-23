async function compressWithFFmpeg(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	// FIX: Check for required COOP/COEP headers before starting MT FFmpeg
	if (options.useMT && !window.crossOriginIsolated) {
		throw new Error("COOP/COEP headers missing; multi-threading disabled.");
	}

	onProgress?.(2);
	const ff = await getFFmpeg();
	ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(3 + Math.round(progress * 90)));
	onProgress?.(3);

	const inputExt  = file.name.match(/\.[^.]+$/)?.[0] ?? '.mp4';
	const inputName = `vin${inputExt}`;
	const outName   = 'vout.mp4';

	await ff.writeFile(inputName, await ffetchFile(file));
	await ff.exec(buildArgs(inputName, outName, options));
	const data = await ff.readFile(outName) as Uint8Array;
	await ff.deleteFile(inputName).catch(() => {});
	await ff.deleteFile(outName).catch(() => {});

	const blob = new Blob([data.buffer], { type: 'video/mp4' });
	onProgress?.(100);

	const meta = await getVideoMeta(file);
	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `video/mp4 · FFmpeg.wasm${typeof SharedArrayBuffer !== 'undefined' ? ' MT' : ''}`,
		width: meta.width, height: meta.height, duration: meta.duration
	};
}
