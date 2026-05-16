import type { CompressOptions, CompressResult, ImageFormat } from './types';

/**
 * Image compression engine — browser-optimised.
 *
 * Chrome/Edge:  OffscreenCanvas + AVIF via libavif (AVX2 SIMD)
 *               WebP via libwebp (SSE4.1/AVX2 SIMD)
 * Safari:       OffscreenCanvas + HEIC decode via ImageIO (GPU)
 *               WebP via native encoder (Apple Silicon hardware)
 * Firefox:      Regular Canvas (OffscreenCanvas supported but no AVIF encode)
 *               Falls back to WebP or JPEG for AVIF requests
 */

function getBrowser() {
	if (typeof navigator === 'undefined') return { isChrome: false, isSafari: false, isFirefox: false, isEdge: false };
	const ua = navigator.userAgent;
	const isEdge    = ua.includes('Edg/');
	const isChrome  = ua.includes('Chrome/') && !isEdge;
	const isSafari  = ua.includes('Safari/') && !ua.includes('Chrome/');
	const isFirefox = ua.includes('Firefox/');
	return { isChrome, isSafari, isFirefox, isEdge };
}

/** Returns the best supported output format for the current browser */
export function getBestFormat(requested: ImageFormat): ImageFormat {
	const { isFirefox, isSafari } = getBrowser();

	if (requested === 'image/avif') {
		// Firefox doesn't support AVIF encoding yet — fall back to WebP
		if (isFirefox) return 'image/webp';
		// Safari 16+ supports AVIF encode
		// Chrome 94+ supports AVIF encode
		return 'image/avif';
	}

	return requested;
}

export async function compressImage(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(5);

	const { isFirefox } = getBrowser();
	const requestedFormat = options.format ?? 'image/webp';
	// Silently upgrade to best available format
	const format = getBestFormat(requestedFormat);

	const maxW = options.maxWidth  ?? 16384;
	const maxH = options.maxHeight ?? 16384;

	// 1. Decode — GPU-accelerated on Chrome/Safari/Edge via OS image decoders
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { resizeQuality: 'high' });
	} catch {
		// Firefox AVIF fallback, or any other decode failure
		bitmap = await loadViaImg(file);
	}
	onProgress?.(18);

	// 2. Compute output dimensions
	let { width, height } = bitmap;
	if (width > maxW || height > maxH) {
		const r = Math.min(maxW / width, maxH / height);
		width   = Math.round(width * r);
		height  = Math.round(height * r);
	}

	// 3. Draw — OffscreenCanvas (GPU compositor thread) or regular Canvas
	//    Firefox supports OffscreenCanvas but toBlob is slower there; both work fine
	const canvas = makeCanvas(width, height);
	const ctx    = getCtx(canvas);

	// White background before drawing (avoids black bg on PNG→JPEG conversion)
	if (format === 'image/jpeg') {
		(ctx as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
	}

	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	onProgress?.(32);

	const originalSize = file.size;
	let blob: Blob;

	if (options.targetSizeKB && options.targetSizeKB > 0) {
		blob = await binarySearch(canvas, format, options.targetSizeKB * 1024, onProgress);
	} else {
		const quality = clampQuality(options.quality ?? defaultQuality(format), format);
		blob = await encode(canvas, format, quality);
		onProgress?.(95);
	}

	// Never return a larger file than the original (relevant for PNG lossless)
	if (blob.size >= originalSize && format === 'image/png') blob = file;

	onProgress?.(100);
	return {
		blob, originalSize, compressedSize: blob.size,
		compressionRatio: originalSize / blob.size,
		format, width, height
	};
}

// ── Quality defaults per format ───────────────────────────────────────────────

function defaultQuality(fmt: string): number {
	if (fmt === 'image/avif')  return 0.70; // AVIF is efficient — lower q still looks great
	if (fmt === 'image/webp')  return 0.82;
	if (fmt === 'image/jpeg')  return 0.85;
	return 1; // PNG — lossless
}

function clampQuality(q: number, fmt: string): number {
	if (fmt === 'image/png') return 1;
	return Math.max(0.01, Math.min(0.99, q));
}

// ── Binary search ─────────────────────────────────────────────────────────────

async function binarySearch(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat,
	targetBytes: number,
	onProgress?: (pct: number) => void
): Promise<Blob> {
	if (format === 'image/png') {
		onProgress?.(90);
		return encode(canvas, format, 1);
	}

	let lo = 0.01, hi = 0.99, best: Blob | null = null;

	for (let i = 0; i < 14; i++) {
		const mid  = (lo + hi) / 2;
		const blob = await encode(canvas, format, mid);
		onProgress?.(32 + Math.round((i / 14) * 60));

		if (blob.size <= targetBytes) { best = blob; lo = mid; }
		else hi = mid;

		if (hi - lo < 0.004) break;
	}

	if (!best) best = await encode(canvas, format, lo);
	onProgress?.(94);
	return best;
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	const c = document.createElement('canvas');
	c.width = w; c.height = h; return c;
}

function getCtx(c: HTMLCanvasElement | OffscreenCanvas) {
	const ctx = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	if (!ctx) throw new Error('Canvas 2D unavailable');
	return ctx;
}

function encode(c: HTMLCanvasElement | OffscreenCanvas, fmt: string, q: number): Promise<Blob> {
	if (c instanceof OffscreenCanvas) return c.convertToBlob({ type: fmt, quality: q });
	return new Promise((res, rej) =>
		(c as HTMLCanvasElement).toBlob(b => b ? res(b) : rej(new Error('toBlob null')), fmt, q)
	);
}

function loadViaImg(file: File): Promise<ImageBitmap> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = async () => {
			URL.revokeObjectURL(url);
			try { resolve(await createImageBitmap(img)); } catch (e) { reject(e); }
		};
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
		img.src = url;
	});
}
