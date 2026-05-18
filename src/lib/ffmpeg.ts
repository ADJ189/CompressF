/**
 * FFmpeg singleton — loads once, reuses across all compression operations.
 * Prevents the ~30MB WASM re-download on every file in the same session.
 */

type FFmpegInstance = {
	writeFile: (name: string, data: Uint8Array) => Promise<void>;
	readFile:  (name: string) => Promise<Uint8Array>;
	deleteFile:(name: string) => Promise<void>;
	exec:      (args: string[]) => Promise<void>;
	on:        (event: string, cb: (data: any) => void) => void;
	terminate: () => void;
};

let _ffmpeg:   FFmpegInstance | null = null;
let _loading:  Promise<FFmpegInstance> | null = null;
let _busy      = false;

const BASE_MT = 'https://esm.sh/@ffmpeg/core-mt@0.12.6/dist/esm';
const BASE_ST = 'https://esm.sh/@ffmpeg/core@0.12.6/dist/esm';

export async function getFFmpeg(
	onProgress?: (pct: number) => void
): Promise<FFmpegInstance> {
	// Already loaded — return immediately
	if (_ffmpeg) return _ffmpeg;

	// Being loaded by another caller — wait for it
	if (_loading) return _loading;

	_loading = (async () => {
		const { FFmpeg }   = await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10');
		const { toBlobURL } = await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/util@0.12.2');

		const ff  = new FFmpeg();
		const hasMT = typeof SharedArrayBuffer !== 'undefined';
		const base  = hasMT ? BASE_MT : BASE_ST;

		await ff.load({
			coreURL:  await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
			wasmURL:  await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
			...(hasMT ? { workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript') } : {})
		});

		_ffmpeg  = ff;
		_loading = null;
		return ff;
	})();

	return _loading;
}

/** fetchFile helper — loads a File into Uint8Array */
export async function ffetchFile(file: File): Promise<Uint8Array> {
	const { fetchFile } = await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/util@0.12.2');
	return fetchFile(file);
}

/** Reset singleton (e.g. after a crash) */
export function resetFFmpeg() {
	try { _ffmpeg?.terminate(); } catch {}
	_ffmpeg  = null;
	_loading = null;
}
