import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    plugins: [vue()],
    base: './',
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: true,
        sourcemap: false,
        minify: 'esbuild',
        esbuildOptions: {
            drop: ['console', 'debugger']
        },
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                guide: resolve(__dirname, 'guide.html')
            },
            output: {
                manualChunks: {
                    vendor: ['vue', 'vue-i18n']
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js'
            }
        }
    },
    publicDir: 'public'
});
