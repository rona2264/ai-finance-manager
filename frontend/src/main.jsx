import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>⚠️ Error Crítico de Configuración</h2>
      <p>Falta la variable de entorno <b>VITE_CLERK_PUBLISHABLE_KEY</b> en Vercel, o no se ha reconstruido la app.</p>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>,
  )
}
