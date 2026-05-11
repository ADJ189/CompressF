export type FileType = 'image' | 'pdf' | 'video' | 'unknown';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export interface CompressOptions {
	quality?: number;         // 0–1 for images/video
	targetSizeKB?: number;    // target file size in KB
	format?: ImageFormat;     // output format for images
	maxWidth?: number;        // max dimension
	maxHeight?: number;
	videoBitrate?: number;    // bps for video
	stripMetadata?: boolean;  // PDF/image metadata stripping
}

export interface CompressResult {
	blob: Blob;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	format: string;
	width?: number;
	height?: number;
	duration?: number; // seconds, for video
}

export interface FileEntry {
	id: string;
	file: File;
	type: FileType;
	status: 'idle' | 'compressing' | 'done' | 'error';
	progress: number;
	result?: CompressResult;
	error?: string;
	options: CompressOptions;
}

export function detectFileType(file: File): FileType {
	if (file.type.startsWith('image/')) return 'image';
	if (file.type === 'application/pdf') return 'pdf';
	if (file.type.startsWith('video/')) return 'video';
	// fallback by extension
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (['jpg','jpeg','png','webp','avif','gif'].includes(ext ?? '')) return 'image';
	if (ext === 'pdf') return 'pdf';
	if (['mp4','webm','mov','avi','mkv'].includes(ext ?? '')) return 'video';
	return 'unknown';
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const dm = Math.max(0, decimals);
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function uid(): string {
	return Math.random().toString(36).slice(2, 10);
}
