<div align="center">
  <img src="static/favicon.svg" width="56" alt="Compressly logo" />

  <h1>Compressly</h1>

  <p><strong>Fast, private, browser-native file compression.</strong><br/>
  Images · Video · PDF · Audio · GIF · SVG — processed entirely in your browser.<br/>
  Nothing ever leaves your device.</p>

  <p>
    <a href="https://compressly-9jk.pages.dev/">🌐 Live App</a> ·
    <a href="https://github.com/ADJ189/CompressF/wiki">📖 Wiki</a> ·
    <a href="https://github.com/ADJ189/CompressF/issues">🐛 Issues</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0" />
    <img src="https://img.shields.io/badge/built%20with-SvelteKit-ff6b35.svg" alt="SvelteKit" />
    <img src="https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-f38020.svg" alt="Cloudflare Pages" />
    <img src="https://img.shields.io/badge/privacy-100%25%20local-2f9e44.svg" alt="Privacy" />
  </p>
</div>

---

## What it does

Compressly compresses files entirely inside your browser — no server, no upload, no account required. It uses the same APIs that power professional browser-based tools: WebAssembly, Canvas, WebCodecs, OffscreenCanvas, and pdf-lib.

| Format | Engine | Capabilities |
|--------|--------|-------------|
| **Images** — JPEG, PNG, WebP, AVIF, BMP, TIFF, HEIC | Canvas API + OffscreenCanvas | Quality control or exact target-size via binary search (14 iterations) |
| **Video** — MP4, WebM, MOV, MKV, AVI, FLV, 3GP | FFmpeg.wasm → WebCodecs → MediaRecorder | H.264, H.265, VP9, VP8, AV1 · CRF / bitrate / target-size modes |
| **PDF** | pdfjs-dist + pdf-lib | Re-renders pages as compressed JPEG · Low / Recommended / Extreme presets |
| **Audio** — MP3, AAC, OGG, Opus, FLAC, WAV, M4A, AIFF | FFmpeg.wasm | Transcode between any format · also extracts audio from video files |
| **GIF** | FFmpeg.wasm (two-pass palettegen) | Palette optimisation or convert to WebM (70–95% smaller) |
| **SVG** | Pure TypeScript | Strips metadata, editor namespaces, rounds coordinates, collapses whitespace |

---

## Try it

**[https://compressly-9jk.pages.dev/](https://compressly-9jk.pages.dev/)**

No sign-up. No install. Works on any modern browser and any device.

---

## Privacy

There is no server. Compressly is a fully static site served from Cloudflare's CDN. Every byte of your file stays in your browser tab.

- `createImageBitmap()` — OS GPU image decoder (never leaves RAM)
- `OffscreenCanvas` — GPU compositor thread rendering
- `FFmpeg.wasm` — ffmpeg compiled to WebAssembly, runs inside your tab
- `WebCodecs` — platform video encoder (Intel QSV / AMD VCE / NVIDIA NVENC via OS)
- `pdfjs-dist` + `pdf-lib` — PDF parsing and generation, fully in-browser

Closing the tab destroys all file data immediately.

---

## Hardware acceleration

| Feature | Chrome | Safari | Firefox | Edge |
|---------|:------:|:------:|:-------:|:----:|
| GPU image decode | ✅ | ✅ | ✅ | ✅ |
| OffscreenCanvas rendering | ✅ | ✅ 16.4+ | ✅ | ✅ |
| AVIF encode | ✅ 94+ | ✅ 16+ | ❌ → WebP | ✅ 94+ |
| WebCodecs GPU encode | ✅ 94+ | ✅ 16.4+ | ❌ | ✅ 94+ |
| FFmpeg.wasm multi-thread | ✅ | ✅ 16.4+ | ✅ | ✅ |
| FFmpeg.wasm single-thread | ✅ | ✅ | ✅ | ✅ |

Video encoding uses a three-tier auto-selected fallback chain:
**FFmpeg.wasm (SIMD-optimised x264/VP9)** → **WebCodecs (hardware GPU)** → **MediaRecorder (universal)**

---

## Run locally

```bash
git clone https://github.com/ADJ189/CompressF
cd CompressF
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Build & deploy

```bash
npm run build   # outputs to /build
```

**Cloudflare Pages settings:**

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `build` |
| Node version | `22` |
| Deploy command | `echo done` |

The `static/_headers` file sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` — required for `SharedArrayBuffer`, which enables multi-threaded FFmpeg.wasm.

---

## Project structure

```
src/
├── lib/
│   ├── compressImage.ts     Canvas + OffscreenCanvas + binary search
│   ├── compressVideo.ts     FFmpeg.wasm → WebCodecs → MediaRecorder
│   ├── compressPdf.ts       pdfjs-dist render + pdf-lib assembly
│   ├── compressAudio.ts     FFmpeg.wasm — MP3/AAC/OGG/Opus/FLAC/WAV
│   ├── compressGif.ts       FFmpeg.wasm — palettegen + paletteuse
│   ├── optimizeSvg.ts       Pure TS — metadata strip, coord rounding
│   ├── ffmpeg.ts            FFmpeg singleton (loads once, reuses)
│   ├── browserCaps.ts       Runtime browser capability detection
│   ├── types.ts             Shared types + utilities
│   └── components/
│       ├── DropZone.svelte
│       └── FileCard.svelte
└── routes/
    ├── +page.svelte              Homepage
    ├── compress/
    │   ├── +page.svelte          Hub — all formats, quick compress
    │   ├── images/+page.svelte   Image compressor
    │   ├── video/+page.svelte    Video encoder (full codec control)
    │   ├── pdf/+page.svelte      PDF compressor
    │   ├── audio/+page.svelte    Audio converter
    │   └── gif/+page.svelte      GIF optimiser
    ├── about/+page.svelte
    └── docs/+page.svelte
```

---

## Tech stack

| Tool | Purpose |
|------|---------|
| [SvelteKit](https://kit.svelte.dev) | Framework and routing |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | UI typography |
| [FFmpeg.wasm](https://ffmpegwasm.netlify.app) | Video/audio/GIF encoding via WebAssembly |
| [pdfjs-dist](https://mozilla.github.io/pdf.js) | PDF parsing and page rendering |
| [pdf-lib](https://pdf-lib.js.org) | PDF document creation and assembly |
| [@sveltejs/adapter-static](https://github.com/sveltejs/kit/tree/main/packages/adapter-static) | Static site export |
| [Cloudflare Pages](https://pages.cloudflare.com) | Hosting and CDN |

---

## Contributing

PRs welcome. Please open an issue first for large changes.

```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/CompressF
cd CompressF
npm install
npm run dev

# Type check
npm run check
```

**Roadmap:**
- [ ] mp4box.js muxer for proper MP4 container output from WebCodecs
- [ ] Web Worker offloading for PDF rendering (large PDFs)
- [ ] ZIP batch download
- [ ] Before/after preview slider
- [ ] PWA / offline support
- [ ] Drag-to-reorder file queue

---

## License

Licensed under the **Apache License 2.0** — see [LICENSE](LICENSE) for details.

Copyright © 2025 ADJ189
