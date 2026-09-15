import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The game lives at the root of a GitHub Pages user site
// (beapromanager.github.io), so the build base is the root too. It used to
// be a project site under /BE-A-PRO/; if it ever moves back under a path,
// this is the one line to change, everything else resolves through asset().
export default defineConfig(() => ({
  base: '/',
  plugins: [react()],
  // host:true exposes on the LAN; allowedHosts lets a tunnel domain
  // (cloudflared, ngrok) reach the dev server so it can be played on a phone
  server: { port: 5180, host: true, allowedHosts: true },
}));
