export type FileType = 'image' | 'pdf' | 'video' | 'unknown';
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export interface CompressOptions {
	// Image & general
	quality?: number;          // 0–1
	targetSizeKB?: number;
	format?: ImageFormat;
	maxWidth?: number;
	maxHeight?: number;
	stripMetadata?: boolean;
	// Video-specific
	videoBitrate?: number;     // bps
	videoCodec?: 'h264' | 'vp9' | 'av1';
	videoPreset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
	fps?: number;
	// PDF-specific
	pdfRenderScale?: number;   // 1.0–3.0 (higher = sharper pages)
	pdfImageFormat?: 'image/jpeg' | 'image/png';
}

export interface CompressResult {
	blob: Blob;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	format: string;
	width?: number;
	height?: number;
	duration?: number;
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
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (['jpg','jpeg','png','webp','avif','gif','bmp','tiff','heic'].includes(ext)) return 'image';
	if (ext === 'pdf') return 'pdf';
	if (['mp4','webm','mov','avi','mkv','m4v','flv','wmv'].includes(ext)) return 'video';
	return 'unknown';
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
}

export function uid(): string {
	return Math.random().toString(36).slice(2, 10);
}
