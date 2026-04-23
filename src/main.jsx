import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initProtection } from "./protection";  
import { ProductPricesProvider } from './contexts/ProductPricesContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

initProtection();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ProductPricesProvider>
        <App />
      </ProductPricesProvider>
    </ThemeProvider>
  </StrictMode>,
)
