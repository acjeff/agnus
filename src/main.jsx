import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Pattrn from './Pattrn.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Pattrn />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
