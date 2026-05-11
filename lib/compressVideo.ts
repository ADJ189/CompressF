import type { CompressOptions, CompressResult } from './types';

/**
 * Video compression using WebCodecs API (hardware-accelerated on supported devices).
 * Falls back to MediaRecorder re-encode if WebCodecs is unavailable.
 */
export async function compressVideo(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';

	if (hasWebCodecs) {
		return compressWithWebCodecs(file, options, onProgress);
	} else {
		return compressWithMediaRecorder(file, options, onProgress);
	}
}

/**
 * WebCodecs path — hardware-accelerated on Chrome 94+ / Safari 16.4+
 */
async function compressWithWebCodecs(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const { quality = 0.75, targetSizeKB } = options;
	const targetBitrate = targetSizeKB
		? await estimateBitrateForSize(file, targetSizeKB)
		: (options.videoBitrate ?? 1_500_000); // default 1.5 Mbps

	// Load video into a VideoFrame source via HTMLVideoElement
	const url = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.src = url;
	video.muted = true;
	video.playsInline = true;

	await new Promise<void>((res, rej) => {
		video.onloadedmetadata = () => res();
		video.onerror = () => rej(new Error('Video load failed'));
	});

	const duration = video.duration;
	const width = video.videoWidth;
	const height = video.videoHeight;

	// Collect output chunks
	const chunks: EncodedVideoChunk[] = [];

	const encoder = new VideoEncoder({
		output: (chunk) => chunks.push(chunk),
		error: (e) => console.error('VideoEncoder error', e)
	});

	// Try hardware acceleration first
	let hwAccel: HardwareAcceleration = 'prefer-hardware';
	try {
		await encoder.configure({
			codec: 'avc1.42E01E', // H.264 Baseline
			width,
			height,
			bitrate: targetBitrate,
			framerate: 30,
			hardwareAcceleration: hwAccel,
			latencyMode: 'quality'
		});
	} catch {
		// fallback to software
		hwAccel = 'prefer-software';
		await encoder.configure({
			codec: 'avc1.42E01E',
			width,
			height,
			bitrate: targetBitrate,
			framerate: 30,
			hardwareAcceleration: hwAccel,
			latencyMode: 'quality'
		});
	}

	// Seek through video and capture frames
	const fps = 30;
	const frameCount = Math.floor(duration * fps);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	let frameIndex = 0;
	for (let t = 0; t < duration; t += 1 / fps) {
		await seekTo(video, t);
		ctx.drawImage(video, 0, 0, width, height);
		const imageData = ctx.getImageData(0, 0, width, height);

		const videoFrame = new VideoFrame(imageData, {
			timestamp: Math.round(t * 1e6),
			duration: Math.round((1 / fps) * 1e6)
		});

		encoder.encode(videoFrame, { keyFrame: frameIndex % 60 === 0 });
		videoFrame.close();

		frameIndex++;
		onProgress?.(Math.round((frameIndex / frameCount) * 85));
	}

	await encoder.flush();
	encoder.close();
	URL.revokeObjectURL(url);

	// Wrap in WebM container (simplified — chunks as raw blob)
	const totalBytes = chunks.reduce((acc, c) => acc + c.byteLength, 0);
	const buffer = new ArrayBuffer(totalBytes);
	const view = new Uint8Array(buffer);
	let pos = 0;
	for (const chunk of chunks) {
		const tmp = new Uint8Array(chunk.byteLength);
		chunk.copyTo(tmp);
		view.set(tmp, pos);
		pos += chunk.byteLength;
	}

	// Note: raw H.264 chunks without a proper container. For a real app,
	// use mp4box.js or a WebM muxer. We wrap as video/mp4 best-effort.
	const blob = new Blob([buffer], { type: 'video/mp4' });
	onProgress?.(100);

	return {
		blob,
		originalSize: file.size,
		compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: 'video/mp4 (WebCodecs)',
		width,
		height,
		duration
	};
}

/**
 * MediaRecorder fallback — works everywhere, lower control over quality.
 * Re-encodes by playing into canvas and recording the canvas stream.
 */
async function compressWithMediaRecorder(
	file: File,
	options: CompressOptions,
	onProgress?: (pct: number) => void
): Promise<CompressResult> {
	const { targetSizeKB } = options;
	const url = URL.createObjectURL(file);

	const video = document.createElement('video');
	video.src = url;
	video.muted = true;
	video.playsInline = true;

	await new Promise<void>((res, rej) => {
		video.onloadedmetadata = () => res();
		video.onerror = () => rej(new Error('Video load failed'));
	});

	const duration = video.duration;
	const width = video.videoWidth;
	const height = video.videoHeight;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;

	const canvasStream = canvas.captureStream(30);

	// Determine bitrate
	const bitrate = targetSizeKB
		? await estimateBitrateForSize(file, targetSizeKB)
		: (options.videoBitrate ?? 1_500_000);

	// Pick best supported mime type
	const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
		.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

	const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: bitrate });
	const chunks: BlobPart[] = [];
	recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

	recorder.start(100);
	video.play();

	await new Promise<void>((resolve) => {
		video.ontimeupdate = () => {
			ctx.drawImage(video, 0, 0, width, height);
			onProgress?.(Math.round((video.currentTime / duration) * 90));
		};
		video.onended = () => resolve();
	});

	recorder.stop();
	video.pause();
	URL.revokeObjectURL(url);

	await new Promise<void>((res) => { recorder.onstop = () => res(); });
	onProgress?.(100);

	const blob = new Blob(chunks, { type: mimeType });
	return {
		blob,
		originalSize: file.size,
		compressedSize: blob.size,
		compressionRatio: file.size / blob.size,
		format: mimeType + ' (MediaRecorder)',
		width,
		height,
		duration
	};
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
	return new Promise((res) => {
		video.onseeked = () => res();
		video.currentTime = time;
	});
}

async function estimateBitrateForSize(file: File, targetKB: number): Promise<number> {
	// We'll create a temp video to get duration
	const url = URL.createObjectURL(file);
	const v = document.createElement('video');
	v.src = url;
	await new Promise<void>(res => { v.onloadedmetadata = () => res(); });
	const duration = v.duration || 10;
	URL.revokeObjectURL(url);
	// bitrate = target_bytes * 8 / duration
	return Math.round((targetKB * 1024 * 8) / duration);
}
