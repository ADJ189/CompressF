import type { CompressOptions, CompressResult } from './types';

/**
 * PDF compression engine — fixed blank page bug.
 *
 * Root causes of blank pages (from PDF.js issues):
 *  1. Canvas width/height must be set BEFORE getContext('2d') is called
 *  2. page.render() returns a RenderTask — must await .promise not the task itself
 *  3. PDF.js worker must be fully initialised before getDocument()
 *  4. Pages must be rendered sequentially (not in parallel) to avoid canvas conflicts
 *
 * iLovePDF-inspired compression levels:
 *  - Low (0.92):         minimal loss, preserves quality
 *  - Recommended (0.82): good balance — default
 *  - Extreme (0.55):     maximum compression, slight quality loss
 */

// ── PDF.js loader ─────────────────────────────────────────────────────────────

let pdfjsPromise: Promise<any> | null = null;

async function getPdfJs(): Promise<any> {
	if (pdfjsPromise) return pdfjsPromise;

	pdfjsPromise = new Promise((resolve, reject) => {
		// Use the stable 3.x UMD build — most reliable cross-browser
		if ((window as any).pdfjsLib) {
			resolve((window as any).pdfjsLib);
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

		script.onload = () => {
			const lib = (window as any).pdfjsLib;
			if (!lib) { reject(new Error('PDF.js loaded but pdfjsLib not found')); return; }

			// Worker must be set before any getDocument() call
			lib.GlobalWorkerOptions.workerSrc =
				'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

			resolve(lib);
		};

		script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
		document.head.appendChild(script);
	});

	return pdfjsPromise;
}

// ── Compression presets (iLovePDF-style) ─────────────────────────────────────

export type PdfCompressionLevel = 'low' | 'recommended' | 'extreme';

const PRESETS: Record<PdfCompressionLevel, { quality: number; scale: number; label: string }> = {
	low:         { quality: 0.92, scale: 2.0, label: 'Low — high quality, less compression' },
	recommended: { quality: 0.82, scale: 1.8, label: 'Recommended — best balance' },
	extreme:     { quality: 0.55, scale: 1.2, label: 'Extreme — maximum compression' },
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function compressPdf(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);

	// Load PDF.js (cached after first call)
	const pdfjs = await getPdfJs();
	onProgress?.(8);

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();

	// Load PDF document — pass copy of buffer so PDF.js can transfer it
	const pdf = await pdfjs.getDocument({
		data: arrayBuffer,
		// These prevent font-related render issues
		cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
		cMapPacked: true,
	}).promise;

	onProgress?.(12);

	const numPages = pdf.numPages;

	// Determine quality and scale
	const level = (options.pdfCompressionLevel as PdfCompressionLevel) ?? 'recommended';
	const preset = PRESETS[level] ?? PRESETS.recommended;
	const quality = options.quality ?? preset.quality;
	const scale   = options.pdfRenderScale ?? preset.scale;
	const imgFmt  = options.pdfImageFormat ?? 'image/jpeg';

	// Render pages SEQUENTIALLY — parallel rendering causes blank pages
	const pageBlobs: Array<{ blob: Blob; w: number; h: number }> = [];

	for (let pageNum = 1; pageNum <= numPages; pageNum++) {
		const blob = await renderPage(pdf, pageNum, scale, quality, imgFmt, options.targetSizeKB, numPages);
		pageBlobs.push(blob);
		onProgress?.(12 + Math.round((pageNum / numPages) * 72));
	}

	onProgress?.(85);

	// Assemble output PDF
	const pdfBytes = await assemblePdf(pageBlobs, scale);
	onProgress?.(100);

	const outBlob = new Blob([pdfBytes], { type: 'application/pdf' });

	return {
		blob:             outBlob,
		originalSize:     file.size,
		compressedSize:   outBlob.size,
		compressionRatio: file.size / outBlob.size,
		format:           `PDF · ${level} compression`,
	};
}

// ── Page renderer — THE FIX for blank pages ──────────────────────────────────

async function renderPage(
	pdf: any,
	pageNum: number,
	scale: number,
	quality: number,
	imgFmt: string,
	targetSizeKB: number | undefined,
	totalPages: number
): Promise<{ blob: Blob; w: number; h: number }> {
	const page     = await pdf.getPage(pageNum);
	const viewport = page.getViewport({ scale });

	const w = Math.floor(viewport.width);
	const h = Math.floor(viewport.height);

	// CRITICAL: create canvas and set dimensions BEFORE getContext
	const canvas   = document.createElement('canvas');
	canvas.width   = w;
	canvas.height  = h;

	// CRITICAL: get context AFTER setting dimensions
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error(`Canvas 2D context unavailable for page ${pageNum}`);

	// White background — prevents transparent areas rendering as black in JPEG
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, w, h);

	// CRITICAL: await the .promise property of the render task, not the task itself
	await page.render({ canvasContext: ctx, viewport }).promise;

	// Clean up page resources immediately
	page.cleanup();

	// Encode — binary search if target size specified
	let blob: Blob;
	if (targetSizeKB && targetSizeKB > 0) {
		const perPageBytes = (targetSizeKB * 1024) / totalPages;
		blob = await binarySearchPage(canvas, imgFmt, perPageBytes);
	} else {
		blob = await encodeCanvas(canvas, imgFmt, quality);
	}

	return { blob, w, h };
}

