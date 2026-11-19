import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ToastProvider } from './components/Toast'
import './index.css'

// 새 버전이 배포되면 다음 실행 때 자동으로 바뀐다 (데이터는 IndexedDB에 있어서 안전)
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
