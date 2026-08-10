import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// LAN=1 npm run dev — para probar desde el celular en la misma red (p. ej.
// la cámara del gafete). getUserMedia solo funciona en "contexto seguro":
// localhost vale como HTTP plano, pero una IP de LAN necesita HTTPS sí o sí,
// de ahí el certificado autofirmado (el navegador del celular pedirá
// aceptarlo una vez). Fuera de ese caso, el dev server normal no cambia.
const lan = process.env.LAN === '1'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(lan ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: lan ? true : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
