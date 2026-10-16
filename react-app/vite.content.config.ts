import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Content script: um único arquivo IIFE, sem chunks compartilhados.
 * Scripts declarados no manifest não aceitam `import`, então ele não pode
 * dividir código com o background/opções — aqui cada um leva sua cópia.
 * Roda depois do build principal (não limpa dist/).
 */
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    // Modo biblioteca não substitui process.env; o React precisa disso
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.tsx'),
      formats: ['iife'],
      name: 'FocusMusicPlayer',
      fileName: () => 'assets/content.js',
      cssFileName: 'content',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
