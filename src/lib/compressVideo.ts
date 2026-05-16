import type { CompressOptions, CompressResult } from './types';

/**
 * Video compression engine — three-tier fallback:
 *  1. FFmpeg.wasm  — loaded from CDN at runtime, no npm dep
 *  2. WebCodecs    — hardware-accelerated (Chrome 94+, Safari 16.4+)
 *  3. MediaRecorder — universal fallback
 *
 * Browser-specific optimisations:
 *  - Chrome/Edge: WebCodecs with prefer-hardware (Intel QSV, AMD VCE, NVIDIA NVENC)
 *  - Safari:      VideoToolbox via WebCodecs on Apple Silicon
 *  - Firefox:     MediaRecorder with VP8/VP9
 *  - All:         FFmpeg.wasm with SIMD (SSE4.1/NEON/AVX2 equivalent)
 */

// ── Browser detection ─────────────────────────────────────────────────────────

function getBrowserInfo() {
	if (typeof navigator === 'undefined') return { isChrome: false, isSafari: false, isFirefox: false, isEdge: false };
	const ua = navigator.userAgent;
	const isEdge    = ua.includes('Edg/');
	const isChrome  = ua.includes('Chrome/') && !isEdge;
	const isSafari  = ua.includes('Safari/') && !ua.includes('Chrome/');
	const isFirefox = ua.includes('Firefox/');
	return { isChrome, isSafari, isFirefox, isEdge };
}

