import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import Pattrn from './Pattrn.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Pattrn />
    <Analytics />
  </StrictMode>,
)
