import type { CompressOptions, CompressResult } from './types';
import { getFFmpeg, ffetchFile, resetFFmpeg } from './ffmpeg';

export function getVideoCapabilities() {
	if (typeof navigator === 'undefined') return { hasWebCodecs: false, hasSharedBuffer: false, browser: 'Unknown', videoEngines: [] };
	const ua = navigator.userAgent;
	const isEdge = ua.includes('Edg/'), isChrome = ua.includes('Chrome/') && !isEdge;
	const isSafari = ua.includes('Safari/') && !ua.includes('Chrome/');
	const isFirefox = ua.includes('Firefox/');
	const hasWebCodecs = typeof VideoEncoder !== 'undefined';
	const hasSharedBuffer = typeof SharedArrayBuffer !== 'undefined';
	const engines: string[] = [`FFmpeg.wasm${hasSharedBuffer ? ' MT' : ' ST'}`];
	if (hasWebCodecs) engines.push('WebCodecs (GPU)');
	engines.push('MediaRecorder');
	return {
		hasWebCodecs, hasSharedBuffer,
		browser: isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown',
		videoEngines: engines
	};
}

function getBrowser() {
	if (typeof navigator === 'undefined') return { isChrome: false, isSafari: false, isFirefox: false, isEdge: false };
	const ua = navigator.userAgent;
	const isEdge = ua.includes('Edg/');
	return {
		isChrome:  ua.includes('Chrome/') && !isEdge,
		isSafari:  ua.includes('Safari/') && !ua.includes('Chrome/'),
		isFirefox: ua.includes('Firefox/'),
		isEdge
	};
}

export async function compressVideo(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	// 1. FFmpeg.wasm (best quality, all codecs)
	try {
		return await compressWithFFmpeg(file, options, onProgress);
	} catch (e) {
		console.warn('[Compressly] FFmpeg video failed:', e);
		resetFFmpeg();
	}
	// 2. WebCodecs (GPU hardware path)
	if (typeof VideoEncoder !== 'undefined') {
		try { return await compressWithWebCodecs(file, options, onProgress); }
		catch (e) { console.warn('[Compressly] WebCodecs failed:', e); }
	}
	// 3. MediaRecorder fallback
	return compressWithMediaRecorder(file, options, onProgress);
}

async function compressWithFFmpeg(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);
	const ff = await getFFmpeg();
	ff.on('progress', ({ progress }: { progress: number }) => onProgress?.(3 + Math.round(progress * 90)));
	onProgress?.(3);

	const inputExt  = file.name.match(/\.[^.]+$/)?.[0] ?? '.mp4';
	const inputName = `vin${inputExt}`;
	const outName   = 'vout.mp4';

	await ff.writeFile(inputName, await ffetchFile(file));
	await ff.exec(buildArgs(inputName, outName, options));
	const data = await ff.readFile(outName) as Uint8Array;
	await ff.deleteFile(inputName).catch(() => {});
	await ff.deleteFile(outName).catch(() => {});

	const blob = new Blob([data.buffer], { type: 'video/mp4' });
	onProgress?.(100);

	const meta = await getVideoMeta(file);
	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `video/mp4 · FFmpeg.wasm${typeof SharedArrayBuffer !== 'undefined' ? ' MT' : ''}`,
		width: meta.width, height: meta.height, duration: meta.duration
	};
}

function buildArgs(input: string, output: string, o: CompressOptions): string[] {
	const args = ['-i', input];
	const codec = o.videoCodec ?? 'h264';
	if      (codec === 'vp9')  args.push('-c:v', 'libvpx-vp9');
	else if (codec === 'vp8')  args.push('-c:v', 'libvpx');
	else if (codec === 'h265') args.push('-c:v', 'libx265');
	else if (codec === 'av1')  args.push('-c:v', 'libaom-av1');
	else                       args.push('-c:v', 'libx264');

	if (o.targetSizeKB && o.targetSizeKB > 0) {
		const br = Math.round((o.targetSizeKB * 8) / 60);
		args.push('-b:v', `${br}k`, '-bufsize', `${br * 2}k`, '-maxrate', `${br * 1.5}k`);
	} else {
		const crf = Math.round(18 + (1 - (o.quality ?? 0.75)) * 17);
		if (codec === 'vp9' || codec === 'av1') args.push('-crf', String(crf), '-b:v', '0');
		else args.push('-crf', String(crf));
	}

	const preset = o.videoPreset ?? 'fast';
	if (codec === 'h264' || codec === 'h265') args.push('-preset', preset);
	else if (codec === 'vp9') args.push('-speed', preset === 'slow' ? '1' : preset === 'fast' ? '3' : '2');

	if (o.maxWidth) args.push('-vf', `scale='min(${o.maxWidth},iw)':-2:flags=lanczos`);
	if (o.fps)      args.push('-r', String(o.fps));
	if (codec === 'h264' || codec === 'h265') args.push('-pix_fmt', 'yuv420p');

	if (codec === 'vp9' || codec === 'vp8') args.push('-c:a', 'libopus', '-b:a', '96k');
	else args.push('-c:a', 'aac', '-b:a', '128k');

	if (codec === 'h264') args.push('-movflags', '+faststart');
	args.push('-y', output);
	return args;
}

