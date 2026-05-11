import type { CompressOptions, CompressResult } from './types';

/**
 * PDF compression: loads PDF pages via PDF.js (loaded from CDN),
 * re-renders each page to canvas, then repackages as compressed-image PDF.
 * This is a structural optimization — embeds pages as compressed JPEGs.
 */
export async function compressPdf(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const { quality = 0.82, targetSizeKB } = options;

	// Dynamically load PDF.js from CDN
	const pdfjsLib = await loadPdfJs();
	onProgress?.(5);

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const numPages = pdf.numPages;
	onProgress?.(10);

	// We'll collect page image blobs
	const pageBlobs: Blob[] = [];
	const pageDimensions: { width: number; height: number }[] = [];

	for (let i = 1; i <= numPages; i++) {
		const page = await pdf.getPage(i);
		const viewport = page.getViewport({ scale: 1.5 }); // 1.5x for decent resolution

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(viewport.width);
		canvas.height = Math.round(viewport.height);
		const ctx = canvas.getContext('2d')!;

		await page.render({ canvasContext: ctx, viewport }).promise;

		const q = targetSizeKB
			? quality // we'll adjust globally later
			: quality;

		const blob = await new Promise<Blob>((res, rej) =>
			canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', q)
		);

		pageBlobs.push(blob);
		pageDimensions.push({ width: canvas.width, height: canvas.height });
		onProgress?.(10 + Math.round((i / numPages) * 75));
	}

	// Assemble a minimal PDF containing the JPEG images
	const pdfBytes = await buildImagePdf(pageBlobs, pageDimensions);
	onProgress?.(100);

	const outputBlob = new Blob([pdfBytes], { type: 'application/pdf' });
	return {
		blob: outputBlob,
		originalSize: file.size,
		compressedSize: outputBlob.size,
		compressionRatio: file.size / outputBlob.size,
		format: 'application/pdf'
	};
}

async function loadPdfJs(): Promise<any> {
	return new Promise((resolve, reject) => {
		if ((window as any).pdfjsLib) {
			resolve((window as any).pdfjsLib);
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
		script.onload = () => {
			const lib = (window as any).pdfjsLib;
			lib.GlobalWorkerOptions.workerSrc =
				'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
			resolve(lib);
		};
		script.onerror = () => reject(new Error('Failed to load PDF.js'));
		document.head.appendChild(script);
	});
}

/**
 * Build a minimal valid PDF with embedded JPEG pages.
 * Hand-crafted PDF structure — no external library needed.
 */
async function buildImagePdf(
	blobs: Blob[],
	dims: { width: number; height: number }[]
): Promise<Uint8Array> {
	// Read all image data
	const images = await Promise.all(blobs.map(b => b.arrayBuffer()));

	const encoder = new TextEncoder();
	const parts: Uint8Array[] = [];
	const offsets: number[] = [];
	let offset = 0;

	function write(s: string) {
		const bytes = encoder.encode(s);
		parts.push(bytes);
		offset += bytes.length;
	}

	function writeRaw(data: ArrayBuffer) {
		const bytes = new Uint8Array(data);
		parts.push(bytes);
		offset += bytes.length;
	}

	// PDF header
	write('%PDF-1.4\n');

	const n = blobs.length;
	// Object IDs: 1=catalog, 2=pages, 3..3+n-1=page objects, 3+n..3+2n-1=image XObjects
	const catalogId = 1;
	const pagesId = 2;
	const pageObjStart = 3;
	const imageObjStart = 3 + n;

	// Pages parent ref
	offsets[pagesId - 1] = offset;
	const kidsRefs = Array.from({ length: n }, (_, i) => `${pageObjStart + i} 0 R`).join(' ');
	write(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${n} >>\nendobj\n`);

	// Each page + image
	for (let i = 0; i < n; i++) {
		const { width, height } = dims[i];
		const pw = (width / 1.5 * 72 / 96).toFixed(2); // approx pt
		const ph = (height / 1.5 * 72 / 96).toFixed(2);
		const pageId = pageObjStart + i;
		const imgId = imageObjStart + i;

		offsets[pageId - 1] = offset;
		write(`${pageId} 0 obj\n<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pw} ${ph}] `);
		write(`/Resources << /XObject << /Img${i} ${imgId} 0 R >> >> `);
		write(`/Contents << /Length ${(`q ${pw} 0 0 ${ph} 0 0 cm /Img${i} Do Q`).length + 1} >> >>\nendobj\n`);

		// Content stream inline
		const stream = `q ${pw} 0 0 ${ph} 0 0 cm /Img${i} Do Q`;
		write(`stream\n${stream}\nendstream\n`);

		// Image XObject
		const imgBytes = images[i];
		offsets[imgId - 1] = offset;
		write(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} `);
		write(`/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.byteLength} >>\nstream\n`);
		writeRaw(imgBytes);
		write('\nendstream\nendobj\n');
	}

	// Catalog
	offsets[catalogId - 1] = offset;
	write(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);

	// xref table
	const xrefOffset = offset;
	const totalObjs = 2 + 2 * n;
	write(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
	for (let i = 0; i < totalObjs; i++) {
		write(`${(offsets[i] ?? 0).toString().padStart(10, '0')} 00000 n \n`);
	}
	write(`trailer\n<< /Size ${totalObjs + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

	// Merge all parts
	const total = parts.reduce((acc, p) => acc + p.length, 0);
	const result = new Uint8Array(total);
	let pos = 0;
	for (const part of parts) {
		result.set(part, pos);
		pos += part.length;
	}
	return result;
}
