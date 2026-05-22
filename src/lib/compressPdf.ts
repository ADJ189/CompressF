import type { CompressOptions, CompressResult } from './types';

/**
 * PDF compression engine.
 *
 * Pipeline (proven from reference implementation):
 *  1. Load PDF.js from CDN — renders pages to canvas accurately
 *  2. For each page: render to canvas → re-encode as JPEG via canvas.toDataURL
 *  3. Use pdf-lib PDFDocument.create() + embedJpg() + drawImage()
 *  4. Save with useObjectStreams: true (smaller output, valid xref streams)
 *
 * Why pdf-lib instead of hand-rolled assembler:
 *  - pdf-lib handles all xref table construction, object numbering, stream encoding
 *  - embedJpg validates the JPEG data before writing
 *  - save() produces PDF/1.7 compatible output readable by all viewers
 *  - No xref byte-offset bugs, no content stream header bugs
 *
 * Browser optimisations:
 *  - Chrome/Edge: alpha:false canvas hint avoids compositing overhead
 *  - Safari: explicit white fill prevents transparent-to-black artefacts
 *  - Firefox: canvas.width=0 after use frees GPU memory immediately
 *  - All: pages rendered sequentially (parallel = canvas state conflicts)
 */

export type PdfCompressionLevel = 'low' | 'recommended' | 'extreme';

const PRESETS: Record<PdfCompressionLevel, { quality: number; scale: number }> = {
	low:         { quality: 0.92, scale: 2.0 },
	recommended: { quality: 0.75, scale: 1.5 },
	extreme:     { quality: 0.30, scale: 1.0 },
};

// ── PDF.js singleton ──────────────────────────────────────────────────────────

let _pdfjsPromise: Promise<any> | null = null;

