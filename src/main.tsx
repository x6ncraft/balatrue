import '@fontsource/silkscreen/400.css'
import '@fontsource/silkscreen/700.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('Missing #app root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
