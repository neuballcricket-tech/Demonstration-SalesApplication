import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from 'react-aria-components'
import './styles/app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider locale="en-GB">
      <App />
    </I18nProvider>
  </StrictMode>,
)
