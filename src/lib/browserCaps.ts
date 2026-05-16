/**
 * Browser capability detection — run once on mount.
 * Used by UI components to show/hide features and warnings.
 */
export interface BrowserCaps {
	browser: string;
	hasOffscreenCanvas: boolean;
	hasWebCodecs: boolean;
	hasSharedArrayBuffer: boolean;
	hasAvifEncode: boolean;
	hasWebpEncode: boolean;
	videoEngines: string[];
	warnings: string[];
}

export async function detectCaps(): Promise<BrowserCaps> {
	const ua = navigator.userAgent;
	const isEdge    = ua.includes('Edg/');
	const isChrome  = ua.includes('Chrome/') && !isEdge;
	const isSafari  = ua.includes('Safari/') && !ua.includes('Chrome/');
	const isFirefox = ua.includes('Firefox/');

	const browser = isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : isEdge ? 'Edge' : 'Unknown';

	const hasOffscreenCanvas  = typeof OffscreenCanvas !== 'undefined';
	const hasWebCodecs        = typeof VideoEncoder !== 'undefined';
	const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

	// Test AVIF encode support
	let hasAvifEncode = false;
	try {
		const c = new OffscreenCanvas(1, 1);
		const b = await c.convertToBlob({ type: 'image/avif' });
		hasAvifEncode = b.size > 0 && b.type === 'image/avif';
	} catch { hasAvifEncode = false; }

	// Test WebP encode support (should be universal now)
	let hasWebpEncode = false;
	try {
		const c = new OffscreenCanvas(1, 1);
		const b = await c.convertToBlob({ type: 'image/webp' });
		hasWebpEncode = b.size > 0;
	} catch {
		// Fallback canvas test
		const c = document.createElement('canvas');
		c.width = 1; c.height = 1;
		hasWebpEncode = c.toDataURL('image/webp').startsWith('data:image/webp');
	}

	// Video engines
	const videoEngines: string[] = [];
	videoEngines.push('FFmpeg.wasm' + (hasSharedArrayBuffer ? ' (MT)' : ' (ST)'));
	if (hasWebCodecs) {
		try {
			const hw = await VideoEncoder.isConfigSupported({
				codec: 'avc1.640028', width: 1280, height: 720,
				bitrate: 2_000_000, framerate: 30,
				hardwareAcceleration: 'prefer-hardware'
			});
			videoEngines.push('WebCodecs' + (hw.supported ? ' (GPU)' : ' (SW)'));
		} catch {
			videoEngines.push('WebCodecs');
		}
	}
	videoEngines.push('MediaRecorder');

	// Warnings
	const warnings: string[] = [];
	if (isFirefox && !hasAvifEncode) warnings.push('Firefox doesn\'t support AVIF encoding — AVIF requests will use WebP instead.');
	if (!hasSharedArrayBuffer)        warnings.push('Multi-threaded FFmpeg unavailable — ensure the site is served with COOP/COEP headers.');
	if (!hasWebCodecs)                warnings.push('WebCodecs API not available — video will use MediaRecorder.');

	return { browser, hasOffscreenCanvas, hasWebCodecs, hasSharedArrayBuffer, hasAvifEncode, hasWebpEncode, videoEngines, warnings };
}
