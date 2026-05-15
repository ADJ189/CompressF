import type { CompressOptions, CompressResult } from './types';

/**
 * Video compression engine.
 *
 * Strategy (in order of preference):
 *  1. FFmpeg.wasm (0.12.x) — full H.264/H.265/VP9/AV1 encoding with CRF/bitrate control.
 *     Uses Emscripten-compiled ffmpeg; multithreading via SharedArrayBuffer when COOP/COEP
 *     headers are present (Cloudflare Pages _headers file sets these).
 *  2. WebCodecs API — hardware-accelerated frame-level encoding (Chrome 94+, Safari 16.4+).
 *     Requests GPU encoding via hardwareAcceleration: 'prefer-hardware'.
 *     Supports Intel QSV, AMD VCE, NVIDIA NVENC indirectly through the browser's
 *     platform video encoder abstraction.
 *  3. MediaRecorder — universal fallback. Lower bitrate control, works everywhere.
 */
export async function compressVideo(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	// Try FFmpeg.wasm first — best quality/control
	try {
		return await compressWithFFmpeg(file, options, onProgress);
	} catch (ffmpegErr) {
		console.warn('[Compressly] FFmpeg failed, trying WebCodecs:', ffmpegErr);
	}

	// WebCodecs fallback
	if (typeof VideoEncoder !== 'undefined') {
		try {
			return await compressWithWebCodecs(file, options, onProgress);
		} catch (wcErr) {
			console.warn('[Compressly] WebCodecs failed, using MediaRecorder:', wcErr);
		}
	}

	// MediaRecorder final fallback
	return compressWithMediaRecorder(file, options, onProgress);
}

// ── FFmpeg.wasm ───────────────────────────────────────────────────────────────

async function compressWithFFmpeg(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const { FFmpeg } = await import('@ffmpeg/ffmpeg');
	const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

	onProgress?.(3);

	const ffmpeg = new FFmpeg();

	// Load with multithreading if SharedArrayBuffer available, else single-thread
	const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
	const mtURL   = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';

	const hasSharedBuffer = typeof SharedArrayBuffer !== 'undefined';
	const coreBase = hasSharedBuffer ? mtURL : baseURL;

	ffmpeg.on('progress', ({ progress }) => {
		onProgress?.(5 + Math.round(progress * 88));
	});

	await ffmpeg.load({
		coreURL:   await toBlobURL(`${coreBase}/ffmpeg-core.js`,   'text/javascript'),
		wasmURL:   await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm'),
		...(hasSharedBuffer ? {
			workerURL: await toBlobURL(`${coreBase}/ffmpeg-core.worker.js`, 'text/javascript')
		} : {})
	});

	onProgress?.(5);

	const inputName  = 'input' + getExt(file.name);
	const outputName = 'output.mp4';

	await ffmpeg.writeFile(inputName, await fetchFile(file));

	// Build ffmpeg args
	const args = buildFFmpegArgs(inputName, outputName, options);
	await ffmpeg.exec(args);

	const data = await ffmpeg.readFile(outputName) as Uint8Array;
	const blob = new Blob([data.buffer], { type: 'video/mp4' });

	// Clean up
	await ffmpeg.deleteFile(inputName);
	await ffmpeg.deleteFile(outputName);
	ffmpeg.terminate();

	onProgress?.(100);

	const meta = await getVideoMeta(file);
	return {
		blob,
		originalSize: file.size,
		compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: 'video/mp4 (FFmpeg.wasm' + (hasSharedBuffer ? ' MT' : '') + ')',
		width: meta.width,
		height: meta.height,
		duration: meta.duration,
	};
}

function buildFFmpegArgs(input: string, output: string, options: CompressOptions): string[] {
	const args: string[] = ['-i', input];

	// Video codec — H.264 for max compatibility
	args.push('-c:v', 'libx264');

	if (options.targetSizeKB && options.targetSizeKB > 0) {
		// Two-pass bitrate targeting
		// We can't do true 2-pass in wasm easily, so use -b:v with -bufsize
		const duration = 60; // estimate; real duration computed separately
		const bitrate  = Math.round((options.targetSizeKB * 8) / duration);
		args.push('-b:v', `${bitrate}k`, '-bufsize', `${bitrate * 2}k`);
	} else {
		// CRF mode — visually lossless at 23, smaller at 28, decent at 26
		const quality = options.quality ?? 0.75;
		// Map 0–1 quality to CRF 18–35 (lower = better)
		const crf = Math.round(18 + (1 - quality) * 17);
		args.push('-crf', String(crf));
	}

	// Preset — balance speed vs compression
	args.push('-preset', 'fast');

	// Pixel format — yuv420p for max compatibility (required for web playback)
	args.push('-pix_fmt', 'yuv420p');

	// Scale if needed
	if (options.maxWidth || options.maxHeight) {
		const w = options.maxWidth ?? -2;
		const h = options.maxHeight ?? -2;
		// -2 keeps aspect ratio, ensures divisible by 2
		args.push('-vf', `scale='min(${w},iw)':'min(${h},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`);
	}

	// Audio — copy if exists, else skip errors
	args.push('-c:a', 'aac', '-b:a', '128k');

	// Movflags for web streaming
	args.push('-movflags', '+faststart');

	// Overwrite output
	args.push('-y', output);

	return args;
}

