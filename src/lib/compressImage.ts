import type { CompressOptions, CompressResult, ImageFormat } from './types';

/**
 * Image compression — OffscreenCanvas + binary search.
 * Browser-optimised: AVIF falls back to WebP on Firefox.
 */
export function getBestFormat(requested: ImageFormat): ImageFormat {
	if (typeof navigator === 'undefined') return requested;
	if (requested === 'image/avif' && navigator.userAgent.includes('Firefox/')) return 'image/webp';
	return requested;
}

export async function compressImage(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(5);
	const format = getBestFormat((options.format ?? 'image/webp') as ImageFormat);
	const maxW   = options.maxWidth  ?? 16384;
	const maxH   = options.maxHeight ?? 16384;

	let bitmap: ImageBitmap;
	try { bitmap = await createImageBitmap(file, { resizeQuality: 'high' }); }
	catch { bitmap = await loadViaImg(file); }
	onProgress?.(18);

	let { width, height } = bitmap;
	if (width > maxW || height > maxH) {
		const r = Math.min(maxW / width, maxH / height);
		width = Math.round(width * r); height = Math.round(height * r);
	}

	const canvas = makeCanvas(width, height);
	const ctx    = getCtx(canvas);
	if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	onProgress?.(32);

	const originalSize = file.size;
	let blob: Blob;

	if (options.targetSizeKB && options.targetSizeKB > 0) {
		blob = await binarySearch(canvas, format, options.targetSizeKB * 1024, onProgress);
	} else {
		blob = await encode(canvas, format, clampQ(options.quality ?? defaultQ(format), format));
		onProgress?.(95);
	}

	if (format === 'image/png' && blob.size >= originalSize) blob = file;
	onProgress?.(100);

	return { blob, originalSize, compressedSize: blob.size, compressionRatio: originalSize / blob.size, format, width, height };
}

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
		if (b.size <= targetBytes) { best = b; lo = mid; } else hi = mid;
		if (hi - lo < 0.004) break;
	}
	if (!best) best = await encode(canvas, format, lo);
	onProgress?.(94);
	return best;
}

function defaultQ(f: string) { return f === 'image/avif' ? 0.70 : f === 'image/jpeg' ? 0.85 : 0.82; }
function clampQ(q: number, f: string) { return f === 'image/png' ? 1 : Math.max(0.01, Math.min(0.99, q)); }

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function getCtx(c: HTMLCanvasElement | OffscreenCanvas) {
	const ctx = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	if (!ctx) throw new Error('Canvas 2D unavailable'); return ctx;
}
function encode(c: HTMLCanvasElement | OffscreenCanvas, fmt: string, q: number): Promise<Blob> {
	if (c instanceof OffscreenCanvas) return c.convertToBlob({ type: fmt, quality: q });
	return new Promise((res, rej) => (c as HTMLCanvasElement).toBlob(b => b ? res(b) : rej(new Error('toBlob null')), fmt, q));
}
function loadViaImg(file: File): Promise<ImageBitmap> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file), img = new Image();
		img.onload = async () => { URL.revokeObjectURL(url); try { resolve(await createImageBitmap(img)); } catch(e) { reject(e); } };
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
		img.src = url;
	});
}
