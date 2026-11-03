import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { router, createContext } from './trpc'
import { storesRouter } from './routers/stores'
import { menusRouter } from './routers/menus'
import { reviewRouter } from './routers/review'
import { historyRouter } from './routers/history'
import { tenantRouter } from './routers/tenant'
import { resolveTenant } from './tenant'
import { initMonthlyReportScheduler } from './monthlyReport'
import { migrate } from './db/migrate'

const appRouter = router({
  stores: storesRouter,
  menus: menusRouter,
  review: reviewRouter,
  history: historyRouter,
  tenant: tenantRouter,
})

export type AppRouter = typeof appRouter

const app = express()
// Traefik リバースプロキシ配下で X-Forwarded-For から実クライアントIPを得る
app.set('trust proxy', 1)
app.use(cors())
app.use(
  '/trpc',
  createExpressMiddleware({ router: appRouter, createContext })
)

// In production, serve the Vite-built frontend
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath = path.join(__dirname, '..', 'dist')
  // index.html はお店ごとに店名を差し込んで返す（LINEやSNSで共有したときの表示のため）
  const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8')
  const escapeHtml = (v: string) =>
    v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
  const sendIndex: express.RequestHandler = async (req, res, next) => {
    try {
      const { config } = await resolveTenant(req.hostname)
      // og:image は絶対URLが要る。画像が無いお店はタグごと外す
      const ogImage = config.ogImage
        ? new URL(config.ogImage, `${req.protocol}://${req.get('host')}`).href
        : ''
      let html = indexHtml
      if (!ogImage) html = html.replace(/\s*<meta property="og:image"[^>]*>/, '')
      res.type('html').send(
        html
          .replaceAll('__OG_IMAGE__', escapeHtml(ogImage))
          .replaceAll('__BRAND_NAME__', escapeHtml(config.brandName))
          .replaceAll('__INDUSTRY__', escapeHtml(config.industry))
          .replaceAll('__SERVICE__', escapeHtml(config.words.service)),
      )
    } catch (e) {
      next(e)
    }
  }
  app.get('/', sendIndex)
  app.use(express.static(distPath, { index: false }))
  app.get('{*path}', sendIndex)
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
// 起動のたびにDBの形をそろえる（足すだけ・何度流しても同じ）。
// 済んでいれば何もしない。失敗したら起動しない（古い形のDBで動かすと店舗の区別が崩れるため）
await migrate(process.env.DATABASE_URL!)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
  // 月次レポートの自動送信（毎月1日 9:00 JST に公式LINEへ）
  initMonthlyReportScheduler()
})
