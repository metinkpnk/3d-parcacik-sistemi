// Vite yapılandırma fonksiyonunu içe aktar
import { defineConfig } from 'vite'
// React plugin'ini içe aktar (JSX desteği için)
import react from '@vitejs/plugin-react'
// HTTPS için basic SSL plugin
import basicSsl from '@vitejs/plugin-basic-ssl'

// Vite yapılandırmasını dışa aktar
export default defineConfig({
  plugins: [
    react(), // React plugin'ini etkinleştir (JSX, Fast Refresh vb.)
    basicSsl() // HTTPS desteği
  ],
  server: {
    host: true, // Tüm network interface'lerinde dinle
    port: 5173, // Port numarası
    https: true, // HTTPS etkinleştir
  },
})