export function getVideoCapabilities() {
	const { isChrome, isSafari, isFirefox, isEdge } = getBrowserInfo();
	const hasWebCodecs   = typeof VideoEncoder !== 'undefined';
	const hasSharedBuffer = typeof SharedArrayBuffer !== 'undefined';
	return {
		hasWebCodecs,
		hasSharedBuffer,
		hasMTFFmpeg: hasSharedBuffer,
		preferredEngine: hasWebCodecs ? 'WebCodecs' : 'MediaRecorder',
		browser: isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown'
	};
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function compressVideo(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	// Try FFmpeg.wasm (CDN) first — best quality/control
	try {
		return await compressWithFFmpegCDN(file, options, onProgress);
	} catch (e) {
		console.warn('[Compressly] FFmpeg CDN failed:', e);
	}

	// WebCodecs (hardware GPU path)
	if (typeof VideoEncoder !== 'undefined') {
		try {
			return await compressWithWebCodecs(file, options, onProgress);
		} catch (e) {
			console.warn('[Compressly] WebCodecs failed:', e);
		}
	}

	// Universal fallback
	return compressWithMediaRecorder(file, options, onProgress);
}

// ── FFmpeg via CDN (no npm import) ───────────────────────────────────────────

async function compressWithFFmpegCDN(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	onProgress?.(2);

	// Load @ffmpeg/ffmpeg from esm.sh CDN — works in any module context
	const { FFmpeg }     = await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10');
	const { fetchFile, toBlobURL } = await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/util@0.12.2');

	onProgress?.(4);

	const ffmpeg = new FFmpeg();
	ffmpeg.on('progress', ({ progress }: { progress: number }) => {
		onProgress?.(5 + Math.round(progress * 87));
	});

	const hasMT = typeof SharedArrayBuffer !== 'undefined';
	const base  = hasMT
		? 'https://esm.sh/@ffmpeg/core-mt@0.12.6/dist/esm'
		: 'https://esm.sh/@ffmpeg/core@0.12.6/dist/esm';

	await ffmpeg.load({
		coreURL:   await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
		wasmURL:   await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
		...(hasMT ? { workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript') } : {})
	});

	onProgress?.(6);

	const inputExt  = file.name.match(/\.[^.]+$/)?.[0] ?? '.mp4';
	const inputName = `input${inputExt}`;
	const outName   = 'output.mp4';

	await ffmpeg.writeFile(inputName, await fetchFile(file));
	await ffmpeg.exec(buildArgs(inputName, outName, options, file));

	const data = await ffmpeg.readFile(outName) as Uint8Array;
	await ffmpeg.deleteFile(inputName).catch(() => {});
	await ffmpeg.deleteFile(outName).catch(() => {});
	ffmpeg.terminate();

	const blob = new Blob([data.buffer], { type: 'video/mp4' });
	onProgress?.(100);

	const meta = await getVideoMeta(file);
	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `video/mp4 · FFmpeg.wasm${hasMT ? ' MT' : ' ST'}`,
		width: meta.width, height: meta.height, duration: meta.duration
	};
}

function buildArgs(input: string, output: string, options: CompressOptions, file: File): string[] {
	const args: string[] = ['-i', input];
	const { isFirefox } = getBrowserInfo();

	// Codec selection
	const codec = options.videoCodec ?? 'h264';
	if (codec === 'vp9')       args.push('-c:v', 'libvpx-vp9');
	else if (codec === 'av1')  args.push('-c:v', 'libaom-av1');
	else                       args.push('-c:v', 'libx264');

	// Quality / bitrate
	if (options.targetSizeKB && options.targetSizeKB > 0) {
		// Estimate bitrate from size and duration (60s default if unknown)
		const br = Math.round((options.targetSizeKB * 8) / 60);
		args.push('-b:v', `${br}k`, '-bufsize', `${br * 2}k`, '-maxrate', `${br * 1.5}k`);
	} else {
		const q   = options.quality ?? 0.75;
		const crf = Math.round(18 + (1 - q) * 17); // 18–35
		if (codec === 'vp9')      args.push('-crf', String(crf), '-b:v', '0');
		else if (codec === 'av1') args.push('-crf', String(crf), '-b:v', '0');
		else                      args.push('-crf', String(crf));
	}

	// Preset
	const preset = options.videoPreset ?? 'fast';
	if (codec === 'h264') args.push('-preset', preset);
	else if (codec === 'vp9') args.push('-speed', preset === 'slow' ? '1' : preset === 'fast' ? '3' : '2');

	// Scale if needed
	if (options.maxWidth) {
		const w = options.maxWidth;
		args.push('-vf', `scale='min(${w},iw)':-2:flags=lanczos`);
	}

	// FPS
	if (options.fps && options.fps > 0) args.push('-r', String(options.fps));

	// Pixel format (required for web playback compatibility)
	if (codec === 'h264') args.push('-pix_fmt', 'yuv420p');

	// Audio — AAC for h264/av1, opus for vp9
	if (codec === 'vp9') args.push('-c:a', 'libopus', '-b:a', '96k');
	else                  args.push('-c:a', 'aac', '-b:a', '128k');

	// Web-optimised MP4
	if (codec === 'h264') args.push('-movflags', '+faststart');

	args.push('-y', output);
	return args;
}

// ── WebCodecs (GPU hardware path) ────────────────────────────────────────────

async function compressWithWebCodecs(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const meta = await getVideoMeta(file);
	const { width, height, duration } = meta;
	const { isSafari, isChrome, isEdge } = getBrowserInfo();

	const targetBitrate = options.targetSizeKB
		? Math.round((options.targetSizeKB * 1024 * 8) / Math.max(duration, 1))
		: (options.videoBitrate ?? 2_000_000);

	// Browser-optimised codec strings
	// Chrome/Edge: H.264 High via D3D11VA (Windows), VAAPI (Linux)
	// Safari:      H.264 via VideoToolbox — best on Apple Silicon
	const codec = (isSafari || isChrome || isEdge)
		? 'avc1.640028'  // H.264 High Profile Level 4.0
		: 'vp8';

	// Check hardware support
	let hwAccel: HardwareAcceleration = 'prefer-software';
	try {
		const support = await VideoEncoder.isConfigSupported({
			codec, width, height, bitrate: targetBitrate, framerate: 30,
			hardwareAcceleration: 'prefer-hardware'
		});
		if (support.supported) hwAccel = 'prefer-hardware';
	} catch {}

	const chunks: EncodedVideoChunk[] = [];
	const encoder = new VideoEncoder({
		output: chunk => chunks.push(chunk),
		error: e => { throw new Error(`VideoEncoder: ${e.message}`); }
	});

	encoder.configure({
		codec, width, height, bitrate: targetBitrate, framerate: 30,
		hardwareAcceleration: hwAccel, latencyMode: 'quality'
	});

	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), { src: url, muted: true, playsInline: true });
	await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = () => rej(new Error('Video load failed')); });

	const fps = options.fps || 30;
	const frameCount = Math.ceil(duration * fps);
	const canvas = document.createElement('canvas');
	canvas.width = width; canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	for (let i = 0; i < frameCount; i++) {
		const t = i / fps;
		if (t >= duration) break;
		await seekTo(video, t);
		ctx.drawImage(video, 0, 0, width, height);
		const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1_000_000) });
		encoder.encode(frame, { keyFrame: i % 60 === 0 });
		frame.close();
		onProgress?.(5 + Math.round((i / frameCount) * 88));
	}

	await encoder.flush();
	encoder.close();
	URL.revokeObjectURL(url);

	// Pack chunks
	const total = chunks.reduce((a, c) => a + c.byteLength, 0);
	const buf = new Uint8Array(total);
	let pos = 0;
	for (const c of chunks) {
		const tmp = new Uint8Array(c.byteLength);
		c.copyTo(tmp); buf.set(tmp, pos); pos += c.byteLength;
	}

	const blob = new Blob([buf], { type: 'video/mp4' });
	onProgress?.(100);

	return {
		blob, originalSize: file.size, compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: `video/mp4 · WebCodecs (${hwAccel === 'prefer-hardware' ? 'GPU' : 'SW'})`,
		width, height, duration
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
	const { isFirefox, isSafari } = getBrowserInfo();

	const bitrate = options.targetSizeKB
		? Math.round((options.targetSizeKB * 1024 * 8) / Math.max(duration, 1))
		: (options.videoBitrate ?? 1_500_000);

	// Browser-specific mime type preferences
	const mimeTypes = isSafari
		? ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
		: isFirefox
		? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
		: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

	const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

	const url = URL.createObjectURL(file);
	const video = Object.assign(document.createElement('video'), { src: url, muted: true, playsInline: true });
	await new Promise<void>(res => { video.onloadedmetadata = () => res(); });

	const canvas = document.createElement('canvas');
	canvas.width = options.maxWidth ? Math.min(width, options.maxWidth) : width;
	canvas.height = options.maxWidth ? Math.round(height * (canvas.width / width)) : height;
	const ctx = canvas.getContext('2d')!;

	const stream = canvas.captureStream(options.fps || 30);
	const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
	const chunks: BlobPart[] = [];
	recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
	recorder.start(250);
	video.play();

	await new Promise<void>(resolve => {
		video.ontimeupdate = () => {
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			onProgress?.(5 + Math.round((video.currentTime / Math.max(duration, 1)) * 90));
		};
		video.onended = () => resolve();
		// Timeout safety
		setTimeout(() => resolve(), (duration + 5) * 1000);
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
		format: `${mimeType} · MediaRecorder`,
		width: canvas.width, height: canvas.height, duration
	};
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
	return new Promise(res => { video.onseeked = () => res(); video.currentTime = time; });
}

function getVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const v   = document.createElement('video');
		v.src     = url;
		v.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve({ width: v.videoWidth || 1280, height: v.videoHeight || 720, duration: v.duration || 30 });
		};
		v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot read video metadata')); };
	});
}
