import type { CompressOptions, CompressResult, ImageFormat } from './types';

/**
 * Image compression engine.
 * Pipeline:
 *  1. Decode via createImageBitmap() — GPU-accelerated on all modern browsers.
 *  2. Draw to OffscreenCanvas (falls back to regular Canvas).
 *  3. Re-encode as target format.
 *  4. If target size: binary search over quality in up to 14 iterations.
 *
 * Hardware notes:
 *  - createImageBitmap() uses OS decoders (GPU on Chrome/Safari/Edge).
 *  - OffscreenCanvas composited on GPU compositor thread.
 *  - AVIF on Chrome 94+ uses libavif with hardware hints.
 *  - WebP uses libwebp with SIMD (SSE4.1/NEON/AVX2) automatically.
 */
export async function compressImage(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(5);
	const format = (options.format ?? 'image/webp') as ImageFormat;
	const maxW = options.maxWidth ?? 16384;
	const maxH = options.maxHeight ?? 16384;

	// 1. Decode
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		bitmap = await loadViaImg(file);
	}
	onProgress?.(15);

	// 2. Dimensions
	let { width, height } = bitmap;
	if (width > maxW || height > maxH) {
		const r = Math.min(maxW / width, maxH / height);
		width = Math.round(width * r);
		height = Math.round(height * r);
	}

	// 3. Draw
	const canvas = makeCanvas(width, height);
	const ctx = getCtx(canvas);
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	onProgress?.(30);

	const originalSize = file.size;
	let blob: Blob;

	if (options.targetSizeKB && options.targetSizeKB > 0) {
		blob = await binarySearch(canvas, format, options.targetSizeKB * 1024, onProgress);
	} else {
		blob = await encode(canvas, format, options.quality ?? 0.82);
		onProgress?.(95);
	}

	// PNG: never return larger than original
	if (format === 'image/png' && blob.size >= originalSize) blob = file;

	onProgress?.(100);
	return { blob, originalSize, compressedSize: blob.size, compressionRatio: originalSize / blob.size, format, width, height };
}

async function binarySearch(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat,
	targetBytes: number,
	onProgress?: (pct: number) => void
): Promise<Blob> {
	if (format === 'image/png') { onProgress?.(90); return encode(canvas, format, 1); }
	let lo = 0.01, hi = 0.99, best: Blob | null = null;
	for (let i = 0; i < 14; i++) {
		const mid = (lo + hi) / 2;
		const blob = await encode(canvas, format, mid);
		onProgress?.(30 + Math.round((i / 14) * 62));
		if (blob.size <= targetBytes) { best = blob; lo = mid; }
		else hi = mid;
		if (hi - lo < 0.005) break;
	}
	if (!best) best = await encode(canvas, format, lo);
	onProgress?.(95);
	return best;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function getCtx(canvas: HTMLCanvasElement | OffscreenCanvas) {
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	if (!ctx) throw new Error('Canvas 2D context unavailable');
	return ctx;
}

function encode(canvas: HTMLCanvasElement | OffscreenCanvas, format: string, quality: number): Promise<Blob> {
	if (canvas instanceof OffscreenCanvas) return canvas.convertToBlob({ type: format, quality });
	return new Promise((res, rej) =>
		(canvas as HTMLCanvasElement).toBlob(b => b ? res(b) : rej(new Error('toBlob null')), format, quality)
	);
}

function loadViaImg(file: File): Promise<ImageBitmap> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = async () => {
			URL.revokeObjectURL(url);
			try { resolve(await createImageBitmap(img)); } catch (e) { reject(e); }
		};
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
		img.src = url;
	});
}
