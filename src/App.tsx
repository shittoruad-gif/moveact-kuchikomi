import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { trpc, trpcClient } from './lib/trpc'
import { Home } from './pages/Home'

function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Home />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </trpc.Provider>
  )
}

export default App
