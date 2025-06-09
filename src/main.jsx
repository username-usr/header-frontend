import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import App from './App.jsx'
// import './Clone.css'
// import ExampleComponent from './Clone.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* <ExampleComponent /> */}
  </StrictMode>,
)
