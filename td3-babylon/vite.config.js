import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: resolve(projectRoot, '../docs/td3-babylon'),
    emptyOutDir: true
  },
  server: { port: 5173 }
});
