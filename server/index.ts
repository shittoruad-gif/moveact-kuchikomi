import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { router } from './trpc'
import { storesRouter } from './routers/stores'
import { menusRouter } from './routers/menus'
import { reviewRouter } from './routers/review'
import { historyRouter } from './routers/history'

const appRouter = router({
  stores: storesRouter,
  menus: menusRouter,
  review: reviewRouter,
  history: historyRouter,
})

export type AppRouter = typeof appRouter

const app = express()
app.use(cors())
app.use(
  '/trpc',
  createExpressMiddleware({ router: appRouter })
)

// In production, serve the Vite-built frontend
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
