import type { CompressOptions, CompressResult, ImageFormat } from './types';

/**
 * Compress an image file using Canvas API (hardware-accelerated rendering).
 * Supports JPEG, PNG, WebP, AVIF output. Uses binary search for target-size mode.
 */
export async function compressImage(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const { format = 'image/webp', maxWidth = 4096, maxHeight = 4096 } = options;

	// Load image into bitmap (uses GPU decode)
	const bitmap = await createImageBitmap(file);
	onProgress?.(10);

	// Calculate output dimensions
	let { width, height } = bitmap;
	if (width > maxWidth || height > maxHeight) {
		const ratio = Math.min(maxWidth / width, maxHeight / height);
		width = Math.round(width * ratio);
		height = Math.round(height * ratio);
	}

	// Use OffscreenCanvas if available (no main-thread paint cost)
	const canvas = typeof OffscreenCanvas !== 'undefined'
		? new OffscreenCanvas(width, height)
		: (() => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; })();

	const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
	if (!ctx) throw new Error('Canvas context unavailable');

	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	onProgress?.(30);

	const originalSize = file.size;

	// If target size is specified, binary-search for the right quality
	if (options.targetSizeKB && options.targetSizeKB > 0) {
		const targetBytes = options.targetSizeKB * 1024;
		const blob = await binarySearchQuality(canvas, format, targetBytes, onProgress);
		const ratio = originalSize / blob.size;
		return {
			blob,
			originalSize,
			compressedSize: blob.size,
			compressionRatio: ratio,
			format,
			width,
			height
		};
	}

	// Otherwise use fixed quality
	const quality = options.quality ?? 0.82;
	const blob = await canvasToBlob(canvas, format, quality);
	onProgress?.(100);

	return {
		blob,
		originalSize,
		compressedSize: blob.size,
		compressionRatio: originalSize / blob.size,
		format,
		width,
		height
	};
}

async function binarySearchQuality(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	format: ImageFormat,
	targetBytes: number,
	onProgress?: (pct: number) => void
): Promise<Blob> {
	// For lossless formats like PNG, quality doesn't help — just return as-is
	if (format === 'image/png') {
		onProgress?.(100);
		return canvasToBlob(canvas, format, 1);
	}

	let lo = 0.05, hi = 0.99, bestBlob: Blob | null = null;

	for (let i = 0; i < 12; i++) {
		const mid = (lo + hi) / 2;
		const blob = await canvasToBlob(canvas, format, mid);
		onProgress?.(30 + Math.round((i / 12) * 65));

		if (blob.size <= targetBytes) {
			bestBlob = blob;
			lo = mid; // can afford higher quality
		} else {
			hi = mid; // too large, reduce quality
		}

		if (hi - lo < 0.01) break;
	}

	// If even lowest quality is too big, return smallest we found
	if (!bestBlob) {
		bestBlob = await canvasToBlob(canvas, format, lo);
	}

	onProgress?.(100);
	return bestBlob;
}

function canvasToBlob(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	format: string,
	quality: number
): Promise<Blob> {
	if (canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({ type: format, quality });
	}
	return new Promise((resolve, reject) => {
		(canvas as HTMLCanvasElement).toBlob(
			(blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
			format,
			quality
		);
	});
}
