import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import Songs from './pages/Songs'
import Calendar from './pages/Calendar'
import Poll from './pages/Poll'
import Expenses from './pages/Expenses'
import Spec from './pages/Spec'
import { startAutoUpdate } from './lib/autoUpdate'

startAutoUpdate()

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } } })
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={basename}>
        <AuthGate>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Songs />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="poll" element={<Poll />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="spec" element={<Spec />} />
              <Route path="*" element={<Songs />} />
            </Route>
          </Routes>
        </AuthGate>
      </BrowserRouter>
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  </React.StrictMode>,
)
