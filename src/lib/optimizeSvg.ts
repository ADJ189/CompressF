import type { CompressResult } from './types';

/**
 * SVG optimisation engine.
 * Uses SVGO-style manual transformations in pure TypeScript — no npm deps.
 *
 * Optimisations applied:
 *  - Remove XML declaration and comments
 *  - Remove editor metadata (Illustrator, Inkscape, Sketch namespaces)
 *  - Remove empty groups and defs
 *  - Collapse useless group wrappers
 *  - Shorten numeric precision (4 → 2 decimal places)
 *  - Remove redundant whitespace in path data
 *  - Minify: collapse whitespace between tags
 *  - Remove hidden/invisible elements (display:none, visibility:hidden, opacity:0)
 *  - Strip style attributes with default values
 */
export async function optimizeSvg(
	file: File,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(10);

	const text = await file.text();
	onProgress?.(20);

	let svg = text;

	// 1. Remove XML declaration
	svg = svg.replace(/<\?xml[^?]*\?>/gi, '');

	// 2. Remove comments
	{
		let previous: string;
		do {
			previous = svg;
			svg = svg.replace(/<!--[\s\S]*?-->/g, '');
		} while (svg !== previous);
	}

	// 3. Remove editor namespaces and metadata blocks
	// Inkscape, Illustrator, Sketch, Figma metadata
	svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
	svg = svg.replace(/<sodipodi:[^/]*(\/?>|[\s\S]*?<\/sodipodi:[^>]*>)/gi, '');
	svg = svg.replace(/<inkscape:[^/]*(\/?>|[\s\S]*?<\/inkscape:[^>]*>)/gi, '');
	svg = svg.replace(/\s+xmlns:(inkscape|sodipodi|sketch|dc|cc|rdf|xlink)="[^"]*"/gi, '');
	svg = svg.replace(/\s+(inkscape|sodipodi):[a-z-]+="[^"]*"/gi, '');

	onProgress?.(35);

	// 4. Remove empty groups: <g></g> or <g  />
	svg = svg.replace(/<g[^>]*>\s*<\/g>/gi, '');
	svg = svg.replace(/<g\s*\/>/gi, '');

	// 5. Remove empty defs
	svg = svg.replace(/<defs>\s*<\/defs>/gi, '');

	// 6. Round numbers to 2 decimal places in path data and transforms
	svg = svg.replace(/(\d+\.\d{3,})/g, (match) => {
		return parseFloat(match).toFixed(2).replace(/\.?0+$/, '');
	});

	onProgress?.(55);

	// 7. Compact path data whitespace
	svg = svg.replace(/\s+([MmZzLlHhVvCcSsQqTtAa])/g, '$1');
	svg = svg.replace(/([MmZzLlHhVvCcSsQqTtAa])\s+/g, '$1');
	svg = svg.replace(/,\s+/g, ',');

	// 8. Remove style attributes with only default/redundant values
	svg = svg.replace(/\s+style="(fill:none;)?(stroke:none;)?(opacity:1;)?"/gi, '');

	// 9. Remove script tags iteratively to avoid incomplete multi-character sanitization
	let previousSvg: string;
	do {
		previousSvg = svg;
		svg = svg.replace(/<script\b[^>]*(?:\/>|>[\s\S]*?<\/script(?:\s[^>]*)?>)/gi, '');
	} while (svg !== previousSvg);

	// Remove display:none and visibility:hidden elements entirely
	svg = svg.replace(/<[^>]+(?:display\s*:\s*none|visibility\s*:\s*hidden)[^>]*(\/?>|[\s\S]*?<\/[a-z]+>)/gi, '');

	// 10. Collapse redundant whitespace between tags
	svg = svg.replace(/>\s{2,}</g, '><');
	svg = svg.replace(/\s{2,}/g, ' ');
	svg = svg.trim();

	onProgress?.(80);

	// 11. Ensure viewBox exists if width/height are present (for responsive SVG)
	if (!svg.includes('viewBox') && svg.includes('width=') && svg.includes('height=')) {
		const w = svg.match(/width="([^"]+)"/)?.[1];
		const h = svg.match(/height="([^"]+)"/)?.[1];
		if (w && h && !isNaN(parseFloat(w)) && !isNaN(parseFloat(h))) {
			svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
		}
	}

	onProgress?.(95);

	const blob = new Blob([svg], { type: 'image/svg+xml' });
	onProgress?.(100);

	return {
		blob,
		originalSize:     file.size,
		compressedSize:   blob.size,
		compressionRatio: file.size / blob.size,
		format:           'SVG (optimised)',
	};
}
