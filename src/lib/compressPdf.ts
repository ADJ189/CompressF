import type { CompressOptions, CompressResult } from './types';

/**
 * PDF compression engine.
 *
 * Strategy:
 *  1. Load with PDF.js (CDN, lazy) — parses PDF structure, renders pages.
 *  2. Each page rendered at configurable scale to OffscreenCanvas / Canvas.
 *  3. Pages re-encoded as JPEG (lossy, best ratio) or PNG (lossless).
 *  4. Pages reassembled into a valid minimal PDF with embedded image XObjects.
 *
 * Hardware notes:
 *  - PDF.js rendering uses the browser's Canvas 2D backend, which is GPU-composited.
 *  - createImageBitmap for any embedded images uses OS GPU decoders.
 *  - The output PDF builder is pure TypeScript — zero native dependencies.
 */
export async function compressPdf(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(3);
	const quality = options.quality ?? 0.82;
	const renderScale = options.pdfRenderScale ?? 1.8; // higher = more detail retained
	const imgFormat   = options.pdfImageFormat ?? 'image/jpeg';

	const pdfjsLib = await loadPdfJs();
	onProgress?.(8);

	const ab  = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
	const n   = pdf.numPages;
	onProgress?.(12);

	const pages: { blob: Blob; w: number; h: number }[] = [];

	for (let i = 1; i <= n; i++) {
		const page     = await pdf.getPage(i);
		const viewport = page.getViewport({ scale: renderScale });
		const pw       = Math.round(viewport.width);
		const ph       = Math.round(viewport.height);

		const canvas   = document.createElement('canvas');
		canvas.width   = pw;
		canvas.height  = ph;
		const ctx      = canvas.getContext('2d')!;

		// White background (PDFs may have transparent pages)
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, pw, ph);

		await page.render({ canvasContext: ctx, viewport }).promise;

		// Encode page
		let blob: Blob;
		if (options.targetSizeKB && options.targetSizeKB > 0) {
			// Distribute target proportionally
			const perPageTarget = (options.targetSizeKB / n) * 1024;
			blob = await binarySearchPage(canvas, imgFormat, perPageTarget);
		} else {
			blob = await encodeCanvas(canvas, imgFormat, quality);
		}

		pages.push({ blob, w: pw, h: ph });
		onProgress?.(12 + Math.round((i / n) * 75));
	}

	onProgress?.(88);
	const pdfBytes = await assemblePdf(pages, renderScale);
	onProgress?.(100);

	const out = new Blob([pdfBytes], { type: 'application/pdf' });
	return {
		blob: out,
		originalSize: file.size,
		compressedSize: out.size,
		compressionRatio: file.size / out.size,
		format: 'application/pdf',
	};
}

// ── Per-page binary search ────────────────────────────────────────────────────

async function binarySearchPage(
	canvas: HTMLCanvasElement,
	fmt: string,
	targetBytes: number
): Promise<Blob> {
	if (fmt === 'image/png') return encodeCanvas(canvas, fmt, 1);
	let lo = 0.05, hi = 0.95, best: Blob | null = null;
	for (let i = 0; i < 12; i++) {
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
		canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob null')), fmt, quality)
	);
}

// ── PDF.js loader ─────────────────────────────────────────────────────────────

async function loadPdfJs(): Promise<any> {
	return new Promise((resolve, reject) => {
		if ((window as any).pdfjsLib) { resolve((window as any).pdfjsLib); return; }
		const script    = document.createElement('script');
		script.src      = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
		script.type     = 'module';
		script.onload   = () => {
			// pdf.mjs exports — pick up the global set by the CDN UMD build
			// Fallback: try older 3.x UMD
			if ((window as any).pdfjsLib) {
				(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
					'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
				resolve((window as any).pdfjsLib);
			} else {
				loadPdfJsLegacy().then(resolve).catch(reject);
			}
		};
		script.onerror  = () => loadPdfJsLegacy().then(resolve).catch(reject);
		document.head.appendChild(script);
	});
}

function loadPdfJsLegacy(): Promise<any> {
	return new Promise((resolve, reject) => {
		const s   = document.createElement('script');
		s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
		s.onload  = () => {
			const lib = (window as any).pdfjsLib;
			lib.GlobalWorkerOptions.workerSrc =
				'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
			resolve(lib);
		};
		s.onerror = () => reject(new Error('Failed to load PDF.js'));
		document.head.appendChild(s);
	});
}

// ── Minimal PDF assembler ─────────────────────────────────────────────────────

async function assemblePdf(
	pages: { blob: Blob; w: number; h: number }[],
	scale: number
): Promise<Uint8Array> {
	const enc    = new TextEncoder();
	const parts: Uint8Array[] = [];
	const xrefs: number[]     = [];
	let offset   = 0;

	const write = (s: string) => {
		const b = enc.encode(s); parts.push(b); offset += b.length;
	};
	const writeRaw = (b: Uint8Array) => { parts.push(b); offset += b.length; };

	// Header
	write('%PDF-1.5\n%\xFF\xFF\xFF\xFF\n');

	const n = pages.length;
	// Object layout:
	//   1 = catalog
	//   2 = pages
	//   3..3+n-1   = page objects
	//   3+n..3+2n-1 = image XObjects

	// Object 2: Pages
	xrefs[2] = offset;
	const kids = Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(' ');
	write(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${n} >>\nendobj\n`);

	const imgData: ArrayBuffer[] = await Promise.all(pages.map(p => p.blob.arrayBuffer()));

	for (let i = 0; i < n; i++) {
		const { w, h } = pages[i];
		// Convert px at renderScale to PDF points (72pt/inch, screen ~96dpi)
		const ptW = ((w / scale) * 72 / 96).toFixed(3);
		const ptH = ((h / scale) * 72 / 96).toFixed(3);
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
		// Inline content stream
		write(`stream\n${content}\nendstream\n`);

		// Image XObject
		const isJpeg = pages[i].blob.type.includes('jpeg');
		const filter  = isJpeg ? '/DCTDecode' : '/FlateDecode';
		const cs      = isJpeg ? '/DeviceRGB' : '/DeviceRGB';
		const imgBytes = new Uint8Array(imgData[i]);

		xrefs[imgId] = offset;
		write(`${imgId} 0 obj\n`);
		write(`<< /Type /XObject /Subtype /Image\n`);
		write(`   /Width ${w} /Height ${h}\n`);
		write(`   /ColorSpace ${cs} /BitsPerComponent 8\n`);
		write(`   /Filter ${filter} /Length ${imgBytes.length} >>\n`);
		write(`stream\n`);
		writeRaw(imgBytes);
		write(`\nendstream\nendobj\n`);
	}

	// Catalog (object 1)
	xrefs[1] = offset;
	write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

	// xref table
	const xrefOffset = offset;
	const total = 2 + 2 * n; // object count excluding object 0
	write(`xref\n0 ${total + 1}\n`);
	write(`0000000000 65535 f \n`);
	for (let i = 1; i <= total; i++) {
		write(`${String(xrefs[i] ?? 0).padStart(10, '0')} 00000 n \n`);
	}
	write(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\n`);
	write(`startxref\n${xrefOffset}\n%%EOF\n`);

	const totalLen = parts.reduce((a, p) => a + p.length, 0);
	const out      = new Uint8Array(totalLen);
	let pos        = 0;
	for (const p of parts) { out.set(p, pos); pos += p.length; }
	return out;
}
