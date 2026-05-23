async function binarySearch(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat, targetBytes: number,
	onProgress?: (pct: number) => void
): Promise<Blob> {
	if (format === 'image/png') { onProgress?.(90); return encode(canvas, format, 1); }
	let lo = 0.01, hi = 0.99, best: Blob | null = null;
	for (let i = 0; i < 14; i++) {
		const mid = (lo + hi) / 2;
		const b   = await encode(canvas, format, mid);
		onProgress?.(32 + Math.round((i / 14) * 60));
		
		// FIX: Hard iteration limit with best-so-far fallback
		if (b.size <= targetBytes) { 
			best = b; 
			lo = mid; 
		} else {
			hi = mid;
		}
		
		if (hi - lo < 0.004) break;
	}
	if (!best) best = await encode(canvas, format, lo);
	onProgress?.(94);
	return best;
}
}
