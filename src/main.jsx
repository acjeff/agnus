import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Pattrn from './Pattrn.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Pattrn />
  </StrictMode>,
)
