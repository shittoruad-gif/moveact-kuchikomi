import { eq } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { menus } from '../db/schema'

export const menusRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return db.select().from(menus).where(eq(menus.tenantId, ctx.tenant.id))
  }),
})