async function getPdfJs(): Promise<any> {
	if (_pdfjsPromise) return _pdfjsPromise;
	_pdfjsPromise = new Promise((resolve, reject) => {
		if ((window as any).pdfjsLib) {
			const lib = (window as any).pdfjsLib;
			if (!lib.GlobalWorkerOptions.workerSrc) {
				lib.GlobalWorkerOptions.workerSrc =
					'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
			}
			resolve(lib);
			return;
		}
		const s = document.createElement('script');
		s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
		s.async = true;
		s.onload = () => {
			const lib = (window as any).pdfjsLib;
			if (!lib) { _pdfjsPromise = null; reject(new Error('PDF.js did not expose pdfjsLib')); return; }
			lib.GlobalWorkerOptions.workerSrc =
				'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
			resolve(lib);
		};
		s.onerror = () => { _pdfjsPromise = null; reject(new Error('Failed to load PDF.js from CDN')); };
		document.head.appendChild(s);
	});
	return _pdfjsPromise;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function compressPdf(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);

	// Load PDF.js
	const pdfjs = await getPdfJs();
	onProgress?.(8);

	// Validate header
	const headerBuf = await file.slice(0, 5).arrayBuffer();
	const header = new TextDecoder().decode(headerBuf);
	if (!header.startsWith('%PDF')) {
		throw new Error('Not a valid PDF file (missing %PDF header)');
	}

	// Parse source document with PDF.js
	const srcBuf = await file.arrayBuffer();
	const pdfDoc = await pdfjs.getDocument({
		data:             new Uint8Array(srcBuf),
		cMapUrl:          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
		cMapPacked:       true,
		disableRange:     true,
		disableStream:    true,
		disableAutoFetch: true,
	}).promise;

	onProgress?.(12);

	const level    = (options.pdfCompressionLevel as PdfCompressionLevel) ?? 'recommended';
	const preset   = PRESETS[level] ?? PRESETS.recommended;
	const quality  = options.quality ?? preset.quality;
	const scale    = options.pdfRenderScale ?? preset.scale;
	const numPages = pdfDoc.numPages;

	// pdf-lib: create new document to receive compressed pages
	const { PDFDocument } = await import('pdf-lib');
	const newPdf = await PDFDocument.create();

	// Detect browser for optimisations
	const ua        = navigator.userAgent;
	const isSafari  = /^((?!chrome|android).)*safari/i.test(ua);
	const isFirefox = ua.includes('Firefox/');

	// Render each page SEQUENTIALLY into the new PDF
	for (let pageNum = 1; pageNum <= numPages; pageNum++) {
		const page     = await pdfDoc.getPage(pageNum);
		const viewport = page.getViewport({ scale });

		// Canvas dimensions must be integers
		const w = Math.floor(viewport.width);
		const h = Math.floor(viewport.height);

		// CRITICAL: set dimensions BEFORE getContext
		const canvas   = document.createElement('canvas');
		canvas.width   = w;
		canvas.height  = h;

		const ctx = canvas.getContext('2d', {
			alpha: false,              // prevents premultiplied alpha issues in Safari
			willReadFrequently: false, // we only encode, not read back pixels
		}) as CanvasRenderingContext2D | null;

		if (!ctx) throw new Error(`Canvas 2D unavailable for page ${pageNum}`);

		// White background — required for JPEG (no transparency support)
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, w, h);

		// CRITICAL: await .promise on the RenderTask, not the task itself
		await page.render({ canvasContext: ctx, viewport }).promise;

		// Free GPU/font memory for this page
		page.cleanup();

		// Encode page as JPEG data URL — this is what the reference implementation uses
		// toDataURL returns a base64 data URL which pdf-lib's embedJpg accepts directly
		let jpegDataUrl: string;
		if (options.targetSizeKB && options.targetSizeKB > 0) {
			// Binary search quality to hit target per-page size
			const perPageTarget = (options.targetSizeKB * 1024) / numPages;
			jpegDataUrl = await binarySearchDataUrl(canvas, perPageTarget);
		} else {
			jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
		}

		// Embed the JPEG into the new PDF (pdf-lib validates the JPEG data)
		const embeddedImg = await newPdf.embedJpg(jpegDataUrl);

		// Add page with exact pixel dimensions — pdf-lib uses points = pixels here
		// since we're just mapping 1:1 (no DPI conversion needed for screen rendering)
		const newPage = newPdf.addPage([w, h]);
		newPage.drawImage(embeddedImg, { x: 0, y: 0, width: w, height: h });

		// Explicit memory cleanup (Firefox GPU memory leak fix)
		canvas.width  = 0;
		canvas.height = 0;

		onProgress?.(12 + Math.round((pageNum / numPages) * 82));
	}

	await pdfDoc.destroy();
	onProgress?.(95);

	// Save — useObjectStreams produces xref streams (smaller, PDF 1.5+)
	const pdfBytes = await newPdf.save({ useObjectStreams: true });

	// CRITICAL (checklist §6): correct Uint8Array → ArrayBuffer conversion
	// pdfBytes is already a Uint8Array — Blob accepts it directly
	const blob = new Blob([pdfBytes], { type: 'application/pdf' });

	if (blob.size < 100) {
		throw new Error(`Output suspiciously small (${blob.size} bytes) — pdf-lib save failed`);
	}

	onProgress?.(100);

	return {
		blob,
		originalSize:     file.size,
		compressedSize:   blob.size,
		compressionRatio: file.size / blob.size,
		format:           `PDF · ${level} · pdf-lib`,
	};
}

// ── Binary search quality for target size ─────────────────────────────────────

async function binarySearchDataUrl(canvas: HTMLCanvasElement, targetBytes: number): Promise<string> {
	let lo = 0.1, hi = 0.95, best: string | null = null;

	for (let i = 0; i < 12; i++) {
		const mid     = (lo + hi) / 2;
		const dataUrl = canvas.toDataURL('image/jpeg', mid);
		// Data URL size estimate: base64 is 4/3 of binary
		const binarySize = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);

		if (binarySize <= targetBytes) { best = dataUrl; lo = mid; }
		else hi = mid;

		if (hi - lo < 0.008) break;
	}

	return best ?? canvas.toDataURL('image/jpeg', lo);
}
