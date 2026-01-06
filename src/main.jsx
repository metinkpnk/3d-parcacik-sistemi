// React kütüphanesini içe aktar
import React from 'react'
// React DOM client API'sini içe aktar (React 18+ için)
import ReactDOM from 'react-dom/client'
// Ana uygulama bileşenini içe aktar
import App from './App'
// Global CSS stillerini içe aktar
import './index.css'

// React uygulamasını DOM'a mount et
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode: Geliştirme modunda ek kontroller ve uyarılar sağlar
  <React.StrictMode>
    {/* Ana uygulama bileşenini render et */}
    <App />
  </React.StrictMode>,
)