async function compressWithWebCodecs(
	file: File, options: CompressOptions, onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const meta = await getVideoMeta(file);
	const { width, height, duration } = meta;
	const { isSafari, isChrome, isEdge } = getBrowser();
	const targetBitrate = options.targetSizeKB
		? Math.round((options.targetSizeKB * 1024 * 8) / Math.max(duration, 1))
		: (options.videoBitrate ?? 2_000_000);
	const codec = (isSafari || isChrome || isEdge) ? 'avc1.640028' : 'vp8';

	let hwAccel: HardwareAcceleration = 'prefer-software';
	try {
		const s = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: targetBitrate, framerate: 30, hardwareAcceleration: 'prefer-hardware' });
		if (s.supported) hwAccel = 'prefer-hardware';
	} catch {}

	const chunks: EncodedVideoChunk[] = [];
	const encoder = new VideoEncoder({ output: c => chunks.push(c), error: e => { throw e; } });
	encoder.configure({ codec, width, height, bitrate: targetBitrate, framerate: 30, hardwareAcceleration: hwAccel, latencyMode: 'quality' });

	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), { src: url, muted: true, playsInline: true });
	await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = () => rej(new Error('Video load failed')); });

	const fps = options.fps || 30;
	const canvas = document.createElement('canvas');
	canvas.width = width; canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	for (let i = 0; i < Math.ceil(duration * fps); i++) {
		const t = i / fps;
		if (t >= duration) break;
		await new Promise<void>(res => { video.onseeked = () => res(); video.currentTime = t; });
		ctx.drawImage(video, 0, 0, width, height);
		const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1_000_000) });
		encoder.encode(frame, { keyFrame: i % 60 === 0 });
		frame.close();
		onProgress?.(5 + Math.round((i / Math.ceil(duration * fps)) * 88));
	}

	await encoder.flush(); encoder.close();
	URL.revokeObjectURL(url);

	const total = chunks.reduce((a, c) => a + c.byteLength, 0);
	const buf = new Uint8Array(total); let pos = 0;
	for (const c of chunks) { const tmp = new Uint8Array(c.byteLength); c.copyTo(tmp); buf.set(tmp, pos); pos += c.byteLength; }

	const blob = new Blob([buf], { type: 'video/mp4' });
	onProgress?.(100);
	return { blob, originalSize: file.size, compressedSize: blob.size, compressionRatio: file.size / blob.size, format: `video/mp4 · WebCodecs (${hwAccel === 'prefer-hardware' ? 'GPU' : 'SW'})`, width, height, duration };
}

async function compressWithMediaRecorder(
	file: File, options: CompressOptions, onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const meta = await getVideoMeta(file);
	const { width, height, duration } = meta;
	const { isFirefox, isSafari } = getBrowser();
	const bitrate = options.targetSizeKB ? Math.round((options.targetSizeKB * 1024 * 8) / Math.max(duration, 1)) : (options.videoBitrate ?? 1_500_000);
	const types = isSafari ? ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'] : isFirefox ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
	const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), { src: url, muted: true, playsInline: true });
	await new Promise<void>(res => { video.onloadedmetadata = () => res(); });
	const cw = options.maxWidth ? Math.min(width, options.maxWidth) : width;
	const ch = options.maxWidth ? Math.round(height * (cw / width)) : height;
	const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
	const ctx = canvas.getContext('2d')!;
	const stream = canvas.captureStream(options.fps || 30);
	const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
	const chunks: BlobPart[] = [];
	recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
	recorder.start(250); video.play();
	await new Promise<void>(resolve => {
		video.ontimeupdate = () => { ctx.drawImage(video, 0, 0, cw, ch); onProgress?.(5 + Math.round((video.currentTime / Math.max(duration, 1)) * 90)); };
		video.onended = () => resolve();
		setTimeout(() => resolve(), (duration + 5) * 1000);
	});
	recorder.stop(); video.pause(); URL.revokeObjectURL(url);
	await new Promise<void>(res => { recorder.onstop = () => res(); });
	const blob = new Blob(chunks, { type: mimeType });
	onProgress?.(100);
	return { blob, originalSize: file.size, compressedSize: blob.size, compressionRatio: file.size / blob.size, format: `${mimeType} · MediaRecorder`, width: cw, height: ch, duration };
}

function getVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const v = document.createElement('video'); v.src = url;
		v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ width: v.videoWidth || 1280, height: v.videoHeight || 720, duration: v.duration || 30 }); };
		v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read video metadata')); };
	});
}
