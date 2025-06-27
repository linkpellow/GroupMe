import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Force WASM-only mode for Rollup to avoid native binary issues
process.env.ROLLUP_NO_NATIVE = 'true';
process.env.ROLLUP_WASM = 'true';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    cors: true,
    hmr: false, // Disable HMR completely to avoid babel issues
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
            // Only log errors that aren't connection refused
            if (err.code !== 'ECONNREFUSED') {
              console.log('vite proxy error:', err);
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Optional: comment out for less noisy logs
            // console.log(`[VITE PROXY] Forwarding: ${req.method} ${req.url}`);
          });
        },
      },
    },
  },
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['debug'], // Exclude debug from optimization
    include: ['react', 'react-dom', '@shared/config/queryConfig'],
    force: true, // Force re-optimization to fix chunk issues
  },
  resolve: {
    dedupe: ['react', 'react-dom'], // Avoid duplicate React instances
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
});
