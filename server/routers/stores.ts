import { eq } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { stores } from '../db/schema'

export const storesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(stores).where(eq(stores.tenantId, ctx.tenant.id))
    // デモ版では、お店の Google の投稿先を画面に渡さない（デモのまま本番として使われないように）
    return ctx.tenant.config.demo ? rows.map((r) => ({ ...r, googleMapsUrl: '' })) : rows
  }),
})