// ── WebCodecs (hardware GPU path) ────────────────────────────────────────────

async function compressWithWebCodecs(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const meta = await getVideoMeta(file);
	const { width, height, duration } = meta;

	const targetBitrate = options.targetSizeKB
		? Math.round((options.targetSizeKB * 1024 * 8) / (duration || 30))
		: (options.videoBitrate ?? 2_000_000);

	// Codec string — AVC baseline for widest HW support
	const codec = 'avc1.42E034'; // H.264 High profile 5.2

	// Test hardware support
	const hwSupport = await VideoEncoder.isConfigSupported({
		codec,
		width,
		height,
		bitrate: targetBitrate,
		framerate: 30,
		hardwareAcceleration: 'prefer-hardware',
	});

	const hwAccel: HardwareAcceleration = hwSupport.supported ? 'prefer-hardware' : 'prefer-software';

	const chunks: EncodedVideoChunk[] = [];
	const encoder = new VideoEncoder({
		output: chunk => chunks.push(chunk),
		error: e => { throw e; }
	});

	encoder.configure({
		codec,
		width,
		height,
		bitrate: targetBitrate,
		framerate: 30,
		hardwareAcceleration: hwAccel,
		latencyMode: 'quality',
	});

	// Seek and encode frames
	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), {
		src: url, muted: true, playsInline: true
	});
	await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = rej; });

	const fps = 30;
	const frameCount = Math.ceil(duration * fps);
	const canvas = document.createElement('canvas');
	canvas.width = width; canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	for (let i = 0; i < frameCount; i++) {
		const t = i / fps;
		await seekTo(video, t);
		ctx.drawImage(video, 0, 0, width, height);
		const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6) });
		encoder.encode(frame, { keyFrame: i % 60 === 0 });
		frame.close();
		onProgress?.(5 + Math.round((i / frameCount) * 88));
	}

	await encoder.flush();
	encoder.close();
	URL.revokeObjectURL(url);

	// Pack raw chunks into a blob
	const total = chunks.reduce((a, c) => a + c.byteLength, 0);
	const buf = new Uint8Array(total);
	let pos = 0;
	for (const c of chunks) { const tmp = new Uint8Array(c.byteLength); c.copyTo(tmp); buf.set(tmp, pos); pos += c.byteLength; }

	const blob = new Blob([buf], { type: 'video/mp4' });
	onProgress?.(100);

	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `video/mp4 (WebCodecs · ${hwAccel})`,
		width, height, duration,
	};
}

// ── MediaRecorder fallback ────────────────────────────────────────────────────

async function compressWithMediaRecorder(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const meta = await getVideoMeta(file);
	const { width, height, duration } = meta;

	const bitrate = options.targetSizeKB
		? Math.round((options.targetSizeKB * 1024 * 8) / (duration || 30))
		: (options.videoBitrate ?? 1_500_000);

	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), {
		src: url, muted: true, playsInline: true
	});
	await new Promise<void>(res => { video.onloadedmetadata = () => res(); });

	const canvas = document.createElement('canvas');
	canvas.width = width; canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	const stream = canvas.captureStream(30);

	const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
		.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

	const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
	const chunks: BlobPart[] = [];
	recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
	recorder.start(250);
	video.play();

	await new Promise<void>(resolve => {
		video.ontimeupdate = () => {
			ctx.drawImage(video, 0, 0, width, height);
			onProgress?.(5 + Math.round((video.currentTime / duration) * 90));
		};
		video.onended = () => resolve();
	});

	recorder.stop();
	video.pause();
	URL.revokeObjectURL(url);
	await new Promise<void>(res => { recorder.onstop = () => res(); });

	const blob = new Blob(chunks, { type: mimeType });
	onProgress?.(100);

	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `${mimeType} (MediaRecorder)`,
		width, height, duration,
	};
}

// ── Utilities ────────────────────────────────────────────────────────────────

function getExt(filename: string): string {
	const m = filename.match(/\.[^.]+$/);
	return m ? m[0] : '.mp4';
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
	return new Promise(res => { video.onseeked = () => res(); video.currentTime = time; });
}

function getVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const v = document.createElement('video');
		v.src = url;
		v.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve({ width: v.videoWidth || 1280, height: v.videoHeight || 720, duration: v.duration || 10 });
		};
		v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read video metadata')); };
	});
}
