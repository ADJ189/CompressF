<div align="center">
  <img src="static/favicon.svg" width="60" alt="Compressly logo" />
  <h1>Compressly</h1>
  <p><strong>Fast, private, browser-native file compression.</strong><br/>Images · Video · PDF · Audio · GIF · SVG — all processed locally. Nothing ever leaves your device.</p>

  <p>
    <a href="https://compressly.pages.dev">Live App</a> ·
    <a href="https://github.com/ADJ189/CompressF/wiki">Wiki</a> ·
    <a href="https://github.com/ADJ189/CompressF/issues">Issues</a>
  </p>

  ![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
  ![Built with SvelteKit](https://img.shields.io/badge/built%20with-SvelteKit-ff6b35.svg)
  ![Deployed on Cloudflare Pages](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-f38020.svg)
</div>

---

## What it does

Compressly compresses files entirely inside your browser — no server, no upload, no account. It uses the same APIs that power professional browser-based tools: WebAssembly, Canvas, WebCodecs, and OffscreenCanvas.

| Format | Engine | What it does |
|--------|--------|-------------|
| **Images** (JPEG, PNG, WebP, AVIF, BMP, TIFF, HEIC) | Canvas API + OffscreenCanvas | Quality control or exact target-size via binary search |
| **Video** (MP4, WebM, MOV, MKV, AVI, FLV, 3GP) | FFmpeg.wasm → WebCodecs → MediaRecorder | H.264, H.265, VP9, VP8, AV1 encoding with CRF/bitrate/target-size |
| **PDF** | PDF.js + custom PDF assembler | Re-renders pages as compressed images, reassembles valid PDF |
| **Audio** (MP3, AAC, OGG, Opus, FLAC, WAV, M4A, AIFF) | FFmpeg.wasm | Transcode between any format; also extracts audio from video |
| **GIF** | FFmpeg.wasm (two-pass palettegen) | Optimise with palette reduction or convert to WebM (70–95% smaller) |
| **SVG** | Pure TypeScript | Strips metadata, collapses whitespace, rounds coordinates |

---

## Privacy

There is no server. Compressly is a static site — HTML, CSS, and JavaScript served from Cloudflare's CDN. File processing uses browser-native APIs:

- `createImageBitmap()` — OS GPU image decoder
- `OffscreenCanvas` — GPU compositor thread rendering
- `FFmpeg.wasm` — ffmpeg compiled to WebAssembly, runs in your browser tab
- `WebCodecs` — platform video encoder (Intel QSV / AMD VCE / NVIDIA NVENC via OS abstraction)
- `MediaRecorder` — browser-native video capture

**No file data is ever sent anywhere.** Closing the tab destroys everything.

---

## Hardware acceleration

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| GPU image decode (`createImageBitmap`) | ✅ | ✅ | ✅ | ✅ |
| OffscreenCanvas rendering | ✅ | ✅ 16.4+ | ✅ | ✅ |
| AVIF encode | ✅ 94+ | ✅ 16+ | ❌ → WebP | ✅ 94+ |
| WebCodecs GPU encode | ✅ 94+ | ✅ 16.4+ | ❌ | ✅ 94+ |
| FFmpeg.wasm multi-thread | ✅ | ✅ 16.4+ | ✅ | ✅ |
| FFmpeg.wasm single-thread | ✅ | ✅ | ✅ | ✅ |

Video encoding uses a three-tier fallback: FFmpeg.wasm (CDN, SIMD-optimised x264/VP9) → WebCodecs (hardware GPU) → MediaRecorder (universal).

---

## Getting started

```bash
git clone https://github.com/ADJ189/CompressF
cd CompressF
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Build & deploy

```bash
npm run build        # outputs to /build
```

**Cloudflare Pages settings:**

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `build` |
| Node version | `22` |
| Deploy command | `echo done` |

The `_headers` file sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` — required for `SharedArrayBuffer`, which enables multi-threaded FFmpeg.wasm.

---

## Project structure

```
src/
├── lib/
│   ├── compressImage.ts   # Canvas + OffscreenCanvas + binary search
│   ├── compressVideo.ts   # FFmpeg.wasm → WebCodecs → MediaRecorder
│   ├── compressPdf.ts     # PDF.js + custom PDF assembler
│   ├── compressAudio.ts   # FFmpeg.wasm — MP3/AAC/OGG/Opus/FLAC/WAV
│   ├── compressGif.ts     # FFmpeg.wasm — palettegen + paletteuse
│   ├── optimizeSvg.ts     # Pure TS — metadata strip, coord rounding
│   ├── ffmpeg.ts          # FFmpeg singleton (loads once, reuses)
│   ├── browserCaps.ts     # Runtime browser capability detection
│   ├── types.ts           # Shared types + utilities
│   └── components/
│       ├── DropZone.svelte
│       └── FileCard.svelte
└── routes/
    ├── +page.svelte              # Homepage
    ├── compress/
    │   ├── +page.svelte          # Hub — all formats, quick compress
    │   ├── images/+page.svelte   # Image compressor
    │   ├── video/+page.svelte    # Video encoder (full codec control)
    │   ├── pdf/+page.svelte      # PDF compressor
    │   ├── audio/+page.svelte    # Audio converter
    │   └── gif/+page.svelte      # GIF optimiser
    ├── about/+page.svelte
    └── docs/+page.svelte
```

---

## Tech stack

- **[SvelteKit](https://kit.svelte.dev)** — framework and routing
- **[TypeScript](https://www.typescriptlang.org)** — type safety throughout
- **[Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)** — UI typography
- **[FFmpeg.wasm](https://ffmpegwasm.netlify.app)** — loaded from [esm.sh](https://esm.sh) CDN at runtime
- **[PDF.js](https://mozilla.github.io/pdf.js)** — loaded from cdnjs CDN at runtime
- **[@sveltejs/adapter-static](https://github.com/sveltejs/kit/tree/main/packages/adapter-static)** — static export
- **[Cloudflare Pages](https://pages.cloudflare.com)** — hosting and CDN

---

## Contributing

PRs welcome. Open an issue first for large changes.

```bash
# Fork, then:
git clone https://github.com/YOUR_USERNAME/CompressF
cd CompressF
npm install
npm run dev

# Check types
npm run check
```

**Roadmap:**
- [ ] mp4box.js muxer for proper MP4 output from WebCodecs
- [ ] Web Worker offloading for PDF rendering
- [ ] ZIP batch download
- [ ] Before/after preview slider
- [ ] Drag-to-reorder file queue
- [ ] PWA / offline support

---

## License

MIT — see [LICENSE](LICENSE).
