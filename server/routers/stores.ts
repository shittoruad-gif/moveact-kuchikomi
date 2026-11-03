import { eq } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { stores } from '../db/schema'

export const storesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return db.select().from(stores).where(eq(stores.tenantId, ctx.tenant.id))
  }),
})
