import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { menus } from '../db/schema'

export const menusRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(menus)
  }),
})
