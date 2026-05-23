import type { CompressOptions, CompressResult } from './types';

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

	const pdfjsLib = await import('pdfjs-dist');
	const workerVersion = (pdfjsLib as any).version || '5.7.284';

	const isModern = parseInt(workerVersion.split('.')[0]) >= 4;
	(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
		`https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.${isModern ? 'mjs' : 'js'}`;

	onProgress?.(8);

	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = (pdfjsLib as any).getDocument({
		data:                new Uint8Array(arrayBuffer),
		cMapUrl:             `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/cmaps/`,
		cMapPacked:          true,
		standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/standard_fonts/`,
	});
	const pdf = await loadingTask.promise;

	onProgress?.(12);

	const { PDFDocument } = await import('pdf-lib');
	const newPdf    = await PDFDocument.create();
	const totalPages = pdf.numPages;

	for (let i = 1; i <= totalPages; i++) {
		const page     = await pdf.getPage(i);
		const viewport = page.getViewport({ scale });

		const canvas   = document.createElement('canvas');
		canvas.width   = Math.floor(viewport.width);
		canvas.height  = Math.floor(viewport.height);

		// FIX: Added alpha: false for optimization
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('Could not acquire 2D rendering context.');

		// FIX: Force white background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		await page.render({ canvasContext: ctx, viewport }).promise;

		let imgDataUrl: string;
		if (options.targetSizeKB && options.targetSizeKB > 0) {
			imgDataUrl = await binarySearchQuality(canvas, (options.targetSizeKB * 1024) / totalPages);
		} else {
			imgDataUrl = canvas.toDataURL('image/jpeg', quality);
		}

		const embeddedImg = await newPdf.embedJpg(imgDataUrl);
		const newPage     = newPdf.addPage([canvas.width, canvas.height]);
		newPage.drawImage(embeddedImg, { x: 0, y: 0, width: canvas.width, height: canvas.height });

		canvas.width  = 0;
		canvas.height = 0;
		page.cleanup();

		onProgress?.(12 + Math.floor((i / totalPages) * 82));
	}

	await pdf.destroy();
	onProgress?.(95);

	const compressedPdfBytes = await newPdf.save({ useObjectStreams: true });
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

async function binarySearchQuality(canvas: HTMLCanvasElement, targetBytes: number): Promise<string> {
	let lo = 0.1, hi = 0.95, best: string | null = null;

	for (let i = 0; i < 12; i++) {
		const mid     = (lo + hi) / 2;
		const dataUrl = canvas.toDataURL('image/jpeg', mid);
		const binSize = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

		if (binSize <= targetBytes) { best = dataUrl; lo = mid; }
		else hi = mid;

		if (hi - lo < 0.008) break;
	}

	return best ?? canvas.toDataURL('image/jpeg', lo);
}
	return best ?? canvas.toDataURL('image/jpeg', lo);
}
