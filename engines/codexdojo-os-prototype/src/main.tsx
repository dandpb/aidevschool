import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createServices } from './app/createServices'
import { requireRootElement } from './root'
import './styles.css'

if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_REACT_DEVTOOLS !== '1') {
  void import('react-grab')
  void import('react-scan')
}

const services = createServices()

createRoot(requireRootElement(document)).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
