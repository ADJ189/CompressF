import type { CompressOptions, CompressResult } from './types';
import { getFFmpeg, ffetchFile } from './ffmpeg';

export async function compressGif(
	file: File, options: CompressOptions, onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);
	const ff = await getFFmpeg();
	onProgress?.(6);
	ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(6 + Math.round(progress * 85)));

	const toVideo   = options.gifToVideo ?? false;
	const inputName = 'input.gif';
	await ff.writeFile(inputName, await ffetchFile(file));

	let blob: Blob; let fmt: string;

	if (toVideo) {
		// GIF → WebM VP9 — typically 70–95% smaller
		await ff.exec([
			'-i', inputName, '-c:v', 'libvpx-vp9', '-b:v', '0',
			'-crf', '33', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
			'-an', '-loop', '0', '-y', 'output.webm'
		]);
		const d = await ff.readFile('output.webm') as Uint8Array;
		blob = new Blob([d.buffer], { type: 'video/webm' });
		fmt  = 'WebM (from GIF)';
		await ff.deleteFile('output.webm').catch(() => {});
	} else {
		// Two-pass palettegen + paletteuse (gold-standard GIF compression)
		const q      = options.quality ?? 0.82;
		const colors = Math.round(16 + q * 240); // 16–256
		const scale  = options.maxWidth ? `scale=${options.maxWidth}:-1:flags=lanczos,` : '';
		const fpsFlt = options.fps ? `fps=${options.fps},` : '';
		const pre    = `${fpsFlt}${scale}`;

		await ff.exec(['-i', inputName, '-vf', `${pre}palettegen=max_colors=${colors}:stats_mode=diff`, '-y', 'palette.png']);
		await ff.exec(['-i', inputName, '-i', 'palette.png', '-lavfi', `${pre}paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`, '-y', 'output.gif']);

		const d = await ff.readFile('output.gif') as Uint8Array;
		blob = new Blob([d.buffer], { type: 'image/gif' });
		fmt  = `GIF · ${colors} colours`;

		await ff.deleteFile('palette.png').catch(() => {});
		await ff.deleteFile('output.gif').catch(() => {});
	}

	await ff.deleteFile(inputName).catch(() => {});
	onProgress?.(100);

	return { blob, originalSize: file.size, compressedSize: blob.size, compressionRatio: file.size / blob.size, format: `${fmt} · FFmpeg.wasm` };
}
