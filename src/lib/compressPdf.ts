import type { CompressOptions, CompressResult } from './types';

/**
 * PDF compression engine — ported directly from reference implementation.
 *
 * Uses pdfjs-dist (npm package, dynamic import) + pdf-lib.
 * This is the exact pipeline from the working reference:
 *  1. Dynamic import pdfjs-dist — gets correct version, sets workerSrc from it
 *  2. Render each page to canvas sequentially
 *  3. canvas.toDataURL('image/jpeg', quality) — re-encode as JPEG
 *  4. pdf-lib embedJpg + drawImage + save({ useObjectStreams: true })
 */

export type PdfCompressionLevel = 'low' | 'recommended' | 'extreme';

const PRESETS: Record<PdfCompressionLevel, { quality: number; scale: number }> = {
	low:         { quality: 0.85, scale: 2.0 },
	recommended: { quality: 0.60, scale: 1.5 },
	extreme:     { quality: 0.30, scale: 1.0 },
};

export async function compressPdf(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);

	const level   = (options.pdfCompressionLevel as PdfCompressionLevel) ?? 'recommended';
	const preset  = PRESETS[level] ?? PRESETS.recommended;
	const quality = options.quality ?? preset.quality;
	const scale   = options.pdfRenderScale ?? preset.scale;

	// ── Step 1: Load pdfjs-dist via dynamic import (reference pattern) ────────
	// Dynamic import gives us the installed version string so workerSrc is always correct.
	const pdfjsLib = await import('pdfjs-dist');
	const workerVersion = (pdfjsLib as any).version || '5.7.284';

	// Version 4+ uses .mjs worker, older uses .js
	const isModern = parseInt(workerVersion.split('.')[0]) >= 4;
	(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
		`https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.${isModern ? 'mjs' : 'js'}`;

	onProgress?.(8);

	// ── Step 2: Parse source PDF ───────────────────────────────────────────────
	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = (pdfjsLib as any).getDocument({
		data:                new Uint8Array(arrayBuffer),
		cMapUrl:             `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/cmaps/`,
		cMapPacked:          true,
		// standardFontDataUrl is critical for text-heavy PDFs (missing in old engine)
		standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/standard_fonts/`,
	});
	const pdf = await loadingTask.promise;

	onProgress?.(12);

	// ── Step 3: Create new pdf-lib document ───────────────────────────────────
	const { PDFDocument } = await import('pdf-lib');
	const newPdf    = await PDFDocument.create();
	const totalPages = pdf.numPages;

	// ── Step 4: Render each page sequentially ─────────────────────────────────
	for (let i = 1; i <= totalPages; i++) {
		const page     = await pdf.getPage(i);
		const viewport = page.getViewport({ scale });

		const canvas   = document.createElement('canvas');
		canvas.width   = Math.floor(viewport.width);
		canvas.height  = Math.floor(viewport.height);

		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Could not acquire 2D rendering context.');

		// White background — required for JPEG (transparent PDFs go black otherwise)
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Render — await .promise on the RenderTask
		await page.render({ canvasContext: ctx, viewport }).promise;

		// JPEG re-encode with quality control
		let imgDataUrl: string;
		if (options.targetSizeKB && options.targetSizeKB > 0) {
			imgDataUrl = await binarySearchQuality(canvas, (options.targetSizeKB * 1024) / totalPages);
		} else {
			imgDataUrl = canvas.toDataURL('image/jpeg', quality);
		}

		// Embed into new PDF
		const embeddedImg = await newPdf.embedJpg(imgDataUrl);
		const newPage     = newPdf.addPage([canvas.width, canvas.height]);
		newPage.drawImage(embeddedImg, { x: 0, y: 0, width: canvas.width, height: canvas.height });

		// Cleanup (reference pattern — frees GPU memory, especially on Firefox)
		canvas.width  = 0;
		canvas.height = 0;
		page.cleanup();

		onProgress?.(12 + Math.floor((i / totalPages) * 82));
	}

	await pdf.destroy();
	onProgress?.(95);

	// ── Step 5: Save (reference uses useObjectStreams: true) ──────────────────
	const compressedPdfBytes = await newPdf.save({ useObjectStreams: true });

	// Explicit Uint8Array wrapping — per reference implementation
	const finalBlob = new Blob([new Uint8Array(compressedPdfBytes)], { type: 'application/pdf' });

	if (finalBlob.size < 200) {
		throw new Error(`Output too small (${finalBlob.size} bytes) — compression failed`);
	}

	onProgress?.(100);

	return {
		blob:             finalBlob,
		originalSize:     file.size,
		compressedSize:   finalBlob.size,
		compressionRatio: file.size / finalBlob.size,
		format:           `PDF · ${level} · pdf-lib`,
	};
}

// ── Binary search for target file size ────────────────────────────────────────

async function binarySearchQuality(canvas: HTMLCanvasElement, targetBytes: number): Promise<string> {
	let lo = 0.1, hi = 0.95, best: string | null = null;

	for (let i = 0; i < 12; i++) {
		const mid     = (lo + hi) / 2;
		const dataUrl = canvas.toDataURL('image/jpeg', mid);
		// Estimate binary size from base64 length
		const binSize = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

		if (binSize <= targetBytes) { best = dataUrl; lo = mid; }
		else hi = mid;

		if (hi - lo < 0.008) break;
	}

	return best ?? canvas.toDataURL('image/jpeg', lo);
}
