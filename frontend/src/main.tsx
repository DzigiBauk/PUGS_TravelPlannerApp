import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { environment } from './config/environment'
import { createAppServices } from './services/appServices'
import { ServicesProvider } from './services/ServicesProvider'
import { createAppStore } from './store'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

const services = createAppServices(environment)
const store = createAppStore(services)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ServicesProvider>
  </StrictMode>,
)
