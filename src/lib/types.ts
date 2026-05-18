export type FileType = 'image' | 'pdf' | 'video' | 'audio' | 'gif' | 'svg' | 'unknown';
export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
export type AudioFormat = 'mp3' | 'aac' | 'ogg' | 'opus' | 'flac' | 'wav';
export type VideoCodec  = 'h264' | 'h265' | 'vp9' | 'vp8' | 'av1';
export type PdfCompressionLevel = 'low' | 'recommended' | 'extreme';

export interface CompressOptions {
	// Image
	quality?:              number;
	targetSizeKB?:         number;
	format?:               ImageFormat;
	maxWidth?:             number;
	maxHeight?:            number;
	stripMetadata?:        boolean;
	// Video
	videoBitrate?:         number;
	videoCodec?:           VideoCodec;
	videoPreset?:          'ultrafast' | 'fast' | 'medium' | 'slow';
	fps?:                  number;
	// Audio
	audioFormat?:          AudioFormat;
	audioBitrate?:         number;
	audioSampleRate?:      number;
	// PDF
	pdfCompressionLevel?:  PdfCompressionLevel;
	pdfRenderScale?:       number;
	pdfImageFormat?:       'image/jpeg' | 'image/png';
	// GIF
	gifToVideo?:           boolean;
}

export interface CompressResult {
	blob:             Blob;
	originalSize:     number;
	compressedSize:   number;
	compressionRatio: number;
	format:           string;
	width?:           number;
	height?:          number;
	duration?:        number;
}

export interface FileEntry {
	id:       string;
	file:     File;
	type:     FileType;
	status:   'idle' | 'compressing' | 'done' | 'error';
	progress: number;
	result?:  CompressResult;
	error?:   string;
	options:  CompressOptions;
}

export interface BrowserCaps {
	browser:             string;
	hasOffscreenCanvas:  boolean;
	hasWebCodecs:        boolean;
	hasSharedArrayBuffer: boolean;
	hasAvifEncode:       boolean;
	hasWebpEncode:       boolean;
	videoEngines:        string[];
	warnings:            string[];
}

export function detectFileType(file: File): FileType {
	const mime = file.type.toLowerCase();
	const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (mime === 'image/gif' || ext === 'gif') return 'gif';
	if (mime === 'image/svg+xml' || ext === 'svg') return 'svg';
	if (mime.startsWith('image/') || ['jpg','jpeg','png','webp','avif','bmp','tiff','tif','heic','heif','ico'].includes(ext)) return 'image';
	if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
	if (mime.startsWith('video/') || ['mp4','webm','mov','avi','mkv','m4v','flv','wmv','ogv','3gp'].includes(ext)) return 'video';
	if (mime.startsWith('audio/') || ['mp3','aac','ogg','opus','flac','wav','m4a','wma','aiff','aif'].includes(ext)) return 'audio';
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