async function binarySearchPage(canvas: HTMLCanvasElement, fmt: string, targetBytes: number): Promise<Blob> {
	if (fmt === 'image/png') return encodeCanvas(canvas, fmt, 1);
	let lo = 0.3, hi = 0.95, best: Blob | null = null;
	for (let i = 0; i < 10; i++) {
		const mid  = (lo + hi) / 2;
		const blob = await encodeCanvas(canvas, fmt, mid);
		if (blob.size <= targetBytes) { best = blob; lo = mid; }
		else hi = mid;
		if (hi - lo < 0.01) break;
	}
	return best ?? encodeCanvas(canvas, fmt, lo);
}

function encodeCanvas(canvas: HTMLCanvasElement, fmt: string, quality: number): Promise<Blob> {
	return new Promise((res, rej) =>
		canvas.toBlob(
			b => b ? res(b) : rej(new Error('Canvas toBlob returned null')),
			fmt,
			quality
		)
	);
}

// ── Minimal PDF assembler ─────────────────────────────────────────────────────

async function assemblePdf(
	pages: Array<{ blob: Blob; w: number; h: number }>,
	scale: number
): Promise<Uint8Array> {
	const enc   = new TextEncoder();
	const parts: Uint8Array[] = [];
	const xrefs: number[]     = [];
	let   offset = 0;

	const write = (s: string) => {
		const b = enc.encode(s); parts.push(b); offset += b.length;
	};
	const writeRaw = (b: Uint8Array) => { parts.push(b); offset += b.length; };

	write('%PDF-1.5\n%\xFF\xFF\xFF\xFF\n');

	const n       = pages.length;
	// Objects: 1=catalog, 2=pages, 3..3+n-1=page objs, 3+n..3+2n-1=img xobjs
	const catId   = 1;
	const pagesId = 2;

	// Object 2 — Pages dictionary
	xrefs[pagesId] = offset;
	const kids = Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(' ');
	write(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${n} >>\nendobj\n`);

	// Read all image data upfront
	const imgDatas = await Promise.all(pages.map(p => p.blob.arrayBuffer()));

	for (let i = 0; i < n; i++) {
		const { w, h } = pages[i];

		// Convert pixels → PDF points (72pt = 1 inch, screen = 96 dpi)
		// At render scale S: 1 PDF point = S * 96/72 pixels → ptW = w / (S * 96/72)
		const ptW = (w / (scale * 96 / 72)).toFixed(3);
		const ptH = (h / (scale * 96 / 72)).toFixed(3);

		const pageId = 3 + i;
		const imgId  = 3 + n + i;

		// Page content stream
		const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im${i} Do Q`;

		// Page object
		xrefs[pageId] = offset;
		write(`${pageId} 0 obj\n`);
		write(`<< /Type /Page /Parent 2 0 R\n`);
		write(`   /MediaBox [0 0 ${ptW} ${ptH}]\n`);
		write(`   /Resources << /XObject << /Im${i} ${imgId} 0 R >> >>\n`);
		write(`   /Contents << /Length ${content.length} >> >>\n`);
		write(`endobj\n`);
		write(`stream\n${content}\nendstream\n`);

		// Image XObject
		const imgBytes  = new Uint8Array(imgDatas[i]);
		const isJpeg    = pages[i].blob.type.includes('jpeg');
		const filter    = isJpeg ? '/DCTDecode' : '/FlateDecode';

		xrefs[imgId] = offset;
		write(`${imgId} 0 obj\n`);
		write(`<< /Type /XObject /Subtype /Image\n`);
		write(`   /Width ${w} /Height ${h}\n`);
		write(`   /ColorSpace /DeviceRGB /BitsPerComponent 8\n`);
		write(`   /Filter ${filter} /Length ${imgBytes.length} >>\n`);
		write(`stream\n`);
		writeRaw(imgBytes);
		write(`\nendstream\nendobj\n`);
	}

	// Catalog (object 1)
	xrefs[catId] = offset;
	write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

	// xref table
	const xrefOffset = offset;
	const totalObjs  = 2 + 2 * n;
	write(`xref\n0 ${totalObjs + 1}\n`);
	write(`0000000000 65535 f \n`);
	for (let i = 1; i <= totalObjs; i++) {
		write(`${String(xrefs[i] ?? 0).padStart(10, '0')} 00000 n \n`);
	}
	write(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\n`);
	write(`startxref\n${xrefOffset}\n%%EOF\n`);

	const totalLen = parts.reduce((a, p) => a + p.length, 0);
	const out      = new Uint8Array(totalLen);
	let   pos      = 0;
	for (const p of parts) { out.set(p, pos); pos += p.length; }
	return out;
}
