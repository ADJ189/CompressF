// src/routes/+layout.ts
// Disable server-side rendering to prevent build crashes on Cloudflare
export const ssr = false;

// Prerender only the shell for the SPA fallback
export const prerender = true;
