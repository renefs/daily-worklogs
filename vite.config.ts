import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

function preloadPlugin(): Plugin {
  const compilePreload = () => {
    buildSync({
      entryPoints: ['electron/preload.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['electron'],
      outfile: 'dist-electron/preload.cjs',
    });
  };

  return {
    name: 'preload-compiler',
    buildStart() {
      compilePreload();
    },
    configureServer(server) {
      server.watcher.add('electron/preload.ts');
      server.watcher.on('change', (file) => {
        if (file.includes('electron/preload.ts')) {
          compilePreload();
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    preloadPlugin(),
    electron([
      {
        // Main-Process entry file of the Electron App.
        entry: 'electron/main.ts',
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
