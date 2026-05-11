# Compressly

A fast, private, browser-based file compression tool for images, PDFs, and video.

**Draft 1 Alpha**

## Features

- 🖼️ **Image compression** — JPEG, PNG, WebP, AVIF with quality control or target file size
- 📄 **PDF optimization** — Re-encode embedded pages to reduce size
- 🎬 **Video encoding** — WebCodecs (hardware-accelerated) with MediaRecorder fallback
- 🎯 **Target file size** — Binary search to hit exact KB/MB targets
- 🔒 **100% private** — No uploads, no servers, everything runs in your browser
- ⚡ **Hardware acceleration** — OffscreenCanvas, WebCodecs, GPU encoding where supported

## Tech Stack

- SvelteKit + TypeScript
- Vite
- Canvas API / OffscreenCanvas
- WebCodecs API
- MediaRecorder API
- PDF.js (CDN)
- `@sveltejs/adapter-static` for Cloudflare Pages

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
```

### Deploy to Cloudflare Pages

1. Push to GitHub
2. Connect repo in Cloudflare Pages dashboard
3. Set build command: `npm run build`
4. Set output directory: `build`
5. Node version: 18+

Or use Wrangler CLI:
```bash
npx wrangler pages deploy build --project-name compressly
```

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---|---|---|---|---|
| Image compression | ✅ | ✅ | ✅ | ✅ |
| PDF compression | ✅ | ✅ | ✅ | ✅ |
| Video (WebCodecs) | ✅ 94+ | ✅ 16.4+ | ❌ | ✅ 94+ |
| Video (MediaRecorder) | ✅ | ✅ | ✅ | ✅ |
| AVIF output | ✅ 94+ | ✅ 16+ | ❌ | ✅ 94+ |
| OffscreenCanvas | ✅ | ✅ | ✅ | ✅ |

## Roadmap (v1)

- [ ] mp4box.js integration for proper MP4 muxing
- [ ] Web Worker for PDF processing
- [ ] ZIP bundled batch downloads
- [ ] Drag-to-reorder file list
- [ ] Preview before/after comparison
- [ ] GIF optimization
