import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const r = (p: string) => path.resolve(__dirname, p)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app':     r('src/app'),
      '@ui':      r('src/modules/ui'),
      '@scenes':  r('src/modules/scenes'),
      '@api':     r('src/modules/api'),
      '@domain':  r('src/domain'),
      '@state':   r('src/state'),
      '@styles':  r('src/styles'),
    },
    // ✅ opcional: permite importar sin poner extensión
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  // ✅ opcional: solo variables VITE_ pasan al cliente
  envPrefix: 'VITE_',
  server: {
    port: 5173,
    strictPort: true,
    // open: true, // opcional: abre el navegador al arrancar
  },
  preview: { port: 4173, strictPort: true },
  // ✅ opcional: ajustes de build
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
