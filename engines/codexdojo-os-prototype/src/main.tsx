import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createServices } from './app/createServices'
import { shouldEnableReactInstrumentation } from './devInstrumentation'
import { requireRootElement } from './root'
import './styles.css'

if (shouldEnableReactInstrumentation(import.meta.env)) {
  void import('react-grab')
  void import('react-scan')
}

const services = createServices()

createRoot(requireRootElement(document)).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
)
