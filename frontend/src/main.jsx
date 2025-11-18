import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Configurar axios
// En desarrollo, usar el proxy de Vite (sin baseURL)
// En producción, usar la URL del API desde variables de entorno
if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL
}

// Configurar credenciales para CORS
axios.defaults.withCredentials = false // No necesario con proxy, pero útil para producción

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

