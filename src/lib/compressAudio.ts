import type { CompressOptions, CompressResult, AudioFormat } from './types';
import { getFFmpeg, ffetchFile } from './ffmpeg';

export async function compressAudio(
	file: File, options: CompressOptions, onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);
	const ff  = await getFFmpeg();
	onProgress?.(6);

	ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(6 + Math.round(progress * 88)));

	const ext     = file.name.match(/\.[^.]+$/)?.[0] ?? '.audio';
	const fmt     = (options.audioFormat ?? 'mp3') as AudioFormat;
	const outName = `output.${fmt === 'aac' ? 'm4a' : fmt}`;

	await ff.writeFile(`input${ext}`, await ffetchFile(file));
	await ff.exec(buildArgs(`input${ext}`, outName, fmt, options));

	const data = await ff.readFile(outName) as Uint8Array;
	await ff.deleteFile(`input${ext}`).catch(() => {});
	await ff.deleteFile(outName).catch(() => {});

	const mimes: Record<AudioFormat, string> = { mp3: 'audio/mpeg', aac: 'audio/mp4', ogg: 'audio/ogg', opus: 'audio/ogg; codecs=opus', flac: 'audio/flac', wav: 'audio/wav' };
	const blob = new Blob([data.buffer], { type: mimes[fmt] ?? 'audio/mpeg' });
	onProgress?.(100);

	return { blob, originalSize: file.size, compressedSize: blob.size, compressionRatio: file.size / blob.size, format: `${fmt.toUpperCase()} · FFmpeg.wasm` };
}

function buildArgs(input: string, output: string, fmt: AudioFormat, o: CompressOptions): string[] {
	const args = ['-i', input];
	const br   = o.audioBitrate ?? defaults[fmt];
	switch (fmt) {
		case 'mp3':  args.push('-c:a', 'libmp3lame', '-b:a', `${br}k`); break;
		case 'aac':  args.push('-c:a', 'aac', '-b:a', `${br}k`, '-movflags', '+faststart'); break;
		case 'ogg':  args.push('-c:a', 'libvorbis', '-b:a', `${br}k`); break;
		case 'opus': args.push('-c:a', 'libopus', '-b:a', `${br}k`, '-vbr', 'on', '-compression_level', '10'); break;
		case 'flac': args.push('-c:a', 'flac', '-compression_level', '8'); break;
		case 'wav':  args.push('-c:a', 'pcm_s16le'); break;
	}
	if (o.audioSampleRate) args.push('-ar', String(o.audioSampleRate));
	if (o.stripMetadata)   args.push('-map_metadata', '-1');
	args.push('-vn', '-y', output);
	return args;
}

const defaults: Record<AudioFormat, number> = { mp3: 192, aac: 160, ogg: 128, opus: 96, flac: 0, wav: 0 };
